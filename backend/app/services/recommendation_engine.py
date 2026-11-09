"""
AI-Powered Inventory Decision Support and Recommendation Engine
Generates explainable, evidence-backed inventory recommendations based on:
- MUSIC-3D classifications
- Selective control indicators (HML, SOS, GOLF, FSN)
- Stock health, risk gap, and lead-time constraints
- Asset availability & maintenance package dependency
"""

from typing import List, Dict, Any

def generate_inventory_recommendations(parts_with_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Evaluates rule-based heuristic intelligence and statistical indicators across parts.
    """
    recommendations = []

    for item in parts_with_metrics:
        pid = item.get("part_id")
        pname = item.get("part_name")
        cat = item.get("category")
        code = item.get("music3d_code", "UNKNOWN")
        ved = item.get("ved_class", "E")
        sde = item.get("sde_class", "D")
        abc = item.get("abc_class", "B")
        hml = item.get("hml_class", "M")
        fsn = item.get("fsn_class", "S")
        golf = item.get("golf_class", "O")
        sos = item.get("sos_class", "OS")
        
        stock = float(item.get("current_stock_units", 0.0) or 0.0)
        rop = float(item.get("reorder_point", 0.0) or 0.0)
        ss = float(item.get("safety_stock", 0.0) or 0.0)
        ltd = float(item.get("lead_time_demand", 0.0) or 0.0)
        lt_days = int(item.get("lead_time_days", 30) or 30)
        risk = float(item.get("estimated_stockout_risk", 0.0) or 0.0)
        target_prob = float(item.get("target_stockout_prob_pct", 5.0) or 5.0)
        risk_gap = float(item.get("risk_gap", 0.0) or 0.0)
        unit_price = float(item.get("unit_price_inr", 0.0) or 0.0)
        inv_val = stock * unit_price
        cover_days = float(item.get("stock_cover_days", 0.0) or 0.0)

        # 1. Vital Part with ZERO Stock (Highest Emergency)
        if ved == "V" and stock <= 0:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "CRITICAL_STOCKOUT_VITAL",
                "title": f"EMERGENCY: Vital Spare Part {pid} at ZERO Stock",
                "priority": "CRITICAL",
                "confidence": 0.99,
                "music3d_code": code,
                "evidence": f"Stock is 0 units against daily demand requirement. Target service level is {item.get('service_level', 99)}%. Estimated stockout risk is 100%.",
                "suggested_action": "Trigger immediate SOS procurement from nearest zonal railway depot or alternate vendor contract. Halt non-essential scheduled blocks reliant on this part.",
                "rationale": "Unavailability of vital rolling stock parts directly jeopardizes passenger safety or causes unscheduled mainline rake detention.",
                "requires_approval": True,
                "data_source_flag": "Requires Competent Authority Signoff"
            })

        # 2. ASV Part with Insufficient Stock (High Value, Scarce, Vital)
        elif code == "ASV" and stock < rop:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "ASV_DEFICIT_RISK",
                "title": f"High Vulnerability on Class ASV Item ({pid})",
                "priority": "CRITICAL",
                "confidence": 0.95,
                "music3d_code": code,
                "evidence": f"Current stock ({stock:.0f} units) is below Reorder Point ({rop:.1f} units). Simulated risk is {risk:.1f}% vs 1.0% target (Risk gap: +{risk_gap:.1f}%). Sourced from scarce supplier with {lt_days} days lead time.",
                "suggested_action": "Engage designated PSU / sole-source vendor immediately. Expedite outstanding purchase order with priority manufacturing queue.",
                "rationale": "ASV items account for the highest expenditure share, scarce procurement avenues, and mission-critical functionality.",
                "requires_approval": True,
                "data_source_flag": "MUSIC-3D High-Priority Policy"
            })

        # 3. Scarce & Vital with High Lead Time (> 40 days)
        elif sde == "S" and ved == "V" and lt_days >= 40:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "SCARCE_VITAL_LONG_LEAD_TIME",
                "title": f"Single-Source Supply Vulnerability ({pid})",
                "priority": "HIGH",
                "confidence": 0.92,
                "music3d_code": code,
                "evidence": f"Part is Scarce (S) with single or limited vendor pool, {lt_days} days lead time, and vital operational consequence. Current stock coverage is {cover_days:.1f} days.",
                "suggested_action": "Develop approved alternate domestic vendor under Indian Railways 'Make in India' vendor development scheme. Review vendor performance SLA.",
                "rationale": "High lead time combined with sole-source scarcity leaves the railway zone exposed to external supply disruptions.",
                "requires_approval": False,
                "data_source_flag": "SDE Vendor Ecosystem Recommendation"
            })

        # 4. High-Cost Item with Excess Capital Tied Up (HML: H, Overstock)
        elif hml == "H" and stock > (rop + (2 * ss)) and cover_days > 180:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "HIGH_VALUE_EXCESS_CAPITAL",
                "title": f"Capital Optimization: Overstocked High-Cost Spare ({pid})",
                "priority": "MEDIUM",
                "confidence": 0.88,
                "music3d_code": code,
                "evidence": f"Unit price is INR {unit_price:,.2f} (Total held value: INR {inv_val:,.2f}). Stock covers {cover_days:.0f} days (> 6 months requirement).",
                "suggested_action": "Defer upcoming purchase indents. Consider inter-divisional stock transfer to adjacent railway divisions facing deficits.",
                "rationale": "Freeing working capital on high-unit-value spares optimizes annual store budget allocation without impacting service level.",
                "requires_approval": True,
                "data_source_flag": "HML Working Capital Control"
            })

        # 5. Non-Moving Item with Dormant Inventory Value (FSN: N)
        elif fsn == "N" and inv_val > 20000:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "DORMANT_DEAD_STOCK_WARNING",
                "title": f"Obsolescence Audit: Non-Moving Item ({pid})",
                "priority": "MEDIUM",
                "confidence": 0.85,
                "music3d_code": code,
                "evidence": f"Zero or negligible issue transactions recorded in the last 12 months. Tied-up inventory value is INR {inv_val:,.2f}.",
                "suggested_action": "Initiate technical survey committee review for obsolescence, survey scrap write-off, or return to central railway stores depot.",
                "rationale": "Prolonged dormancy leads to shelf deterioration, seal degradation, and store congestion.",
                "requires_approval": True,
                "data_source_flag": "FSN Store Movement Analysis"
            })

        # 6. Seasonal Spike Anticipation (SOS: S)
        elif sos == "S" and stock < (rop * 1.2):
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "SEASONAL_SURGE_PREPARATION",
                "title": f"Seasonal Procurement Buffer Alert ({pid})",
                "priority": "HIGH",
                "confidence": 0.90,
                "music3d_code": code,
                "evidence": f"Item exhibits distinct seasonal demand surge. Current stock ({stock:.0f} units) does not provide recommended pre-season 120% buffer.",
                "suggested_action": "Advance scheduled PO issuance by 4 weeks prior to upcoming peak operational season to avoid stockouts.",
                "rationale": "Seasonal climate stress on rolling stock drastically accelerates failure rates on pneumatic, braking, and HVAC components.",
                "requires_approval": False,
                "data_source_flag": "SOS Seasonality Heuristic"
            })

        # 7. Foreign-Source Dependency (GOLF: F)
        elif golf == "F" and lt_days >= 45:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "FOREIGN_SOURCING_BUFFER",
                "title": f"Import Logistics & Customs Risk ({pid})",
                "priority": "MEDIUM",
                "confidence": 0.89,
                "music3d_code": code,
                "evidence": f"Part is imported from foreign OEM with {lt_days} days nominal lead time. Foreign exchange exposure and customs clearance transit volatility.",
                "suggested_action": "Maintain minimum 60 days buffer stock. Coordinate with Railway Board centralized foreign procurement cell for bulk contract coverage.",
                "rationale": "Imported spares are susceptible to international shipping delays and regulatory port clearances.",
                "requires_approval": False,
                "data_source_flag": "GOLF Sourcing Origin Policy"
            })

        # 8. Essential/Vital Below Reorder Point (Standard Reorder Trigger)
        elif stock < rop and ved in ["V", "E"]:
            recommendations.append({
                "part_id": pid,
                "part_name": pname,
                "category": cat,
                "alert_type": "ROP_DEFICIT_REORDER",
                "title": f"Replenishment Indent Required ({pid})",
                "priority": "HIGH" if ved == "V" else "MEDIUM",
                "confidence": 0.93,
                "music3d_code": code,
                "evidence": f"Stock ({stock:.0f}) has breached Reorder Point ({rop:.1f}). Simulated stockout risk is {risk:.1f}% (target: {target_prob:.1f}%).",
                "suggested_action": f"Issue procurement purchase order for Economic Order Quantity (EOQ: ~{max(10, int(ltd * 1.5))} units).",
                "rationale": "Maintaining stock above ROP ensures replenishment arrives before safety buffer is exhausted.",
                "requires_approval": False,
                "data_source_flag": "Continuous Review (s, S) Policy"
            })

    # Sort recommendations by priority order
    priority_weights = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recommendations.sort(key=lambda r: priority_weights.get(r["priority"], 99))
    return recommendations
