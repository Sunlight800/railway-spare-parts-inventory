import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(50), unique=True, index=True, nullable=False)
    part_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    annual_usage_units = Column(Float, nullable=False, default=0.0)
    unit_price_inr = Column(Float, nullable=False, default=0.0)
    annual_consumption_value_inr = Column(Float, nullable=False, default=0.0)
    current_stock_units = Column(Float, nullable=False, default=0.0)
    lead_time_days = Column(Integer, nullable=False, default=30)
    supplier_id = Column(String(50), index=True)
    
    # Legacy workbook fields for reference
    legacy_criticality = Column(String(50))
    legacy_consumption_class = Column(String(20))
    legacy_lead_time_class = Column(String(20))
    legacy_music3d = Column(String(50))
    legacy_recommendation = Column(Text)
    
    data_source = Column(String(50), default="Synthetic Demo Dataset")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    classification = relationship("PartClassification", back_populates="part", uselist=False, cascade="all, delete-orphan")
    metrics = relationship("InventoryMetric", back_populates="part", uselist=False, cascade="all, delete-orphan")
    demand_history = relationship("DemandHistory", back_populates="part", cascade="all, delete-orphan")
    transactions = relationship("StockTransaction", back_populates="part", cascade="all, delete-orphan")
    work_package_links = relationship("WorkPackagePart", back_populates="part")
    asset_links = relationship("AssetPartLink", back_populates="part")


class PartClassification(Base):
    __tablename__ = "part_classifications"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), unique=True, index=True, nullable=False)
    
    # MUSIC-3D Primary Dimensions
    abc_class = Column(String(1), index=True)   # A, B, C
    sde_class = Column(String(1), index=True)   # S, D, E
    ved_class = Column(String(1), index=True)   # V, E, D
    music3d_code = Column(String(10), index=True) # e.g. ASV, BED
    
    # Course Mapping
    service_level = Column(Float)               # e.g. 99.0, 95.0, 90.0
    z_score = Column(Float)                     # e.g. 2.32, 1.64, 1.28
    target_stockout_probability = Column(Float) # 1 - service_level / 100
    
    # Complementary Selective Control Classifications
    hml_class = Column(String(1), index=True)   # H, M, L
    sos_class = Column(String(2), index=True)   # S, OS
    golf_class = Column(String(1), index=True)  # G, O, L, F
    fsn_class = Column(String(1), index=True)   # F, S, N
    
    # Evaluation Metadata & Provenance
    classification_status = Column(String(30), default="AI_SUGGESTED") # AI_SUGGESTED, APPROVED, PENDING
    classification_reason = Column(Text)
    safety_impact = Column(String(100))
    operational_impact = Column(String(100))
    service_impact = Column(String(100))
    procurement_difficulty = Column(String(100))
    supplier_count = Column(Integer, default=1)
    alternate_supplier_count = Column(Integer, default=0)
    confidence = Column(Float, default=0.90)
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    part = relationship("SparePart", back_populates="classification")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(String(50), unique=True, index=True, nullable=False)
    supplier_name = Column(String(200), nullable=False)
    supplier_type = Column(String(50), default="Private Manufacturer")
    golf_category = Column(String(1), default="O") # G, O, L, F
    location = Column(String(100), default="Domestic - India")
    procurement_source = Column(String(100), default="Open Market Vendor")
    import_dependency = Column(Boolean, default=False)
    approved_status = Column(String(50), default="Approved Railway Vendor")
    lead_time_avg_days = Column(Integer, default=30)
    lead_time_variance_days = Column(Integer, default=5)
    reliability_score = Column(Float, default=92.5)
    contact_email = Column(String(100), default="procurement@vendor.in")
    notes = Column(Text)


class InventoryMetric(Base):
    __tablename__ = "inventory_metrics"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), unique=True, index=True, nullable=False)
    
    average_daily_demand = Column(Float, default=0.0)
    demand_standard_deviation = Column(Float, default=0.0)
    lead_time_demand = Column(Float, default=0.0)
    safety_stock = Column(Float, default=0.0)
    reorder_point = Column(Float, default=0.0)
    stock_cover_days = Column(Float, default=0.0)
    
    target_stockout_probability = Column(Float, default=0.05) # e.g. 0.01 for ASV (99%)
    estimated_stockout_risk = Column(Float, default=0.0)     # percentage, e.g. 12.4%
    risk_gap = Column(Float, default=0.0)                    # percentage points
    estimated_fill_rate = Column(Float, default=95.0)        # percentage
    
    stock_status = Column(String(30), default="HEALTHY")     # HEALTHY, UNDERSTOCK, STOCKOUT, OVERSTOCK
    calculation_method = Column(String(100), default="Monte Carlo Simulation (N=500)")
    calculation_assumptions = Column(Text)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    part = relationship("SparePart", back_populates="metrics")


