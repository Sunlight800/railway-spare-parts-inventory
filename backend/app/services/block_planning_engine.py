"""
Inventory-Led Indicative Maintenance Block Planning Engine
Connects spare-part inventory intelligence with railway rolling stock and fixed asset maintenance.
"""

from typing import List, Dict, Any, Optional
import datetime

def evaluate_work_package_readiness(
    package: Dict[str, Any],
    parts_stock_map: Dict[str, Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Evaluates Bill-of-Materials material readiness and computes an explainable priority score.
    """
    if weights is None:
        weights = {
            "ved_criticality": 0.35,
            "material_readiness": 0.30,
            "stockout_vulnerability": 0.20,
            "schedule_urgency": 0.15
        }

    required_parts = package.get("required_parts", [])
    total_parts_count = len(required_parts)
    
    available_count = 0
    shortage_items = []
    has_vital_shortage = False
    max_part_lead_time = 0
    max_ved_rank = 0 # 3: Vital, 2: Essential, 1: Desirable
    ved_map = {"V": 3, "E": 2, "D": 1}

    for req in required_parts:
        pid = req.get("part_id")
        req_qty = float(req.get("required_quantity", 1.0) or 1.0)
        
        part_info = parts_stock_map.get(pid, {})
        curr_stock = float(part_info.get("current_stock_units", 0.0) or 0.0)
        ved = str(part_info.get("ved_class", "E")).upper()
        pname = part_info.get("part_name", pid)
        lt_days = int(part_info.get("lead_time_days", 30) or 30)
        risk = float(part_info.get("estimated_stockout_risk", 0.0) or 0.0)

        if ved_map.get(ved, 1) > max_ved_rank:
            max_ved_rank = ved_map.get(ved, 1)

        if curr_stock >= req_qty:
            available_count += 1
        else:
            shortfall = req_qty - curr_stock
            if lt_days > max_part_lead_time:
                max_part_lead_time = lt_days
            if ved == "V":
                has_vital_shortage = True

            shortage_items.append({
                "part_id": pid,
                "part_name": pname,
                "required_quantity": req_qty,
                "current_stock": curr_stock,
                "shortfall": round(shortfall, 1),
                "ved_class": ved,
                "sde_class": part_info.get("sde_class", "D"),
                "lead_time_days": lt_days,
                "estimated_stockout_risk": risk
            })

    # Determine Readiness Status
    if total_parts_count == 0:
        readiness_status = "READY"
        readiness_pct = 100.0
    elif available_count == total_parts_count:
        readiness_status = "READY"
        readiness_pct = 100.0
    elif has_vital_shortage or available_count == 0:
        readiness_status = "NOT_READY"
        readiness_pct = round((available_count / total_parts_count) * 100.0, 1)
    else:
        readiness_status = "PARTIALLY_READY"
        readiness_pct = round((available_count / total_parts_count) * 100.0, 1)

    # Compute Component Scores for Priority Score
    # 1. Criticality component (0 to 100)
    ved_score = 100.0 if max_ved_rank == 3 else (70.0 if max_ved_rank == 2 else 40.0)
    
    # 2. Material Readiness component (0 to 100)
    mat_score = readiness_pct
    
    # 3. Stockout Vulnerability component (0 to 100)
    vulnerability_score = 75.0 if has_vital_shortage else 30.0
    
    # 4. Schedule Urgency component (0 to 100)
    due_date = package.get("due_date")
    urgency_score = 50.0
    if due_date:
        try:
            if isinstance(due_date, str):
                due_dt = datetime.datetime.fromisoformat(due_date.replace("Z", "+00:00")).date()
            else:
                due_dt = due_date.date() if hasattr(due_date, "date") else due_date
            today = datetime.date.today()
            days_left = (due_dt - today).days
            if days_left <= 2:
                urgency_score = 95.0
            elif days_left <= 7:
                urgency_score = 80.0
            elif days_left <= 14:
                urgency_score = 60.0
            else:
                urgency_score = 40.0
        except Exception:
            urgency_score = 50.0

    # Weighted Priority Score
    priority_score = (
        (ved_score * weights["ved_criticality"]) +
        (mat_score * weights["material_readiness"]) +
        (vulnerability_score * weights["stockout_vulnerability"]) +
        (urgency_score * weights["schedule_urgency"])
    )

    # Actionable Recommendation Text
    if readiness_status == "READY":
        rec_text = "All required Bill-of-Materials items are physically in stock. Package is eligible for allocation in the upcoming block maintenance window."
    elif readiness_status == "PARTIALLY_READY":
        rec_text = f"Partial material readiness ({readiness_pct}%). Shortage of {len(shortage_items)} non-vital component(s). Initiate store transfer or assess temporary bypass."
    else:
        rec_text = f"BLOCK HOLD: Severe material deficit including {len(shortage_items)} critical/vital part(s). Earliest feasibility requires {max_part_lead_time} days procurement lead time."

    return {
        "work_package_id": package.get("work_package_id"),
        "title": package.get("title"),
        "asset_id": package.get("asset_id"),
        "section": package.get("section"),
        "readiness_status": readiness_status,
        "readiness_pct": readiness_pct,
        "priority_score": round(priority_score, 1),
        "total_required_parts": total_parts_count,
        "available_parts_count": available_count,
        "shortage_count": len(shortage_items),
        "shortage_items": shortage_items,
        "max_procurement_lead_time_days": max_part_lead_time,
        "recommendation": rec_text,
        "scheduled_block_date": package.get("scheduled_block_date"),
        "estimated_duration_hours": package.get("estimated_duration_hours", 4.0)
    }

def group_packages_by_section(packages_evaluated: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Groups packages by railway section for combined block execution synergies.
    """
    sections = {}
    for pkg in packages_evaluated:
        sec = pkg.get("section", "General Divisional Section")
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(pkg)
    return sections
