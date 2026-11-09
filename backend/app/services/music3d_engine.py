"""
MUSIC-3D Inventory Classification Engine
Implements the exact 27-combination matrix from the LSCM course curriculum:
Dimension 1: ABC (Annual Consumption Value)
Dimension 2: SDE (Availability / Procurement Difficulty)
Dimension 3: VED (Operational & Safety Criticality)
"""

from typing import Dict, Any, Optional, Tuple

# Official Course Reference Table: 27 MUSIC-3D Combinations
MUSIC_3D_REFERENCE_TABLE: Dict[str, Dict[str, Any]] = {
    "ASV": {"service_level": 99.0, "z_score": 2.32, "target_stockout_prob": 0.01, "description": "High Value, Scarce Availability, Vital Criticality"},
    "ASE": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "High Value, Scarce Availability, Essential Criticality"},
    "ASD": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "High Value, Scarce Availability, Desirable Criticality"},
    "ADV": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "High Value, Difficult Availability, Vital Criticality"},
    "ADE": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "High Value, Difficult Availability, Essential Criticality"},
    "ADD": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "High Value, Difficult Availability, Desirable Criticality"},
    "AEV": {"service_level": 80.0, "z_score": 0.84, "target_stockout_prob": 0.20, "description": "High Value, Easily Available, Vital Criticality"},
    "AEE": {"service_level": 80.0, "z_score": 0.84, "target_stockout_prob": 0.20, "description": "High Value, Easily Available, Essential Criticality"},
    "AED": {"service_level": 80.0, "z_score": 0.84, "target_stockout_prob": 0.20, "description": "High Value, Easily Available, Desirable Criticality"},

    "BSV": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "Medium Value, Scarce Availability, Vital Criticality"},
    "BSE": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "Medium Value, Scarce Availability, Essential Criticality"},
    "BSD": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Medium Value, Scarce Availability, Desirable Criticality"},
    "BDV": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "Medium Value, Difficult Availability, Vital Criticality"},
    "BDE": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Medium Value, Difficult Availability, Essential Criticality"},
    "BDD": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Medium Value, Difficult Availability, Desirable Criticality"},
    "BEV": {"service_level": 80.0, "z_score": 0.84, "target_stockout_prob": 0.20, "description": "Medium Value, Easily Available, Vital Criticality"},
    "BEE": {"service_level": 75.0, "z_score": 0.67, "target_stockout_prob": 0.25, "description": "Medium Value, Easily Available, Essential Criticality"},
    "BED": {"service_level": 60.0, "z_score": 0.25, "target_stockout_prob": 0.40, "description": "Medium Value, Easily Available, Desirable Criticality"},

    "CSV": {"service_level": 95.0, "z_score": 1.64, "target_stockout_prob": 0.05, "description": "Low Value, Scarce Availability, Vital Criticality"},
    "CSE": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Low Value, Scarce Availability, Essential Criticality"},
    "CSD": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Low Value, Scarce Availability, Desirable Criticality"},
    "CDV": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Low Value, Difficult Availability, Vital Criticality"},
    "CDE": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Low Value, Difficult Availability, Essential Criticality"},
    "CDD": {"service_level": 90.0, "z_score": 1.28, "target_stockout_prob": 0.10, "description": "Low Value, Difficult Availability, Desirable Criticality"},
    "CEV": {"service_level": 80.0, "z_score": 0.84, "target_stockout_prob": 0.20, "description": "Low Value, Easily Available, Vital Criticality"},
    "CEE": {"service_level": 75.0, "z_score": 0.67, "target_stockout_prob": 0.25, "description": "Low Value, Easily Available, Essential Criticality"},
    "CED": {"service_level": 60.0, "z_score": 0.25, "target_stockout_prob": 0.40, "description": "Low Value, Easily Available, Desirable Criticality"},
}

def get_music3d_metadata(code: str) -> Optional[Dict[str, Any]]:
    """Retrieve service level, z-score, and target stockout prob for a code."""
    if not code or len(code) != 3:
        return None
    return MUSIC_3D_REFERENCE_TABLE.get(code.upper())

def compose_music3d_code(abc: Optional[str], sde: Optional[str], ved: Optional[str]) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Combine ABC, SDE, and VED into canonical 3-letter code.
    Returns (code, metadata) or (None, None) if incomplete.
    """
    if not abc or not sde or not ved:
        return None, None
    abc_clean = abc.strip().upper()
    sde_clean = sde.strip().upper()
    ved_clean = ved.strip().upper()
    
    if abc_clean not in ["A", "B", "C"]:
        return None, None
    if sde_clean not in ["S", "D", "E"]:
        return None, None
    if ved_clean not in ["V", "E", "D"]:
        return None, None
        
    code = f"{abc_clean}{sde_clean}{ved_clean}"
    meta = MUSIC_3D_REFERENCE_TABLE.get(code)
    return code, meta

def get_all_27_combinations() -> Dict[str, Dict[str, Any]]:
    """Return copy of all 27 combinations with breakdown."""
    result = {}
    for code, data in MUSIC_3D_REFERENCE_TABLE.items():
        result[code] = {
            "code": code,
            "abc": code[0],
            "sde": code[1],
            "ved": code[2],
            "service_level": data["service_level"],
            "z_score": data["z_score"],
            "target_stockout_prob": data["target_stockout_prob"],
            "target_stockout_prob_pct": round(data["target_stockout_prob"] * 100, 1),
            "description": data["description"]
        }
    return result
