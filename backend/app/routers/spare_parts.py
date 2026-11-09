"""
Spare Parts Router: CRUD, Search, Filter, Pagination, and Detailed Inspection
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.entities import (
    SparePart, PartClassification, InventoryMetric, Supplier,
    DemandHistory, StockTransaction, AssetPartLink
)
from app.schemas.api_schemas import SparePartCreate, SparePartUpdate
from app.services.music3d_engine import compose_music3d_code
from app.services.inventory_metrics import compute_part_metrics

router = APIRouter(prefix="/api/spare-parts", tags=["Spare Parts"])

@router.get("")
def list_spare_parts(
    search: Optional[str] = None,
    category: Optional[str] = None,
    abc_class: Optional[str] = None,
    sde_class: Optional[str] = None,
    ved_class: Optional[str] = None,
    music3d_code: Optional[str] = None,
    hml_class: Optional[str] = None,
    sos_class: Optional[str] = None,
    golf_class: Optional[str] = None,
    fsn_class: Optional[str] = None,
    stock_status: Optional[str] = None,
    min_stockout_risk: Optional[float] = None,
    max_stockout_risk: Optional[float] = None,
    sort_by: Optional[str] = "part_id",
    sort_desc: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(SparePart).join(PartClassification).join(InventoryMetric)

    # Search filter
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SparePart.part_id.ilike(search_fmt),
                SparePart.part_name.ilike(search_fmt),
                SparePart.supplier_id.ilike(search_fmt),
                SparePart.category.ilike(search_fmt)
            )
        )

    # Dimension filters
    if category:
        query = query.filter(SparePart.category == category)
    if abc_class:
        query = query.filter(PartClassification.abc_class == abc_class.upper())
    if sde_class:
        query = query.filter(PartClassification.sde_class == sde_class.upper())
    if ved_class:
        query = query.filter(PartClassification.ved_class == ved_class.upper())
    if music3d_code:
        query = query.filter(PartClassification.music3d_code == music3d_code.upper())
    if hml_class:
        query = query.filter(PartClassification.hml_class == hml_class.upper())
    if sos_class:
        query = query.filter(PartClassification.sos_class == sos_class.upper())
    if golf_class:
        query = query.filter(PartClassification.golf_class == golf_class.upper())
    if fsn_class:
        query = query.filter(PartClassification.fsn_class == fsn_class.upper())
    if stock_status:
        query = query.filter(InventoryMetric.stock_status == stock_status.upper())
    if min_stockout_risk is not None:
        query = query.filter(InventoryMetric.estimated_stockout_risk >= min_stockout_risk)
    if max_stockout_risk is not None:
        query = query.filter(InventoryMetric.estimated_stockout_risk <= max_stockout_risk)

    total_count = query.count()

    # Sorting
    sort_column = getattr(SparePart, sort_by, None)
    if not sort_column:
        sort_column = getattr(PartClassification, sort_by, None)
    if not sort_column:
        sort_column = getattr(InventoryMetric, sort_by, SparePart.part_id)

    if sort_desc:
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Pagination
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for sp in items:
        cls = sp.classification
        met = sp.metrics
        results.append({
            "part_id": sp.part_id,
            "part_name": sp.part_name,
            "category": sp.category,
            "annual_usage_units": sp.annual_usage_units,
            "unit_price_inr": sp.unit_price_inr,
            "annual_consumption_value_inr": sp.annual_consumption_value_inr,
            "current_stock_units": sp.current_stock_units,
            "lead_time_days": sp.lead_time_days,
            "supplier_id": sp.supplier_id,
            "legacy_criticality": sp.legacy_criticality,
            
            # Classification
            "abc_class": cls.abc_class if cls else "B",
            "sde_class": cls.sde_class if cls else "D",
            "ved_class": cls.ved_class if cls else "E",
            "music3d_code": cls.music3d_code if cls else "BDE",
            "service_level": cls.service_level if cls else 90.0,
            "z_score": cls.z_score if cls else 1.28,
            "target_stockout_prob": cls.target_stockout_probability if cls else 0.10,
            "target_stockout_prob_pct": round((cls.target_stockout_probability or 0.10) * 100, 1) if cls else 10.0,
            "hml_class": cls.hml_class if cls else "M",
            "sos_class": cls.sos_class if cls else "OS",
            "golf_class": cls.golf_class if cls else "O",
            "fsn_class": cls.fsn_class if cls else "S",
            "classification_status": cls.classification_status if cls else "AI_SUGGESTED",
            "confidence": cls.confidence if cls else 0.90,

            # Metrics
            "average_daily_demand": met.average_daily_demand if met else 0.0,
            "lead_time_demand": met.lead_time_demand if met else 0.0,
            "safety_stock": met.safety_stock if met else 0.0,
            "reorder_point": met.reorder_point if met else 0.0,
            "stock_cover_days": met.stock_cover_days if met else 0.0,
            "estimated_stockout_risk": met.estimated_stockout_risk if met else 0.0,
            "risk_gap": met.risk_gap if met else 0.0,
            "estimated_fill_rate": met.estimated_fill_rate if met else 100.0,
            "stock_status": met.stock_status if met else "HEALTHY",
            "data_source": sp.data_source
        })

    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
        "items": results
    }

@router.get("/{part_id}")
def get_spare_part_detail(part_id: str, db: Session = Depends(get_db)):
    sp = db.query(SparePart).filter(SparePart.part_id == part_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail=f"Spare part '{part_id}' not found.")

    cls = sp.classification
    met = sp.metrics
    supplier = db.query(Supplier).filter(Supplier.supplier_id == sp.supplier_id).first()
    
    # Demand history (12 months)
    dh = db.query(DemandHistory).filter(DemandHistory.part_id == part_id).order_by(DemandHistory.month).all()
    monthly_demands = [{"month": d.month, "demand": d.demand_quantity, "issues": d.issue_quantity} for d in dh]

    # Recent transactions
    txns = db.query(StockTransaction).filter(StockTransaction.part_id == part_id).order_by(desc(StockTransaction.transaction_date)).limit(10).all()
    txn_list = [{
        "date": t.transaction_date.isoformat() if t.transaction_date else None,
        "type": t.transaction_type,
        "quantity": t.quantity,
        "reference": t.reference,
        "remarks": t.remarks
    } for t in txns]

    # Linked assets
    links = db.query(AssetPartLink).filter(AssetPartLink.part_id == part_id).all()
    linked_assets = [{
        "asset_id": l.asset_id,
        "required_quantity": l.required_quantity,
        "asset_name": l.asset.asset_name if l.asset else "",
        "system": l.asset.system if l.asset else "",
        "criticality": l.asset.criticality if l.asset else ""
    } for l in links]

    return {
        "part_id": sp.part_id,
        "part_name": sp.part_name,
        "category": sp.category,
        "annual_usage_units": sp.annual_usage_units,
        "unit_price_inr": sp.unit_price_inr,
        "annual_consumption_value_inr": sp.annual_consumption_value_inr,
        "current_stock_units": sp.current_stock_units,
        "lead_time_days": sp.lead_time_days,
        "supplier_id": sp.supplier_id,
        "supplier": {
            "name": supplier.supplier_name if supplier else "General Vendor",
            "type": supplier.supplier_type if supplier else "Private",
            "golf": supplier.golf_category if supplier else "O",
            "location": supplier.location if supplier else "Domestic",
            "import_dependency": supplier.import_dependency if supplier else False,
            "reliability_score": supplier.reliability_score if supplier else 95.0
        } if supplier else None,
        "legacy_fields": {
            "criticality": sp.legacy_criticality,
            "consumption_class": sp.legacy_consumption_class,
            "lead_time_class": sp.legacy_lead_time_class,
            "music3d": sp.legacy_music3d,
            "recommendation": sp.legacy_recommendation
        },
        "classification": {
            "abc_class": cls.abc_class if cls else "B",
            "sde_class": cls.sde_class if cls else "D",
            "ved_class": cls.ved_class if cls else "E",
            "music3d_code": cls.music3d_code if cls else "BDE",
            "service_level": cls.service_level if cls else 90.0,
            "z_score": cls.z_score if cls else 1.28,
            "target_stockout_prob_pct": round((cls.target_stockout_probability or 0.10) * 100, 1) if cls else 10.0,
            "hml_class": cls.hml_class if cls else "M",
            "sos_class": cls.sos_class if cls else "OS",
            "golf_class": cls.golf_class if cls else "O",
            "fsn_class": cls.fsn_class if cls else "S",
            "status": cls.classification_status if cls else "AI_SUGGESTED",
            "reason": cls.classification_reason if cls else "",
            "safety_impact": cls.safety_impact if cls else "",
            "operational_impact": cls.operational_impact if cls else "",
            "approved_by": cls.approved_by if cls else None,
            "approved_at": cls.approved_at.isoformat() if cls and cls.approved_at else None,
            "confidence": cls.confidence if cls else 0.90
        },
        "metrics": {
            "average_daily_demand": met.average_daily_demand if met else 0.0,
            "demand_standard_deviation": met.demand_standard_deviation if met else 0.0,
            "lead_time_demand": met.lead_time_demand if met else 0.0,
            "safety_stock": met.safety_stock if met else 0.0,
            "reorder_point": met.reorder_point if met else 0.0,
            "stock_cover_days": met.stock_cover_days if met else 0.0,
            "estimated_stockout_risk": met.estimated_stockout_risk if met else 0.0,
            "risk_gap": met.risk_gap if met else 0.0,
            "estimated_fill_rate": met.estimated_fill_rate if met else 100.0,
            "stock_status": met.stock_status if met else "HEALTHY",
            "calculation_method": met.calculation_method if met else "",
            "calculation_assumptions": met.calculation_assumptions if met else ""
        },
        "monthly_demands": monthly_demands,
        "recent_transactions": txn_list,
        "linked_assets": linked_assets,
        "data_source": sp.data_source
    }
