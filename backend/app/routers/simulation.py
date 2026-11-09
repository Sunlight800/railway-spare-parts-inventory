"""
Simulation Studio Router: Interactive Monte Carlo What-If Scenarios and Comparison
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import datetime

from app.database import get_db
from app.models.entities import SparePart, PartClassification, InventoryMetric, SimulationRun, MaintenanceWorkPackage
from app.schemas.api_schemas import SimulationRequest
from app.services.simulation_engine import PREBUILT_SCENARIOS, run_inventory_simulation
from app.services.block_planning_engine import evaluate_work_package_readiness

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

@router.get("/prebuilt-scenarios")
def get_prebuilt_scenarios():
    """Returns available preconfigured railway supply chain scenarios."""
    return PREBUILT_SCENARIOS

@router.post("/run")
def execute_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    """Runs dynamic Monte Carlo simulation across selected parts or entire inventory."""
    query = db.query(SparePart).join(PartClassification).join(InventoryMetric)
    
    # Filter target
    flt = (payload.target_filter or "ALL").strip().upper()
    if flt != "ALL":
        if flt in ["A", "B", "C"]:
            query = query.filter(PartClassification.abc_class == flt)
        elif flt in ["S", "D", "E"]:
            query = query.filter(PartClassification.sde_class == flt)
        elif flt in ["V", "E", "D"]:
            query = query.filter(PartClassification.ved_class == flt)
        elif len(flt) == 3:
            query = query.filter(PartClassification.music3d_code == flt)
        else:
            # Check if category match
            query = query.filter(SparePart.category.ilike(f"%{flt}%"))

    parts = query.all()
    if not parts:
        raise HTTPException(status_code=400, detail=f"No spare parts found matching filter criteria '{flt}'.")

    parts_data = []
    for p in parts:
        cls = p.classification
        met = p.metrics
        parts_data.append({
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "annual_usage_units": p.annual_usage_units,
            "lead_time_days": p.lead_time_days,
            "current_stock_units": p.current_stock_units,
            "music3d_code": cls.music3d_code if cls else "UNKNOWN",
            "ved_class": cls.ved_class if cls else "E",
            "service_level": cls.service_level if cls else 95.0,
            "z_score": cls.z_score if cls else 1.64
        })

    params = payload.model_dump()
    sim_result = run_inventory_simulation(parts_data, params, simulation_runs=payload.simulation_runs)

    # Assess maintenance work packages impact under simulation
    # Build a simulated stock map
    sim_stock_map = {}
    for sample in sim_result.get("sample_part_comparisons", []):
        sim_stock_map[sample["part_id"]] = {
            "current_stock_units": sample["sim_stock"],
            "ved_class": sample["ved_class"],
            "lead_time_days": sample["sim_lead_time"],
            "estimated_stockout_risk": sample["stockout_risk"]
        }

    # Compare work packages readiness before vs after
    packages = db.query(MaintenanceWorkPackage).all()
    base_ready = 0
    sim_ready = 0
    pkg_comparisons = []
    
    # Baseline stock map for all parts
    all_parts = db.query(SparePart).join(PartClassification).join(InventoryMetric).all()
    base_stock_map = {
        p.part_id: {
            "current_stock_units": p.current_stock_units,
            "ved_class": p.classification.ved_class if p.classification else "E",
            "lead_time_days": p.lead_time_days,
            "estimated_stockout_risk": p.metrics.estimated_stockout_risk if p.metrics else 0.0
        }
        for p in all_parts
    }

    for pkg in packages:
        req_parts = [{"part_id": rp.part_id, "required_quantity": rp.required_quantity} for rp in pkg.required_parts]
        pkg_dict = {
            "work_package_id": pkg.work_package_id,
            "title": pkg.title,
            "required_parts": req_parts,
            "due_date": pkg.due_date,
            "estimated_duration_hours": pkg.estimated_duration_hours
        }
        base_eval = evaluate_work_package_readiness(pkg_dict, base_stock_map)
        sim_eval = evaluate_work_package_readiness(pkg_dict, {**base_stock_map, **sim_stock_map})
        
        if base_eval["readiness_status"] == "READY":
            base_ready += 1
        if sim_eval["readiness_status"] == "READY":
            sim_ready += 1

        pkg_comparisons.append({
            "work_package_id": pkg.work_package_id,
            "title": pkg.title,
            "baseline_status": base_eval["readiness_status"],
            "simulated_status": sim_eval["readiness_status"],
            "baseline_priority_score": base_eval["priority_score"],
            "simulated_priority_score": sim_eval["priority_score"],
            "shortage_count": sim_eval["shortage_count"]
        })

    sim_result["work_package_impact"] = {
        "baseline_ready_packages": base_ready,
        "simulated_ready_packages": sim_ready,
        "total_work_packages": len(packages),
        "package_details": pkg_comparisons
    }

    # Save to SimulationRun table
    run_record = SimulationRun(
        scenario_name=payload.scenario_name or "Custom Scenario",
        selected_parts_filter=payload.target_filter or "ALL",
        assumptions_json=params,
        simulation_count=payload.simulation_runs,
        results_json=sim_result["summary"]
    )
    db.add(run_record)
    db.commit()

    sim_result["run_id"] = run_record.id
    return sim_result

@router.get("/history")
def get_simulation_history(db: Session = Depends(get_db)):
    """Returns saved historical simulation runs."""
    runs = db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "scenario_name": r.scenario_name,
            "filter": r.selected_parts_filter,
            "assumptions": r.assumptions_json,
            "simulation_count": r.simulation_count,
            "summary": r.results_json,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in runs
    ]
