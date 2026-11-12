"""
Spare Parts Router: CRUD, Search, Filter, Pagination, and Detailed Inspection
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
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
from app.services.classification_engine import (
    classify_sde, classify_ved, classify_hml, classify_sos, classify_golf, classify_fsn
)

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

@router.post("", status_code=201)
def create_spare_part(payload: SparePartCreate, db: Session = Depends(get_db)):
    """Creates a new spare part record and computes initial classifications and metrics."""
    pid = payload.part_id.strip()
    existing = db.query(SparePart).filter(SparePart.part_id == pid).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Spare part ID '{pid}' already exists.")

    usage = max(0.0, float(payload.annual_usage_units))
    price = max(0.0, float(payload.unit_price_inr))
    spend = round(usage * price, 2)
    stock = max(0.0, float(payload.current_stock_units))
    lt = max(1, int(payload.lead_time_days))

    # Determine initial ABC class based on consumption spend
    if spend >= 500000:
        abc_cls = "A"
    elif spend >= 100000:
        abc_cls = "B"
    else:
        abc_cls = "C"

    sde_cls, sde_reason = classify_sde(supplier_count=2, alternate_supplier_count=1, lead_time_days=lt)
    ved_cls, ved_reason = classify_ved(payload.category, payload.part_name, payload.legacy_criticality)
    code, meta = compose_music3d_code(abc_cls, sde_cls, ved_cls)
    hml_cls, _ = classify_hml(price)
    sos_cls, _ = classify_sos(None, payload.category, payload.part_name)
    golf_cls, _ = classify_golf("Domestic", "Private", False)
    fsn_cls, _ = classify_fsn(12, 1)

    sl = meta["service_level"] if meta else 90.0
    z = meta["z_score"] if meta else 1.28
    target_prob = meta["target_stockout_prob"] if meta else 0.10

    metrics = compute_part_metrics(
        annual_usage=usage,
        lead_time_days=lt,
        current_stock=stock,
        z_score=z,
        service_level=sl
    )

    sp = SparePart(
        part_id=pid,
        part_name=payload.part_name.strip(),
        category=payload.category.strip(),
        annual_usage_units=usage,
        unit_price_inr=price,
        annual_consumption_value_inr=spend,
        current_stock_units=stock,
        lead_time_days=lt,
        supplier_id=payload.supplier_id.strip() if payload.supplier_id else "SUP-001",
        legacy_criticality=payload.legacy_criticality or "Critical",
        data_source="User Registered Part"
    )
    db.add(sp)

    cls_obj = PartClassification(
        part_id=pid,
        abc_class=abc_cls,
        sde_class=sde_cls,
        ved_class=ved_cls,
        music3d_code=code,
        service_level=sl,
        z_score=z,
        target_stockout_probability=target_prob,
        hml_class=hml_cls,
        sos_class=sos_cls,
        golf_class=golf_cls,
        fsn_class=fsn_cls,
        classification_status="AI_SUGGESTED",
        classification_reason="Computed on creation"
    )
    db.add(cls_obj)

    met_obj = InventoryMetric(
        part_id=pid,
        average_daily_demand=metrics["average_daily_demand"],
        lead_time_demand=metrics["lead_time_demand"],
        safety_stock=metrics["safety_stock"],
        reorder_point=metrics["reorder_point"],
        stock_cover_days=metrics["stock_cover_days"],
        target_stockout_probability=metrics["target_stockout_prob"],
        estimated_stockout_risk=metrics["estimated_stockout_risk"],
        risk_gap=metrics["risk_gap"],
        estimated_fill_rate=metrics["estimated_fill_rate"],
        stock_status=metrics["stock_status"]
    )
    db.add(met_obj)

    txn = StockTransaction(
        part_id=pid,
        transaction_type="RECEIPT",
        quantity=stock,
        reference="REGISTRATION",
        remarks="Initial stock registration"
    )
    db.add(txn)

    db.commit()
    db.refresh(sp)
    return {"status": "SUCCESS", "part_id": sp.part_id, "message": "Spare part created successfully."}

@router.put("/{part_id}")
def update_spare_part(part_id: str, payload: SparePartUpdate, db: Session = Depends(get_db)):
    """Updates spare part attributes and recalculates consumption value and metrics."""
    sp = db.query(SparePart).filter(SparePart.part_id == part_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail=f"Spare part '{part_id}' not found.")

    old_stock = sp.current_stock_units
    if payload.part_name is not None:
        sp.part_name = payload.part_name.strip()
    if payload.category is not None:
        sp.category = payload.category.strip()
    if payload.annual_usage_units is not None:
        sp.annual_usage_units = max(0.0, float(payload.annual_usage_units))
    if payload.unit_price_inr is not None:
        sp.unit_price_inr = max(0.0, float(payload.unit_price_inr))
    if payload.current_stock_units is not None:
        sp.current_stock_units = max(0.0, float(payload.current_stock_units))
    if payload.lead_time_days is not None:
        sp.lead_time_days = max(1, int(payload.lead_time_days))
    if payload.supplier_id is not None:
        sp.supplier_id = payload.supplier_id.strip()
    if payload.legacy_criticality is not None:
        sp.legacy_criticality = payload.legacy_criticality

    sp.annual_consumption_value_inr = round(sp.annual_usage_units * sp.unit_price_inr, 2)

    # Record transaction if stock changed
    if payload.current_stock_units is not None and payload.current_stock_units != old_stock:
        delta = sp.current_stock_units - old_stock
        txn = StockTransaction(
            part_id=part_id,
            transaction_type="ADJUSTMENT" if delta > 0 else "ISSUE",
            quantity=abs(delta),
            reference="INVENTORY_UPDATE",
            remarks=f"Stock manually changed from {old_stock} to {sp.current_stock_units}"
        )
        db.add(txn)

    # Recalculate metrics
    cls_obj = sp.classification
    met_obj = sp.metrics

    sl = cls_obj.service_level if cls_obj and cls_obj.service_level else 90.0
    z = cls_obj.z_score if cls_obj and cls_obj.z_score else 1.28

    metrics = compute_part_metrics(
        annual_usage=sp.annual_usage_units,
        lead_time_days=sp.lead_time_days,
        current_stock=sp.current_stock_units,
        z_score=z,
        service_level=sl
    )

    if met_obj:
        met_obj.average_daily_demand = metrics["average_daily_demand"]
        met_obj.lead_time_demand = metrics["lead_time_demand"]
        met_obj.safety_stock = metrics["safety_stock"]
        met_obj.reorder_point = metrics["reorder_point"]
        met_obj.stock_cover_days = metrics["stock_cover_days"]
        met_obj.estimated_stockout_risk = metrics["estimated_stockout_risk"]
        met_obj.risk_gap = metrics["risk_gap"]
        met_obj.estimated_fill_rate = metrics["estimated_fill_rate"]
        met_obj.stock_status = metrics["stock_status"]

    db.commit()
    return {"status": "SUCCESS", "part_id": sp.part_id, "message": "Spare part updated successfully."}

@router.delete("/{part_id}")
def delete_spare_part(part_id: str, db: Session = Depends(get_db)):
    """Deletes a spare part and its associated metric and classification records."""
    sp = db.query(SparePart).filter(SparePart.part_id == part_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail=f"Spare part '{part_id}' not found.")

    db.query(PartClassification).filter(PartClassification.part_id == part_id).delete()
    db.query(InventoryMetric).filter(InventoryMetric.part_id == part_id).delete()
    db.query(DemandHistory).filter(DemandHistory.part_id == part_id).delete()
    db.query(StockTransaction).filter(StockTransaction.part_id == part_id).delete()
    db.query(AssetPartLink).filter(AssetPartLink.part_id == part_id).delete()
    db.delete(sp)
    db.commit()
    return {"status": "SUCCESS", "message": f"Spare part '{part_id}' deleted successfully."}

@router.patch("/{part_id}/stock")
def quick_update_stock(part_id: str, quantity: float = Body(..., embed=True), db: Session = Depends(get_db)):
    """Fast stock adjustment endpoint for depot engineers."""
    sp = db.query(SparePart).filter(SparePart.part_id == part_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail=f"Spare part '{part_id}' not found.")

    old_stock = sp.current_stock_units
    sp.current_stock_units = max(0.0, float(quantity))
    delta = sp.current_stock_units - old_stock

    txn = StockTransaction(
        part_id=part_id,
        transaction_type="ADJUSTMENT" if delta >= 0 else "ISSUE",
        quantity=abs(delta),
        reference="QUICK_STOCK_ADJUST",
        remarks=f"Stock adjusted from {old_stock} to {sp.current_stock_units}"
    )
    db.add(txn)

    cls_obj = sp.classification
    met_obj = sp.metrics

    sl = cls_obj.service_level if cls_obj and cls_obj.service_level else 90.0
    z = cls_obj.z_score if cls_obj and cls_obj.z_score else 1.28

    metrics = compute_part_metrics(
        annual_usage=sp.annual_usage_units,
        lead_time_days=sp.lead_time_days,
        current_stock=sp.current_stock_units,
        z_score=z,
        service_level=sl
    )

    if met_obj:
        met_obj.average_daily_demand = metrics["average_daily_demand"]
        met_obj.lead_time_demand = metrics["lead_time_demand"]
        met_obj.safety_stock = metrics["safety_stock"]
        met_obj.reorder_point = metrics["reorder_point"]
        met_obj.stock_cover_days = metrics["stock_cover_days"]
        met_obj.estimated_stockout_risk = metrics["estimated_stockout_risk"]
        met_obj.risk_gap = metrics["risk_gap"]
        met_obj.estimated_fill_rate = metrics["estimated_fill_rate"]
        met_obj.stock_status = metrics["stock_status"]

    db.commit()
    return {
        "status": "SUCCESS",
        "part_id": sp.part_id,
        "new_stock": sp.current_stock_units,
        "stock_status": met_obj.stock_status if met_obj else "HEALTHY",
        "estimated_stockout_risk": met_obj.estimated_stockout_risk if met_obj else 0.0
    }
