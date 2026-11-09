"""
Inventory Analytics and Monte Carlo Stockout Simulation Service
Computes:
- Average Daily Demand
- Lead Time Demand
- Safety Stock (using MUSIC-3D Z-scores)
- Reorder Point
- Stock Coverage Days
- Target Stockout Probability vs Actual Simulated Stockout Risk
- Fill Rate and Risk Gap
"""

import math
import numpy as np
from typing import Dict, Any, Optional

def compute_part_metrics(
    annual_usage: float,
    lead_time_days: int,
    current_stock: float,
    z_score: float = 1.64,
    service_level: float = 95.0,
    demand_cv: float = 0.30,
    simulation_runs: int = 500
) -> Dict[str, Any]:
    """
    Computes all standard LSCM inventory parameters and executes Monte Carlo stockout simulation.
    """
    usage = max(0.0, float(annual_usage or 0.0))
    lead_time = max(1, int(lead_time_days or 1))
    stock = max(0.0, float(current_stock or 0.0))
    z = float(z_score or 1.64)
    sl = float(service_level or 95.0)

    # 1. Average Daily Demand
    daily_demand = usage / 365.0
    daily_std = daily_demand * demand_cv if daily_demand > 0 else 0.0

    # 2. Expected Lead Time Demand
    ltd = daily_demand * lead_time

    # 3. Safety Stock
    # Formula: SS = Z * sigma_d * sqrt(L)
    safety_stock = z * daily_std * math.sqrt(lead_time) if daily_std > 0 else 0.0

    # 4. Reorder Point (ROP)
    rop = ltd + safety_stock

    # 5. Stock Coverage Days
    if daily_demand > 0:
        stock_cover_days = stock / daily_demand
    else:
        stock_cover_days = 999.0 if stock > 0 else 0.0

    # 6. Target Stockout Probability (from MUSIC-3D course specification)
    target_stockout_prob = 1.0 - (sl / 100.0)
    target_stockout_prob_pct = target_stockout_prob * 100.0

    # 7. Monte Carlo Simulation for Actual Stockout Risk and Fill Rate
    if daily_demand <= 0:
        actual_stockout_risk_pct = 0.0 if stock > 0 else 0.0
        fill_rate_pct = 100.0
    else:
        np.random.seed(42) # Consistent reproducible evaluation
        lead_time_std = daily_std * math.sqrt(lead_time)
        
        # Sample simulated demand across lead time
        simulated_demands = np.random.normal(loc=ltd, scale=lead_time_std, size=simulation_runs)
        simulated_demands = np.clip(simulated_demands, 0.0, None) # Non-negative demand

        # Stockout occurrence: simulated demand > current stock
        stockout_occurrences = np.sum(simulated_demands > stock)
        actual_stockout_risk_pct = float((stockout_occurrences / simulation_runs) * 100.0)

        # Fill rate: fraction of demand met directly from inventory
        total_demand = np.sum(simulated_demands)
        fulfilled_demand = np.sum(np.minimum(stock, simulated_demands))
        fill_rate_pct = float((fulfilled_demand / total_demand * 100.0)) if total_demand > 0 else 100.0

    # 8. Risk Gap
    risk_gap = actual_stockout_risk_pct - target_stockout_prob_pct

    # 9. Stock Status Classification
    if stock == 0 and daily_demand > 0:
        stock_status = "OUT_OF_STOCK"
    elif stock < rop:
        stock_status = "UNDERSTOCK"
    elif stock > (rop + (2 * safety_stock)):
        stock_status = "OVERSTOCK"
    else:
        stock_status = "HEALTHY"

    return {
        "average_daily_demand": round(daily_demand, 3),
        "demand_standard_deviation": round(daily_std, 3),
        "lead_time_demand": round(ltd, 2),
        "safety_stock": round(safety_stock, 2),
        "reorder_point": round(rop, 2),
        "stock_cover_days": round(stock_cover_days, 1),
        "target_stockout_prob": round(target_stockout_prob, 4),
        "target_stockout_prob_pct": round(target_stockout_prob_pct, 2),
        "estimated_stockout_risk": round(actual_stockout_risk_pct, 2),
        "risk_gap": round(risk_gap, 2),
        "estimated_fill_rate": round(fill_rate_pct, 2),
        "stock_status": stock_status,
        "calculation_method": f"Monte Carlo Normal-Lead-Time Model (N={simulation_runs})",
        "calculation_assumptions": f"Constant lead time ({lead_time} days), daily demand CV={demand_cv}, target service level={sl}%."
    }