class DemandHistory(Base):
    __tablename__ = "demand_history"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), index=True, nullable=False)
    month = Column(Integer, nullable=False) # 1 - 12
    year = Column(Integer, nullable=False, default=2026)
    demand_quantity = Column(Float, nullable=False, default=0.0)
    issue_quantity = Column(Float, nullable=False, default=0.0)
    data_source = Column(String(50), default="Synthetic Historical Profile")

    part = relationship("SparePart", back_populates="demand_history")


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), index=True, nullable=False)
    transaction_date = Column(DateTime, default=datetime.datetime.utcnow)
    transaction_type = Column(String(30), nullable=False) # ISSUE, RECEIPT, ADJUSTMENT
    quantity = Column(Float, nullable=False)
    reference = Column(String(100))
    remarks = Column(Text)

    part = relationship("SparePart", back_populates="transactions")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, index=True, nullable=False)
    asset_name = Column(String(200), nullable=False)
    asset_type = Column(String(100), nullable=False) # Electric Locomotive, LHB Passenger Coach, Bogie Freight Wagon, OHE Catenary, Solid State Interlocking, Track Tamping Machine
    system = Column(String(100), nullable=False, index=True) # Braking, Pneumatic, Electrical, Bogie, Mechanical, Control, Coupling, Door, General
    location = Column(String(100), default="Northern Railway - Ghaziabad Depot")
    criticality = Column(String(20), default="Vital")
    status = Column(String(50), default="OPERATIONAL") # OPERATIONAL, UNDER_MAINTENANCE, AWAITING_PARTS
    data_source = Column(String(50), default="Demonstration Asset Register")

    parts = relationship("AssetPartLink", back_populates="asset", cascade="all, delete-orphan")
    work_packages = relationship("MaintenanceWorkPackage", back_populates="asset")


class AssetPartLink(Base):
    __tablename__ = "asset_part_links"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), index=True, nullable=False)
    required_quantity = Column(Float, default=1.0)
    notes = Column(String(200))

    asset = relationship("Asset", back_populates="parts")
    part = relationship("SparePart", back_populates="asset_links")


class MaintenanceWorkPackage(Base):
    __tablename__ = "maintenance_work_packages"

    id = Column(Integer, primary_key=True, index=True)
    work_package_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    section = Column(String(100), default="Ghaziabad - Kanpur Main Line")
    description = Column(Text)
    estimated_duration_hours = Column(Float, default=4.0)
    due_date = Column(DateTime)
    priority = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), default="READY") # READY, PARTIALLY_READY, NOT_READY, REVIEW_REQUIRED
    recommendation_score = Column(Float, default=85.0)
    scheduled_block_date = Column(DateTime)
    notes = Column(Text)

    asset = relationship("Asset", back_populates="work_packages")
    required_parts = relationship("WorkPackagePart", back_populates="work_package", cascade="all, delete-orphan")


class WorkPackagePart(Base):
    __tablename__ = "work_package_parts"

    id = Column(Integer, primary_key=True, index=True)
    work_package_id = Column(String(50), ForeignKey("maintenance_work_packages.work_package_id"), index=True, nullable=False)
    part_id = Column(String(50), ForeignKey("spare_parts.part_id"), index=True, nullable=False)
    required_quantity = Column(Float, default=1.0)

    work_package = relationship("MaintenanceWorkPackage", back_populates="required_parts")
    part = relationship("SparePart", back_populates="work_package_links")


class BlockWindow(Base):
    __tablename__ = "block_windows"

    id = Column(Integer, primary_key=True, index=True)
    window_name = Column(String(100), nullable=False)
    section = Column(String(100), nullable=False)
    date = Column(DateTime, nullable=False)
    start_time = Column(String(10)) # e.g. "01:30"
    end_time = Column(String(10))   # e.g. "05:30"
    window_status = Column(String(50), default="INDICATIVE_AVAILABLE")
    source = Column(String(100), default="Indicative Maintenance Planning Window")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    scenario_name = Column(String(100), nullable=False)
    selected_parts_filter = Column(String(100), default="ALL")
    assumptions_json = Column(JSON)
    simulation_count = Column(Integer, default=500)
    results_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DataImport(Base):
    __tablename__ = "data_imports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(200), nullable=False)
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)
    record_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    import_status = Column(String(50), default="SUCCESS")
    details_json = Column(JSON)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), default="demo_engineer")
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(Text)
