"""
Comprehensive Classification Engine for Indian Railways Spare Parts
Implements:
1. ABC Analysis (Annual Consumption Expenditure Pareto)
2. SDE Analysis (Procurement Availability & Supply Difficulty)
3. VED Analysis (Operational Criticality & Safety Consequence)
4. HML Analysis (Unit Price Tiers)
5. SOS Analysis (Seasonality in Demand/Supply)
6. GOLF Analysis (Procurement Channel & Geographic Origin)
7. FSN Analysis (Store Issue Movement Frequency)
"""

from typing import List, Dict, Any, Tuple
import pandas as pd
from app.config import settings

def calculate_abc_classes(parts: List[Dict[str, Any]], a_pct: float = None, b_pct: float = None) -> List[Dict[str, Any]]:
    """
    Classify spare parts into A, B, and C based on descending annual consumption value.
    Default cumulative thresholds: A <= 70%, B <= 90%, C > 90%.
    """
    if a_pct is None:
        a_pct = settings.ABC_A_THRESHOLD
    if b_pct is None:
        b_pct = settings.ABC_B_THRESHOLD

    if not parts:
        return []

    # Recalculate annual consumption value
    for p in parts:
        usage = float(p.get("annual_usage_units", 0.0) or 0.0)
        price = float(p.get("unit_price_inr", 0.0) or 0.0)
        p["annual_consumption_value_inr"] = round(usage * price, 2)

    # Sort descending
    sorted_parts = sorted(parts, key=lambda x: x["annual_consumption_value_inr"], reverse=True)
    total_spend = sum(p["annual_consumption_value_inr"] for p in sorted_parts)

    cum_spend = 0.0
    for idx, p in enumerate(sorted_parts):
        spend = p["annual_consumption_value_inr"]
        prior_cum_pct = (cum_spend / total_spend * 100.0) if total_spend > 0 else 0.0
        cum_spend += spend
        cum_pct = (cum_spend / total_spend * 100.0) if total_spend > 0 else 0.0
        item_pct = ((idx + 1) / len(sorted_parts) * 100.0)

        if prior_cum_pct < a_pct or idx == 0:
            cls = "A"
        elif prior_cum_pct < b_pct:
            cls = "B"
        else:
            cls = "C"

        p["abc_class"] = cls
        p["cumulative_expenditure_inr"] = round(cum_spend, 2)
        p["cumulative_expenditure_pct"] = round(cum_pct, 2)
        p["item_rank"] = idx + 1
        p["cumulative_item_pct"] = round(item_pct, 2)
        p["expenditure_share_pct"] = round((spend / total_spend * 100.0) if total_spend > 0 else 0.0, 3)

    return sorted_parts

def classify_sde(
    supplier_count: int = 1,
    alternate_supplier_count: int = 0,
    procurement_source: str = "Open Market",
    is_imported: bool = False,
    lead_time_days: int = 30,
    procurement_difficulty: str = "Standard"
) -> Tuple[str, str]:
    """
    Evaluate SDE based on supplier ecosystem, import dependency, and sourcing constraints.
    Returns (SDE_class, reason).
    """
    src_lower = str(procurement_source).lower()
    diff_lower = str(procurement_difficulty).lower()

    if is_imported or "import" in src_lower or "foreign" in src_lower:
        return "S", "Single-source foreign supplier with import dependency and severe logistical constraints."
    
    if (supplier_count <= 1 and alternate_supplier_count == 0) or "scarce" in diff_lower or "sole source" in diff_lower:
        return "S", "Single authorized source or highly specialized manufacturing capability."

    if alternate_supplier_count in [1, 2] or supplier_count <= 2 or "difficult" in diff_lower or lead_time_days > 45:
        return "D", "Limited approved railway vendors or moderate delivery lead-time variability."

    return "E", "Readily available from multiple approved open-market or local zonal depot suppliers."

