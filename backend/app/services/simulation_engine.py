"""
Simulation Engine for what-if scenarios and dynamic Monte Carlo modeling
"""

from typing import List, Dict, Any, Optional
import numpy as np
import math
from app.services.inventory_metrics import compute_part_metrics

PREBUILT_SCENARIOS = {
    "BASELINE": {
        "name": "Baseline Operational State",
        "description": "Standard steady-state railway operations with current stock and historical lead times.",
        "params": {
            "demand_pct_change": 0.0,
            "lead_time_pct_change": 0.0,
            "stock_pct_change": 0.0,
            "supplier_delay_days": 0,
            "demand_cv_multiplier": 1.0,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    },
    "DEMAND_SURGE": {
        "name": "Festival & Seasonal Traffic Demand Surge",
        "description": "40% spike in rolling stock usage during peak holiday and festival special train movements.",
        "params": {
            "demand_pct_change": 40.0,
            "lead_time_pct_change": 0.0,
            "stock_pct_change": 0.0,
            "supplier_delay_days": 0,
            "demand_cv_multiplier": 1.3,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    },
    "SUPPLIER_DELAY": {
        "name": "Supply Chain Bottleneck & Supplier Delays",
        "description": "Vendor delivery slowdown causing 15 days delay and 25% longer replenishment lead times.",
        "params": {
            "demand_pct_change": 0.0,
            "lead_time_pct_change": 25.0,
            "stock_pct_change": 0.0,
            "supplier_delay_days": 15,
            "demand_cv_multiplier": 1.0,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    },
    "SCARCE_SHORTAGE": {
        "name": "Scarce (S) Spares Stock Depletion",
        "description": "Acute depletion of scarce and single-source items with a 40% reduction in available depot stock.",
        "params": {
            "demand_pct_change": 0.0,
            "lead_time_pct_change": 0.0,
            "stock_pct_change": -40.0,
            "supplier_delay_days": 10,
            "demand_cv_multiplier": 1.2,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    },
    "SEASONAL_PEAK": {
        "name": "Monsoon & Winter Heavy Weather Shock",
        "description": "High seasonal stress on braking, pneumatic, and electrical subsystems (+50% demand).",
        "params": {
            "demand_pct_change": 50.0,
            "lead_time_pct_change": 15.0,
            "stock_pct_change": 0.0,
            "supplier_delay_days": 5,
            "demand_cv_multiplier": 1.4,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    },
    "STOCK_REPLENISHMENT": {
        "name": "Proactive Strategic Depot Replenishment",
        "description": "Targeted procurement push adding +35% stock to buffer vital and essential components.",
        "params": {
            "demand_pct_change": 0.0,
            "lead_time_pct_change": 0.0,
            "stock_pct_change": 35.0,
            "supplier_delay_days": 0,
            "demand_cv_multiplier": 1.0,
            "safety_stock_multiplier": 1.2,
            "replenishment_units": 15
        }
    },
    "IMPROVED_SAFETY_STOCK": {
        "name": "Dynamic High-Resilience Safety Stock Policy",
        "description": "Enhanced safety stock buffer multiplier (1.5x) to withstand supply uncertainty.",
        "params": {
            "demand_pct_change": 0.0,
            "lead_time_pct_change": 0.0,
            "stock_pct_change": 15.0,
            "supplier_delay_days": 0,
            "demand_cv_multiplier": 1.0,
            "safety_stock_multiplier": 1.5,
            "replenishment_units": 0
        }
    },
    "SUPPLIER_DISRUPTION": {
        "name": "Global Sourcing Geopolitical Disruption",
        "description": "Severe import freeze and vendor disruption (+80% lead time, 25 days delay, +20% demand variance).",
        "params": {
            "demand_pct_change": 10.0,
            "lead_time_pct_change": 80.0,
            "stock_pct_change": -20.0,
            "supplier_delay_days": 25,
            "demand_cv_multiplier": 1.8,
            "safety_stock_multiplier": 1.0,
            "replenishment_units": 0
        }
    }
}

def run_inventory_simulation(
    parts_data: List[Dict[str, Any]],
    params: Dict[str, Any],
    simulation_runs: int = 500
) -> Dict[str, Any]:
    """
    Executes what-if simulation across provided spare parts and compares with baseline.
    """
    demand_pct = float(params.get("demand_pct_change", 0.0))
    lead_time_pct = float(params.get("lead_time_pct_change", 0.0))
    stock_pct = float(params.get("stock_pct_change", 0.0))
    delay_days = int(params.get("supplier_delay_days", 0))
    cv_mult = max(0.2, float(params.get("demand_cv_multiplier", 1.0)))
    ss_mult = max(0.2, float(params.get("safety_stock_multiplier", 1.0)))
    rep_units = max(0.0, float(params.get("replenishment_units", 0.0)))

    baseline_results = []
    simulated_results = []

    for item in parts_data:
        annual_usage = float(item.get("annual_usage_units", 0.0) or 0.0)
        lead_time = int(item.get("lead_time_days", 30) or 30)
        curr_stock = float(item.get("current_stock_units", 0.0) or 0.0)
        z = float(item.get("z_score", 1.64) or 1.64)
        sl = float(item.get("service_level", 95.0) or 95.0)
        
        # 1. Baseline Run
        base_res = compute_part_metrics(
            annual_usage=annual_usage,
            lead_time_days=lead_time,
            current_stock=curr_stock,
            z_score=z,
            service_level=sl,
            demand_cv=0.30,
            simulation_runs=simulation_runs
        )
        baseline_results.append({
            "part_id": item.get("part_id"),
            "part_name": item.get("part_name"),
            "music3d_code": item.get("music3d_code", "UNKNOWN"),
            "ved_class": item.get("ved_class", "E"),
            "stockout_risk": base_res["estimated_stockout_risk"],
            "fill_rate": base_res["estimated_fill_rate"],
            "stock_status": base_res["stock_status"]
        })

        # 2. Simulated Perturbation
        sim_demand = max(0.0, annual_usage * (1.0 + demand_pct / 100.0))
        sim_lead_time = max(1, int(round((lead_time * (1.0 + lead_time_pct / 100.0)) + delay_days)))
        sim_stock = max(0.0, (curr_stock * (1.0 + stock_pct / 100.0)) + rep_units)
        sim_cv = 0.30 * cv_mult

        sim_res = compute_part_metrics(
            annual_usage=sim_demand,
            lead_time_days=sim_lead_time,
            current_stock=sim_stock,
            z_score=z * ss_mult,
            service_level=sl,
            demand_cv=sim_cv,
            simulation_runs=simulation_runs
        )
        simulated_results.append({
            "part_id": item.get("part_id"),
            "part_name": item.get("part_name"),
            "music3d_code": item.get("music3d_code", "UNKNOWN"),
            "ved_class": item.get("ved_class", "E"),
            "sim_stock": round(sim_stock, 1),
            "sim_demand": round(sim_demand, 1),
            "sim_lead_time": sim_lead_time,
            "stockout_risk": sim_res["estimated_stockout_risk"],
            "fill_rate": sim_res["estimated_fill_rate"],
            "stock_status": sim_res["stock_status"],
            "reorder_point": sim_res["reorder_point"]
        })

    # Aggregations
    avg_base_risk = np.mean([b["stockout_risk"] for b in baseline_results]) if baseline_results else 0.0
    avg_sim_risk = np.mean([s["stockout_risk"] for s in simulated_results]) if simulated_results else 0.0
    avg_base_fill = np.mean([b["fill_rate"] for b in baseline_results]) if baseline_results else 0.0
    avg_sim_fill = np.mean([s["fill_rate"] for s in simulated_results]) if simulated_results else 0.0

    base_critical_count = sum(1 for b in baseline_results if b["stockout_risk"] >= 30.0)
    sim_critical_count = sum(1 for s in simulated_results if s["stockout_risk"] >= 30.0)

    base_understock_count = sum(1 for b in baseline_results if b["stock_status"] in ["UNDERSTOCK", "OUT_OF_STOCK"])
    sim_understock_count = sum(1 for s in simulated_results if s["stock_status"] in ["UNDERSTOCK", "OUT_OF_STOCK"])

    return {
        "simulation_count": simulation_runs,
        "parameters_applied": params,
        "summary": {
            "avg_baseline_stockout_risk_pct": round(float(avg_base_risk), 2),
            "avg_simulated_stockout_risk_pct": round(float(avg_sim_risk), 2),
            "stockout_risk_delta_pct": round(float(avg_sim_risk - avg_base_risk), 2),
            "avg_baseline_fill_rate_pct": round(float(avg_base_fill), 2),
            "avg_simulated_fill_rate_pct": round(float(avg_sim_fill), 2),
            "fill_rate_delta_pct": round(float(avg_sim_fill - avg_base_fill), 2),
            "baseline_critical_risk_parts": base_critical_count,
            "simulated_critical_risk_parts": sim_critical_count,
            "baseline_understock_parts": base_understock_count,
            "simulated_understock_parts": sim_understock_count,
        },
        "sample_part_comparisons": simulated_results[:25] # top 25 for quick inspection
    }
