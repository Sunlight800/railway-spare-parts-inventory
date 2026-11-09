"""
Railway Rolling Stock & Fixed Infrastructure Assets Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.database import get_db
from app.models.entities import Asset, AssetPartLink, SparePart, PartClassification, InventoryMetric
from app.schemas.api_schemas import AssetCreate

router = APIRouter(prefix="/api/assets", tags=["Assets"])

@router.get("")
def list_assets(db: Session = Depends(get_db)):
    """Lists all physical railway assets and their spare-part dependencies."""
    assets = db.query(Asset).all()
    results = []

    for a in assets:
        links = db.query(AssetPartLink).filter(AssetPartLink.asset_id == a.asset_id).all()
        linked_parts = []
        has_shortage = False
        vital_count = 0

        for l in links:
            sp = l.part
            if sp:
                cls = sp.classification
                met = sp.metrics
                ved = cls.ved_class if cls else "E"
                if ved == "V":
                    vital_count += 1
                curr_stock = sp.current_stock_units
                if curr_stock < l.required_quantity:
                    has_shortage = True

                linked_parts.append({
                    "part_id": sp.part_id,
                    "part_name": sp.part_name,
                    "category": sp.category,
                    "required_quantity": l.required_quantity,
                    "current_stock": curr_stock,
                    "ved_class": ved,
                    "music3d_code": cls.music3d_code if cls else "UNKNOWN",
                    "stockout_risk": met.estimated_stockout_risk if met else 0.0,
                    "status": "SHORTAGE" if curr_stock < l.required_quantity else "AVAILABLE"
                })

        results.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "asset_type": a.asset_type,
            "system": a.system,
            "location": a.location,
            "criticality": a.criticality,
            "status": a.status,
            "total_linked_parts": len(linked_parts),
            "vital_parts_count": vital_count,
            "has_shortage": has_shortage,
            "material_readiness_status": "SHORTAGE" if has_shortage else "READY",
            "linked_parts": linked_parts
        })

    return results

@router.post("")
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.asset_id == payload.asset_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset ID already exists.")

    asset = Asset(
        asset_id=payload.asset_id,
        asset_name=payload.asset_name,
        asset_type=payload.asset_type,
        system=payload.system,
        location=payload.location,
        criticality=payload.criticality
    )
    db.add(asset)
    db.commit()
    return {"status": "SUCCESS", "asset_id": asset.asset_id}
