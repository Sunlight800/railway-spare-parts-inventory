from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import datetime

# --- Spare Part Schemas ---
class SparePartBase(BaseModel):
    part_id: str
    part_name: str
    category: str
    annual_usage_units: float = 0.0
    unit_price_inr: float = 0.0
    current_stock_units: float = 0.0
    lead_time_days: int = 30
    supplier_id: Optional[str] = None
    legacy_criticality: Optional[str] = "Critical"

class SparePartCreate(SparePartBase):
    pass

class SparePartUpdate(BaseModel):
    part_name: Optional[str] = None
    category: Optional[str] = None
    annual_usage_units: Optional[float] = None
    unit_price_inr: Optional[float] = None
    current_stock_units: Optional[float] = None
    lead_time_days: Optional[int] = None
    supplier_id: Optional[str] = None
    legacy_criticality: Optional[str] = None

class ClassificationUpdate(BaseModel):
    ved_class: Optional[str] = None
    sde_class: Optional[str] = None
    classification_status: Optional[str] = "APPROVED"
    approved_by: Optional[str] = "Sr. Divisional Officer"
    notes: Optional[str] = None

class RecalculateThresholds(BaseModel):
    abc_a_threshold: float = 70.0
    abc_b_threshold: float = 90.0
    hml_h_threshold: float = 25000.0
    hml_m_threshold: float = 5000.0
    simulation_runs: int = 500

class SimulationRequest(BaseModel):
    scenario_name: Optional[str] = "Custom What-If Scenario"
    target_filter: Optional[str] = "ALL" # ALL, category name, or MUSIC-3D code
    demand_pct_change: float = 0.0
    lead_time_pct_change: float = 0.0
    stock_pct_change: float = 0.0
    supplier_delay_days: int = 0
    demand_cv_multiplier: float = 1.0
    safety_stock_multiplier: float = 1.0
    replenishment_units: float = 0.0
    simulation_runs: int = 500

class WorkPackageCreate(BaseModel):
    work_package_id: str
    title: str
    asset_id: str
    section: str
    description: Optional[str] = None
    estimated_duration_hours: float = 4.0
    due_date: Optional[datetime.datetime] = None
    priority: str = "HIGH"
    parts: List[Dict[str, Any]] = [] # [{"part_id": "...", "required_quantity": 2.0}]

class RescheduleBlockRequest(BaseModel):
    work_package_id: str
    new_date: datetime.datetime
    new_section: Optional[str] = None

class SupplierCreate(BaseModel):
    supplier_id: str
    supplier_name: str
    supplier_type: str = "Commercial Vendor"
    golf_category: str = "O"
    location: str = "Domestic - India"
    procurement_source: str = "Open Market"
    import_dependency: bool = False
    lead_time_avg_days: int = 30
    reliability_score: float = 95.0

class AssetCreate(BaseModel):
    asset_id: str
    asset_name: str
    asset_type: str
    system: str
    location: str = "Northern Railway"
    criticality: str = "Vital"