def classify_ved(
    category: str,
    part_name: str,
    legacy_criticality: str = "Critical",
    safety_impact: str = None,
    operational_impact: str = None
) -> Tuple[str, str]:
    """
    Classify VED based on functional and safety consequences of part absence.
    Vital: immediate safety or traction stoppage.
    Essential: disruption with temporary buffer.
    Desirable: non-critical / comfort / aesthetic.
    """
    cat_lower = str(category).lower()
    name_lower = str(part_name).lower()
    
    vital_keywords = [
        "brake", "bearing", "pantograph", "valve", "axle", "wheel", "coupler",
        "pneumatic", "traction", "transformer", "relay", "interlocking", "contact strip"
    ]
    desirable_keywords = [
        "trim", "handle", "latch", "seat", "cover", "wiper blade", "nameplate",
        "rubber foot", "sticker", "bracket", "decal", "cushion", "bulb"
    ]

    if any(k in name_lower for k in vital_keywords) or any(k in cat_lower for k in ["braking", "bogie", "pneumatic", "control"]):
        return "V", "Unavailability directly threatens train safety, braking efficiency, or immediate traction."

    if any(k in name_lower for k in desirable_keywords) or "general" in cat_lower:
        return "D", "Non-critical auxiliary or comfort component with negligible operational impact."

    # Default fallback based on legacy hint or functional role
    if str(legacy_criticality).lower() == "critical":
        return "E", "Important operational assembly where temporary bypass or scheduled substitution is possible."
    
    return "E", "Essential subsystem component supporting continuous rolling stock availability."

def classify_hml(unit_price_inr: float, h_threshold: float = None, m_threshold: float = None) -> Tuple[str, str]:
    """
    HML (High, Medium, Low) based on Unit Price (INR).
    """
    if h_threshold is None:
        h_threshold = settings.HML_H_THRESHOLD
    if m_threshold is None:
        m_threshold = settings.HML_M_THRESHOLD

    price = float(unit_price_inr or 0.0)
    if price >= h_threshold:
        return "H", f"High unit cost (>= INR {h_threshold:,.2f})"
    elif price >= m_threshold:
        return "M", f"Medium unit cost (INR {m_threshold:,.2f} - {h_threshold:,.2f})"
    else:
        return "L", f"Low unit cost (< INR {m_threshold:,.2f})"

def classify_sos(monthly_demands: List[float] = None, category: str = "", part_name: str = "") -> Tuple[str, str]:
    """
    SOS (Seasonal vs Off-Seasonal) based on demand patterns.
    """
    name_lower = f"{part_name} {category}".lower()
    seasonal_indicators = ["hvac", "air conditioner", "condenser", "pantograph", "catenary", "monsoon", "heater", "wiper", "filter"]
    
    if monthly_demands and len(monthly_demands) >= 12:
        s = pd.Series(monthly_demands)
        mean_val = s.mean()
        std_val = s.std()
        cv = (std_val / mean_val) if mean_val > 0 else 0
        if cv > 0.35:
            max_month = s.idxmax() + 1
            return "S", f"Seasonal consumption variance detected (CV={cv:.2f}, peak month: Month {max_month})."
        else:
            return "OS", f"Off-seasonal uniform demand pattern across the operational calendar (CV={cv:.2f})."

    if any(k in name_lower for k in seasonal_indicators):
        return "S", "Seasonal wear item with operational spikes during peak climate conditions."
    return "OS", "Year-round operational consumption with stable maintenance cycle demand."

def classify_golf(procurement_source: str = "Open Market", supplier_type: str = "Private", is_imported: bool = False) -> Tuple[str, str]:
    """
    GOLF classification:
    G: Government Undertaking / PSU (SAIL, BHEL, Chittaranjan Locomotive Works)
    O: Open Market Commercial Vendor
    L: Local Railway Zonal / Divisional Workshop
    F: Foreign / Imported Manufacturer
    """
    if is_imported or "foreign" in str(procurement_source).lower() or "import" in str(procurement_source).lower():
        return "F", "Procured from foreign OEM or international railway consortium."
    
    if "psu" in str(supplier_type).lower() or "gov" in str(supplier_type).lower() or "railway" in str(supplier_type).lower():
        return "G", "Supplied by public sector undertaking (PSU) or central railway production unit."
        
    if "local" in str(procurement_source).lower() or "depot" in str(procurement_source).lower():
        return "L", "Procured locally from divisional railway stores or regional vendors."

    return "O", "Sourced through standard open-market railway e-procurement tenders."

def classify_fsn(issue_count_annual: int = 12, months_since_last_issue: int = 1) -> Tuple[str, str]:
    """
    FSN classification:
    F: Fast-Moving (> 12 issues per year, active store issuance)
    S: Slow-Moving (2 - 12 issues per year)
    N: Non-Moving (0 - 1 issue per year, high dormancy or obsolescence risk)
    """
    if months_since_last_issue >= 12 or issue_count_annual <= 1:
        return "N", f"Non-moving / dormant item: only {issue_count_annual} issues recorded in last 12 months."
    elif issue_count_annual > 12:
        return "F", f"Fast-moving component with regular store turnover ({issue_count_annual} issues/year)."
    else:
        return "S", f"Slow-moving spare part with periodic maintenance turnover ({issue_count_annual} issues/year)."
