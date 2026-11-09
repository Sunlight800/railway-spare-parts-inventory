"""
Maintenance Block Planning Router: Work Packages, BOM Material Readiness, and Priority Scheduling
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Dict, Any, List
import datetime

from app.database import get_db
from app.models.entities import (
    MaintenanceWorkPackage, WorkPackagePart, SparePart,
    PartClassification, InventoryMetric, BlockWindow, Asset
)
from app.services.block_planning_engine import (
    evaluate_work_package_readiness, group_packages_by_section
)
from app.schemas.api_schemas import WorkPackageCreate, RescheduleBlockRequest

router = APIRouter(prefix="/api/block-planning", tags=["Maintenance Block Planning"])

def get_live_parts_stock_map(db: Session) -> Dict[str, Dict[str, Any]]:
    parts = db.query(SparePart).join(PartClassification).join(InventoryMetric).all()
    return {
        p.part_id: {
            "part_id": p.part_id,
            "part_name": p.part_name,
            "current_stock_units": p.current_stock_units,
            "lead_time_days": p.lead_time_days,
            "ved_class": p.classification.ved_class if p.classification else "E",
            "sde_class": p.classification.sde_class if p.classification else "D",
            "estimated_stockout_risk": p.metrics.estimated_stockout_risk if p.metrics else 0.0
        }
        for p in parts
    }

@router.get("/work-packages")
def list_work_packages(db: Session = Depends(get_db)):
    """Returns all maintenance work packages with live evaluated BOM material readiness and priority scores."""
    packages = db.query(MaintenanceWorkPackage).all()
    stock_map = get_live_parts_stock_map(db)

    results = []
    for pkg in packages:
        req_parts = [
            {"part_id": rp.part_id, "required_quantity": rp.required_quantity}
            for rp in pkg.required_parts
        ]
        pkg_dict = {
            "work_package_id": pkg.work_package_id,
            "title": pkg.title,
            "asset_id": pkg.asset_id,
            "section": pkg.section,
            "description": pkg.description,
            "estimated_duration_hours": pkg.estimated_duration_hours,
            "due_date": pkg.due_date,
            "priority": pkg.priority,
            "scheduled_block_date": pkg.scheduled_block_date,
            "required_parts": req_parts
        }
        evaluated = evaluate_work_package_readiness(pkg_dict, stock_map)
        
        # Merge asset info
        asset_info = db.query(Asset).filter(Asset.asset_id == pkg.asset_id).first()
        evaluated["asset_name"] = asset_info.asset_name if asset_info else pkg.asset_id
        evaluated["asset_system"] = asset_info.system if asset_info else "General"
        evaluated["description"] = pkg.description
        evaluated["due_date"] = pkg.due_date.isoformat() if pkg.due_date else None
        evaluated["scheduled_block_date"] = pkg.scheduled_block_date.isoformat() if pkg.scheduled_block_date else None

        results.append(evaluated)

    # Sort by priority score descending
    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results

@router.get("/calendar")
def get_block_calendar_timeline(db: Session = Depends(get_db)):
    """Timeline and calendar allocation for indicative blocks and maintenance windows."""
    windows = db.query(BlockWindow).order_by(BlockWindow.date).all()
    packages = db.query(MaintenanceWorkPackage).all()
    stock_map = get_live_parts_stock_map(db)

    # Evaluate all packages
    evaluated_packages = []
    for pkg in packages:
        req_parts = [{"part_id": rp.part_id, "required_quantity": rp.required_quantity} for rp in pkg.required_parts]
        pkg_dict = {
            "work_package_id": pkg.work_package_id,
            "title": pkg.title,
            "asset_id": pkg.asset_id,
            "section": pkg.section,
            "description": pkg.description,
            "estimated_duration_hours": pkg.estimated_duration_hours,
            "due_date": pkg.due_date,
            "scheduled_block_date": pkg.scheduled_block_date,
            "required_parts": req_parts
        }
        ev = evaluate_work_package_readiness(pkg_dict, stock_map)
        ev["due_date"] = pkg.due_date.isoformat() if pkg.due_date else None
        ev["scheduled_block_date"] = pkg.scheduled_block_date.isoformat() if pkg.scheduled_block_date else None
        evaluated_packages.append(ev)

    calendar_windows = []
    for w in windows:
        # Find packages matching section or date
        matched_pkgs = [p for p in evaluated_packages if p.get("section") == w.section]
        calendar_windows.append({
            "id": w.id,
            "window_name": w.window_name,
            "section": w.section,
            "date": w.date.isoformat() if w.date else None,
            "start_time": w.start_time,
            "end_time": w.end_time,
            "status": w.window_status,
            "assigned_packages": matched_pkgs
        })

    return {
        "disclaimer": "Academic Indicative Decision Support. Real railway blocks require formal Railway Board / Operating Department possession approvals.",
        "calendar_windows": calendar_windows,
        "all_evaluated_packages": evaluated_packages
    }

@router.post("/reschedule")
def reschedule_work_package(payload: RescheduleBlockRequest, db: Session = Depends(get_db)):
    """Reallocates a work package to a different block date/window and returns immediate readiness."""
    pkg = db.query(MaintenanceWorkPackage).filter(MaintenanceWorkPackage.work_package_id == payload.work_package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Work package not found.")

    pkg.scheduled_block_date = payload.new_date
    if payload.new_section:
        pkg.section = payload.new_section
    db.commit()

    stock_map = get_live_parts_stock_map(db)
    req_parts = [{"part_id": rp.part_id, "required_quantity": rp.required_quantity} for rp in pkg.required_parts]
    pkg_dict = {
        "work_package_id": pkg.work_package_id,
        "title": pkg.title,
        "asset_id": pkg.asset_id,
        "section": pkg.section,
        "due_date": pkg.due_date,
        "scheduled_block_date": pkg.scheduled_block_date,
        "required_parts": req_parts
    }
    evaluated = evaluate_work_package_readiness(pkg_dict, stock_map)
    return {
        "status": "SUCCESS",
        "work_package_id": pkg.work_package_id,
        "new_date": payload.new_date.isoformat(),
        "readiness_status": evaluated["readiness_status"],
        "readiness_pct": evaluated["readiness_pct"],
        "priority_score": evaluated["priority_score"],
        "recommendation": evaluated["recommendation"]
    }
