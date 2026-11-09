"""
Classification Router: All 27 MUSIC-3D combinations, Pareto curves, and Selective Control analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
import datetime

from app.database import get_db
from app.models.entities import SparePart, PartClassification, InventoryMetric, DemandHistory
from app.services.music3d_engine import (
    get_all_27_combinations, get_music3d_metadata, compose_music3d_code
)
from app.services.classification_engine import (
    calculate_abc_classes, classify_hml
)
from app.services.inventory_metrics import compute_part_metrics
from app.schemas.api_schemas import ClassificationUpdate, RecalculateThresholds

router = APIRouter(prefix="/api/classifications", tags=["Classifications"])

@router.get("/summary")
def get_classification_summary(db: Session = Depends(get_db)):
    """Summary counts, spend, and shares for all 7 selective control methods."""
    total_parts = db.query(SparePart).count()
    total_spend = db.query(func.sum(SparePart.annual_consumption_value_inr)).scalar() or 0.0
    total_inventory_value = db.query(func.sum(SparePart.current_stock_units * SparePart.unit_price_inr)).scalar() or 0.0

    def get_counts(column):
        records = db.query(column, func.count(SparePart.id), func.sum(SparePart.annual_consumption_value_inr)).join(SparePart).group_by(column).all()
        return [
            {
                "category": r[0] if r[0] is not None else "Pending",
                "count": r[1],
                "percentage_items": round((r[1] / total_parts * 100.0) if total_parts > 0 else 0, 1),
                "total_spend_inr": round(float(r[2] or 0.0), 2),
                "spend_share_pct": round((float(r[2] or 0.0) / total_spend * 100.0) if total_spend > 0 else 0, 1)
            }
            for r in records
        ]

    return {
        "total_parts": total_parts,
        "total_annual_spend_inr": round(total_spend, 2),
        "total_inventory_value_inr": round(total_inventory_value, 2),
        "abc": get_counts(PartClassification.abc_class),
        "sde": get_counts(PartClassification.sde_class),
        "ved": get_counts(PartClassification.ved_class),
        "hml": get_counts(PartClassification.hml_class),
        "sos": get_counts(PartClassification.sos_class),
        "golf": get_counts(PartClassification.golf_class),
        "fsn": get_counts(PartClassification.fsn_class),
        "approved_count": db.query(PartClassification).filter(PartClassification.classification_status == "APPROVED").count(),
        "ai_suggested_count": db.query(PartClassification).filter(PartClassification.classification_status == "AI_SUGGESTED").count(),
        "pending_count": db.query(PartClassification).filter(PartClassification.classification_status == "PENDING").count()
    }

@router.get("/music3d")
def get_music3d_matrix(db: Session = Depends(get_db)):
    """
    Returns the complete 27-cell MUSIC-3D matrix with populated aggregations.
    Guarantees every cell exists even if count is 0.
    """
    all_27 = get_all_27_combinations()
    
    # Query database groupings
    data = db.query(
        PartClassification.music3d_code,
        func.count(SparePart.id),
        func.sum(SparePart.annual_consumption_value_inr),
        func.sum(SparePart.current_stock_units),
        func.avg(InventoryMetric.estimated_stockout_risk),
        func.avg(InventoryMetric.stock_cover_days)
    ).join(SparePart, SparePart.part_id == PartClassification.part_id)\
     .join(InventoryMetric, InventoryMetric.part_id == PartClassification.part_id)\
     .group_by(PartClassification.music3d_code).all()

    db_map = {}
    for row in data:
        code = row[0]
        if code:
            db_map[code.upper()] = {
                "count": row[1],
                "total_spend_inr": round(float(row[2] or 0.0), 2),
                "total_stock_units": round(float(row[3] or 0.0), 1),
                "avg_actual_stockout_risk_pct": round(float(row[4] or 0.0), 1),
                "avg_stock_cover_days": round(float(row[5] or 0.0), 1)
            }

    # Merge with reference definitions
    cells = []
    for code, meta in all_27.items():
        db_stat = db_map.get(code, {
            "count": 0,
            "total_spend_inr": 0.0,
            "total_stock_units": 0.0,
            "avg_actual_stockout_risk_pct": 0.0,
            "avg_stock_cover_days": 0.0
        })
        cells.append({
            "code": code,
            "abc": meta["abc"],
            "sde": meta["sde"],
            "ved": meta["ved"],
            "service_level": meta["service_level"],
            "z_score": meta["z_score"],
            "target_stockout_prob": meta["target_stockout_prob"],
            "target_stockout_prob_pct": meta["target_stockout_prob_pct"],
            "description": meta["description"],
            "part_count": db_stat["count"],
            "total_spend_inr": db_stat["total_spend_inr"],
            "total_stock_units": db_stat["total_stock_units"],
            "avg_actual_stockout_risk_pct": db_stat["avg_actual_stockout_risk_pct"],
            "avg_stock_cover_days": db_stat["avg_stock_cover_days"]
        })

    return {
        "dimensions": {
            "abc": ["A", "B", "C"],
            "sde": ["S", "D", "E"],
            "ved": ["V", "E", "D"]
        },
        "total_combinations": 27,
        "cells": cells
    }

@router.get("/music3d/{code}")
def get_music3d_cell_detail(code: str, db: Session = Depends(get_db)):
    """Returns details and all spare parts classified under a specific MUSIC-3D code."""
    code_clean = code.strip().upper()
    meta = get_music3d_metadata(code_clean)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Invalid MUSIC-3D code '{code}'. Must be one of the 27 valid combinations.")

    parts = db.query(SparePart).join(PartClassification).join(InventoryMetric)\
              .filter(PartClassification.music3d_code == code_clean).all()

    parts_list = []
    for p in parts:
        cls = p.classification
        met = p.metrics
        parts_list.append({
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "annual_usage_units": p.annual_usage_units,
            "unit_price_inr": p.unit_price_inr,
            "annual_consumption_value_inr": p.annual_consumption_value_inr,
            "current_stock_units": p.current_stock_units,
            "lead_time_days": p.lead_time_days,
            "reorder_point": met.reorder_point if met else 0.0,
            "safety_stock": met.safety_stock if met else 0.0,
            "stock_cover_days": met.stock_cover_days if met else 0.0,
            "estimated_stockout_risk": met.estimated_stockout_risk if met else 0.0,
            "risk_gap": met.risk_gap if met else 0.0,
            "stock_status": met.stock_status if met else "HEALTHY",
            "approval_status": cls.classification_status if cls else "AI_SUGGESTED"
        })

    total_spend = sum(p["annual_consumption_value_inr"] for p in parts_list)
    total_stock = sum(p["current_stock_units"] for p in parts_list)
    avg_risk = sum(p["estimated_stockout_risk"] for p in parts_list) / len(parts_list) if parts_list else 0.0

    return {
        "code": code_clean,
        "abc": code_clean[0],
        "sde": code_clean[1],
        "ved": code_clean[2],
        "service_level": meta["service_level"],
        "z_score": meta["z_score"],
        "target_stockout_prob_pct": round(meta["target_stockout_prob"] * 100, 1),
        "description": meta["description"],
        "part_count": len(parts_list),
        "total_spend_inr": round(total_spend, 2),
        "total_stock_units": round(total_stock, 1),
        "avg_actual_stockout_risk_pct": round(avg_risk, 2),
        "parts": parts_list
    }

@router.get("/abc")
def get_abc_analysis(db: Session = Depends(get_db)):
    """Pareto curve points and expenditure contributions."""
    parts = db.query(SparePart).join(PartClassification).order_by(desc(SparePart.annual_consumption_value_inr)).all()
    total_spend = sum(p.annual_consumption_value_inr for p in parts)
    
    pareto_points = []
    cum_spend = 0.0
    for idx, p in enumerate(parts):
        cum_spend += p.annual_consumption_value_inr
        cum_pct = (cum_spend / total_spend * 100.0) if total_spend > 0 else 0.0
        item_pct = ((idx + 1) / len(parts) * 100.0)
        
        # Subsample points for smooth Pareto chart rendering
        if idx < 30 or idx % 5 == 0 or idx == len(parts) - 1:
            pareto_points.append({
                "rank": idx + 1,
                "part_id": p.part_id,
                "part_name": p.part_name,
                "annual_spend": p.annual_consumption_value_inr,
                "item_cumulative_pct": round(item_pct, 1),
                "spend_cumulative_pct": round(cum_pct, 1),
                "abc_class": p.classification.abc_class if p.classification else "C"
            })

    a_items = [p for p in parts if p.classification and p.classification.abc_class == "A"]
    b_items = [p for p in parts if p.classification and p.classification.abc_class == "B"]
    c_items = [p for p in parts if p.classification and p.classification.abc_class == "C"]

    return {
        "summary": {
            "A": {
                "count": len(a_items),
                "item_share_pct": round(len(a_items) / len(parts) * 100.0, 1) if parts else 0,
                "spend_inr": round(sum(p.annual_consumption_value_inr for p in a_items), 2),
                "spend_share_pct": round(sum(p.annual_consumption_value_inr for p in a_items) / total_spend * 100.0, 1) if total_spend > 0 else 0
            },
            "B": {
                "count": len(b_items),
                "item_share_pct": round(len(b_items) / len(parts) * 100.0, 1) if parts else 0,
                "spend_inr": round(sum(p.annual_consumption_value_inr for p in b_items), 2),
                "spend_share_pct": round(sum(p.annual_consumption_value_inr for p in b_items) / total_spend * 100.0, 1) if total_spend > 0 else 0
            },
            "C": {
                "count": len(c_items),
                "item_share_pct": round(len(c_items) / len(parts) * 100.0, 1) if parts else 0,
                "spend_inr": round(sum(p.annual_consumption_value_inr for p in c_items), 2),
                "spend_share_pct": round(sum(p.annual_consumption_value_inr for p in c_items) / total_spend * 100.0, 1) if total_spend > 0 else 0
            }
        },
        "pareto_curve": pareto_points
    }

@router.get("/sos")
def get_sos_analysis(db: Session = Depends(get_db)):
    """Monthly aggregate consumption and seasonal vs off-seasonal split."""
    # Group demand by month (1 to 12)
    month_data = db.query(DemandHistory.month, func.sum(DemandHistory.demand_quantity), func.sum(DemandHistory.issue_quantity))\
                   .group_by(DemandHistory.month).order_by(DemandHistory.month).all()
    
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_series = []
    for m in range(1, 13):
        rec = next((r for r in month_data if r[0] == m), None)
        monthly_series.append({
            "month_num": m,
            "month_name": month_names[m - 1],
            "total_demand": round(float(rec[1] or 0.0), 1) if rec else 0.0,
            "total_issues": round(float(rec[2] or 0.0), 1) if rec else 0.0
        })

    s_count = db.query(PartClassification).filter(PartClassification.sos_class == "S").count()
    os_count = db.query(PartClassification).filter(PartClassification.sos_class == "OS").count()

    return {
        "monthly_aggregate": monthly_series,
        "counts": {
            "S": {"name": "Seasonal", "count": s_count},
            "OS": {"name": "Off-Seasonal", "count": os_count}
        },
        "peak_months": ["May (Pre-Monsoon)", "June (Monsoon Start)", "December (Winter Fog Condition)"]
    }

@router.put("/{part_id}")
def update_part_classification(part_id: str, payload: ClassificationUpdate, db: Session = Depends(get_db)):
    """Allows authorized officer to approve or adjust VED / SDE classifications."""
    cls = db.query(PartClassification).filter(PartClassification.part_id == part_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classification record not found.")

    if payload.ved_class:
        cls.ved_class = payload.ved_class.upper()
    if payload.sde_class:
        cls.sde_class = payload.sde_class.upper()
    
    # Recalculate MUSIC-3D code
    new_code, meta = compose_music3d_code(cls.abc_class, cls.sde_class, cls.ved_class)
    if new_code and meta:
        cls.music3d_code = new_code
        cls.service_level = meta["service_level"]
        cls.z_score = meta["z_score"]
        cls.target_stockout_probability = meta["target_stockout_prob"]

    cls.classification_status = payload.classification_status or "APPROVED"
    cls.approved_by = payload.approved_by or "Sr. DME (Rolling Stock)"
    cls.approved_at = datetime.datetime.utcnow()
    cls.classification_reason = f"Manually verified and approved: {payload.notes or 'Authorised engineering review'}"

    # Recalculate inventory metrics with new Z-score
    sp = db.query(SparePart).filter(SparePart.part_id == part_id).first()
    if sp:
        new_metrics = compute_part_metrics(
            annual_usage=sp.annual_usage_units,
            lead_time_days=sp.lead_time_days,
            current_stock=sp.current_stock_units,
            z_score=cls.z_score,
            service_level=cls.service_level,
            demand_cv=0.30
        )
        met = sp.metrics
        if met:
            met.safety_stock = new_metrics["safety_stock"]
            met.reorder_point = new_metrics["reorder_point"]
            met.target_stockout_probability = new_metrics["target_stockout_prob"]
            met.risk_gap = new_metrics["risk_gap"]

    db.commit()
    return {"status": "SUCCESS", "part_id": part_id, "new_music3d_code": cls.music3d_code, "service_level": cls.service_level}
