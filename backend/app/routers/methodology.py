"""
Methodology & Learning Guide Router: Curriculum Reference and LSCM Formulations
"""

from fastapi import APIRouter
from app.services.music3d_engine import get_all_27_combinations

router = APIRouter(prefix="/api/methodology", tags=["Methodology"])

@router.get("/reference-table")
def get_methodology_reference():
    """Returns official course reference tables, mathematical formulas, and viva worked examples."""
    all_27 = get_all_27_combinations()
    
    return {
        "title": "Logistics & Supply Chain Management (LSCM) - MUSIC-3D Theory & Selective Control Systems",
        "model_overview": {
            "name": "MUSIC-3D Model (Multi-Unit Selective Inventory Control - 3 Dimensional)",
            "dimension_1": {
                "name": "ABC Analysis",
                "basis": "Annual Consumption Value (Expenditure Pareto Distribution)",
                "classes": {
                    "A": "High annual usage value (Top ~10-15% items accounting for ~70% cumulative expenditure)",
                    "B": "Medium annual usage value (Next ~20-25% items accounting for ~20% cumulative expenditure)",
                    "C": "Low annual usage value (Remaining ~60-70% items accounting for ~10% cumulative expenditure)"
                },
                "formula": "Annual Consumption Value = Annual Usage Quantity × Unit Price"
            },
            "dimension_2": {
                "name": "SDE Analysis",
                "basis": "Availability & Procurement Difficulty",
                "classes": {
                    "S": "Scarce (Single/sole source, import dependency, specialized OEM, extreme supply constraints)",
                    "D": "Difficult to obtain (Limited approved vendors, moderate lead-time variability, domestic specialized)",
                    "E": "Easily available (Standard open market or local zonal depot vendors, readily off-the-shelf)"
                }
            },
            "dimension_3": {
                "name": "VED Analysis",
                "basis": "Operational & Functional Criticality (Consequence of Stockout)",
                "classes": {
                    "V": "Vital (Absence directly halts train movement or breaches passenger safety standards)",
                    "E": "Essential (Causes operational disruption; temporary bypass or buffer permissible)",
                    "D": "Desirable (Auxiliary/comfort component; absence does not affect core operations)"
                }
            }
        },
        "complementary_classifications": [
            {"technique": "HML", "basis": "Unit Price of Spare Part", "classes": "H (High Cost), M (Medium Cost), L (Low Cost)"},
            {"technique": "SOS", "basis": "Seasonality in Demand/Supply", "classes": "S (Seasonal Spikes), OS (Off-Seasonal Uniform)"},
            {"technique": "GOLF", "basis": "Procurement Channel & Geographic Origin", "classes": "G (Govt/PSU), O (Open Market), L (Local Workshop), F (Foreign/Imported)"},
            {"technique": "FSN", "basis": "Store Movement & Issue Frequency", "classes": "F (Fast Moving), S (Slow Moving), N (Non-Moving / Dormant Dead Stock)"}
        ],
        "formulas": [
            {"name": "Average Daily Demand (d)", "formula": "Annual Usage Units / 365"},
            {"name": "Expected Lead Time Demand (LTD)", "formula": "Average Daily Demand × Lead Time Days"},
            {"name": "Safety Stock (SS)", "formula": "Z × σ_d × √Lead Time Days (Normal Independent Demand)"},
            {"name": "Reorder Point (ROP)", "formula": "Lead Time Demand + Safety Stock"},
            {"name": "Stock Coverage Days", "formula": "Current Stock Units / Average Daily Demand"},
            {"name": "Target Stockout Probability", "formula": "1 − Target Service Level"},
            {"name": "Estimated Actual Stockout Risk", "formula": "(Stockout Runs in Monte Carlo Simulation / Total Simulation Runs) × 100%"},
            {"name": "Risk Gap", "formula": "Estimated Actual Stockout Risk − (Target Stockout Probability × 100%)"},
            {"name": "Fill Rate", "formula": "Total Fulfilled Simulated Demand / Total Simulated Demand"}
        ],
        "worked_example": {
            "part_name": "High-Voltage Pantograph Carbon Contact Strip (RSP-0005)",
            "annual_usage": 150,
            "unit_price_inr": 8500.00,
            "lead_time_days": 40,
            "current_stock": 12,
            "abc": "A (High consumption spend)",
            "sde": "S (Imported carbon technology from Austria)",
            "ved": "V (Vital for electric traction current collection)",
            "music3d_code": "ASV",
            "target_service_level": "99.0%",
            "z_score": 2.32,
            "target_stockout_probability": "1.0% (0.01)",
            "daily_demand": "0.411 units/day",
            "lead_time_demand": "16.44 units",
            "safety_stock": "2.32 × (0.411 × 0.30) × √40 = 3.21 units",
            "reorder_point": "16.44 + 3.21 = 19.65 units",
            "conclusion": "Since current stock (12 units) is below ROP (19.65 units), Monte Carlo simulation detects an elevated stockout risk of 28.4% against target 1.0% (Risk Gap: +27.4%), triggering an immediate emergency replenishment recommendation."
        },
        "all_27_combinations": all_27
    }
