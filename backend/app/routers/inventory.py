"""
Inventory Router: Health KPIs, Stockout Risk Analysis, and AI Recommendations
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Dict, Any, List

from app.database import get_db
from app.models.entities import SparePart, PartClassification, InventoryMetric
from app.services.recommendation_engine import generate_inventory_recommendations

router = APIRouter(prefix="/api/inventory", tags=["Inventory Health & Risk"])

@router.get("/health")
def get_inventory_health_kpis(db: Session = Depends(get_db)):
    """Executive KPIs and overall stock availability indicators."""
    total_parts = db.query(SparePart).count()
    total_qty = db.query(func.sum(SparePart.current_stock_units)).scalar() or 0.0
    total_inv_value = db.query(func.sum(SparePart.current_stock_units * SparePart.unit_price_inr)).scalar() or 0.0
    total_annual_spend = db.query(func.sum(SparePart.annual_consumption_value_inr)).scalar() or 0.0

    vital_count = db.query(PartClassification).filter(PartClassification.ved_class == "V").count()
    understock_count = db.query(InventoryMetric).filter(InventoryMetric.stock_status.in_(["UNDERSTOCK", "OUT_OF_STOCK"])).count()
    high_risk_count = db.query(InventoryMetric).filter(InventoryMetric.estimated_stockout_risk >= 30.0).count()
    
    # Zero stock vitals
    vital_zero_stock = db.query(SparePart).join(PartClassification).filter(
        PartClassification.ved_class == "V",
        SparePart.current_stock_units <= 0
    ).count()

    # Risk tiers
    low_risk = db.query(InventoryMetric).filter(InventoryMetric.estimated_stockout_risk < 10.0).count()
    medium_risk = db.query(InventoryMetric).filter(InventoryMetric.estimated_stockout_risk >= 10.0, InventoryMetric.estimated_stockout_risk < 30.0).count()
    critical_risk = db.query(InventoryMetric).filter(InventoryMetric.estimated_stockout_risk >= 30.0).count()

    # Stock status distribution
    status_records = db.query(InventoryMetric.stock_status, func.count(InventoryMetric.id)).group_by(InventoryMetric.stock_status).all()
    status_dist = {r[0]: r[1] for r in status_records}

    # Category breakdown of inventory value
    cat_records = db.query(
        SparePart.category,
        func.count(SparePart.id),
        func.sum(SparePart.current_stock_units * SparePart.unit_price_inr),
        func.sum(SparePart.annual_consumption_value_inr)
    ).group_by(SparePart.category).all()
    
    cat_breakdown = [
        {
            "category": r[0],
            "part_count": r[1],
            "inventory_value_inr": round(float(r[2] or 0.0), 2),
            "annual_consumption_inr": round(float(r[3] or 0.0), 2)
        }
        for r in cat_records
    ]

    # Availability index: items where stock >= reorder point
    healthy_items = db.query(InventoryMetric).filter(InventoryMetric.stock_status == "HEALTHY").count()
    availability_index_pct = round((healthy_items / total_parts * 100.0) if total_parts > 0 else 0, 1)

    return {
        "kpis": {
            "total_spare_parts": total_parts,
            "total_inventory_quantity": round(total_qty, 0),
            "total_inventory_value_inr": round(total_inv_value, 2),
            "total_annual_spend_inr": round(total_annual_spend, 2),
            "total_vital_parts": vital_count,
            "parts_below_reorder_point": understock_count,
            "parts_high_stockout_risk": high_risk_count,
            "vital_parts_zero_stock": vital_zero_stock,
            "overall_availability_index_pct": availability_index_pct
        },
        "risk_distribution": {
            "low_risk_count": low_risk,
            "medium_risk_count": medium_risk,
            "critical_risk_count": critical_risk
        },
        "stock_status_distribution": status_dist,
        "category_breakdown": cat_breakdown
    }

@router.get("/stockout-risk")
def get_stockout_risk_details(db: Session = Depends(get_db)):
    """Returns actual estimated risk vs target risk comparison and top vulnerable parts."""
    parts = db.query(SparePart).join(PartClassification).join(InventoryMetric)\
              .order_by(desc(InventoryMetric.estimated_stockout_risk)).limit(30).all()

    top_vulnerable = []
    for p in parts:
        cls = p.classification
        met = p.metrics
        top_vulnerable.append({
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "music3d_code": cls.music3d_code if cls else "UNKNOWN",
            "ved_class": cls.ved_class if cls else "E",
            "sde_class": cls.sde_class if cls else "D",
            "current_stock_units": p.current_stock_units,
            "reorder_point": met.reorder_point if met else 0.0,
            "lead_time_days": p.lead_time_days,
            "target_service_level": cls.service_level if cls else 95.0,
            "target_stockout_prob_pct": round((cls.target_stockout_probability or 0.05) * 100.0, 1) if cls else 5.0,
            "actual_estimated_risk_pct": met.estimated_stockout_risk if met else 0.0,
            "risk_gap_pct": met.risk_gap if met else 0.0,
            "stock_cover_days": met.stock_cover_days if met else 0.0,
            "stock_status": met.stock_status if met else "HEALTHY"
        })

    # Group average risk by MUSIC-3D primary letter (A, B, C and V, E, D)
    ved_risks = db.query(PartClassification.ved_class, func.avg(InventoryMetric.estimated_stockout_risk))\
                  .join(InventoryMetric, InventoryMetric.part_id == PartClassification.part_id)\
                  .group_by(PartClassification.ved_class).all()
    ved_risk_map = {r[0]: round(float(r[1] or 0.0), 1) for r in ved_risks if r[0]}

    return {
        "top_vulnerable_parts": top_vulnerable,
        "ved_average_risk": ved_risk_map
    }

@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    """Generates explainable, evidence-backed AI recommendations."""
    parts = db.query(SparePart).join(PartClassification).join(InventoryMetric).all()
    
    parts_data = []
    for p in parts:
        cls = p.classification
        met = p.metrics
        parts_data.append({
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "annual_usage_units": p.annual_usage_units,
            "unit_price_inr": p.unit_price_inr,
            "current_stock_units": p.current_stock_units,
            "lead_time_days": p.lead_time_days,
            "abc_class": cls.abc_class if cls else "B",
            "sde_class": cls.sde_class if cls else "D",
            "ved_class": cls.ved_class if cls else "E",
            "music3d_code": cls.music3d_code if cls else "BDE",
            "hml_class": cls.hml_class if cls else "M",
            "sos_class": cls.sos_class if cls else "OS",
            "golf_class": cls.golf_class if cls else "O",
            "fsn_class": cls.fsn_class if cls else "S",
            "service_level": cls.service_level if cls else 90.0,
            "target_stockout_prob_pct": round((cls.target_stockout_probability or 0.10) * 100, 1) if cls else 10.0,
            "reorder_point": met.reorder_point if met else 0.0,
            "safety_stock": met.safety_stock if met else 0.0,
            "lead_time_demand": met.lead_time_demand if met else 0.0,
            "stock_cover_days": met.stock_cover_days if met else 0.0,
            "estimated_stockout_risk": met.estimated_stockout_risk if met else 0.0,
            "risk_gap": met.risk_gap if met else 0.0
        })

    recs = generate_inventory_recommendations(parts_data)
    
    critical_recs = [r for r in recs if r["priority"] == "CRITICAL"]
    high_recs = [r for r in recs if r["priority"] == "HIGH"]
    medium_recs = [r for r in recs if r["priority"] == "MEDIUM"]

    return {
        "total_recommendations": len(recs),
        "counts": {
            "critical": len(critical_recs),
            "high": len(high_recs),
            "medium": len(medium_recs)
        },
        "recommendations": recs
    }
