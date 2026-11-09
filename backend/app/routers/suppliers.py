"""
Suppliers and Procurement Intelligence Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Dict, Any, List

from app.database import get_db
from app.models.entities import Supplier, SparePart, PartClassification, InventoryMetric
from app.schemas.api_schemas import SupplierCreate

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])

@router.get("")
def list_suppliers(db: Session = Depends(get_db)):
    """Lists all suppliers with GOLF classification, parts count, and risk profile."""
    suppliers = db.query(Supplier).all()
    results = []

    for s in suppliers:
        parts_supplied = db.query(SparePart).filter(SparePart.supplier_id == s.supplier_id).all()
        pids = [p.part_id for p in parts_supplied]
        
        # Check vital parts supplied
        vital_count = db.query(PartClassification).filter(
            PartClassification.part_id.in_(pids),
            PartClassification.ved_class == "V"
        ).count() if pids else 0

        # High risk parts count
        high_risk_count = db.query(InventoryMetric).filter(
            InventoryMetric.part_id.in_(pids),
            InventoryMetric.estimated_stockout_risk >= 30.0
        ).count() if pids else 0

        results.append({
            "supplier_id": s.supplier_id,
            "supplier_name": s.supplier_name,
            "supplier_type": s.supplier_type,
            "golf_category": s.golf_category,
            "location": s.location,
            "procurement_source": s.procurement_source,
            "import_dependency": s.import_dependency,
            "approved_status": s.approved_status,
            "lead_time_avg_days": s.lead_time_avg_days,
            "lead_time_variance_days": s.lead_time_variance_days,
            "reliability_score": s.reliability_score,
            "parts_count": len(parts_supplied),
            "vital_parts_count": vital_count,
            "high_risk_parts_count": high_risk_count
        })

    return results

@router.post("")
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    existing = db.query(Supplier).filter(Supplier.supplier_id == payload.supplier_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier ID already exists.")

    sup = Supplier(
        supplier_id=payload.supplier_id,
        supplier_name=payload.supplier_name,
        supplier_type=payload.supplier_type,
        golf_category=payload.golf_category.upper(),
        location=payload.location,
        procurement_source=payload.procurement_source,
        import_dependency=payload.import_dependency,
        lead_time_avg_days=payload.lead_time_avg_days,
        reliability_score=payload.reliability_score
    )
    db.add(sup)
    db.commit()
    return {"status": "SUCCESS", "supplier_id": sup.supplier_id}
