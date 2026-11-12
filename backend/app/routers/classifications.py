"""
Classification Router: All 27 MUSIC-3D combinations, Pareto curves, and Selective Control analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
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
    """Pareto curve points, summary statistics, distribution, and complete item table for ABC analysis."""
    parts = db.query(SparePart).join(PartClassification).order_by(desc(SparePart.annual_consumption_value_inr)).all()
    total_parts = len(parts)
    total_spend = sum(p.annual_consumption_value_inr for p in parts)
    
    pareto_points = []
    items_list = []
    cum_spend = 0.0
    for idx, p in enumerate(parts):
        spend = p.annual_consumption_value_inr
        cum_spend += spend
        cum_pct = (cum_spend / total_spend * 100.0) if total_spend > 0 else 0.0
        item_pct = ((idx + 1) / total_parts * 100.0) if total_parts > 0 else 0.0
        cls_code = p.classification.abc_class if p.classification and p.classification.abc_class else "C"
        
        item_record = {
            "rank": idx + 1,
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "annual_usage_units": p.annual_usage_units,
            "unit_price_inr": p.unit_price_inr,
            "annual_consumption_value_inr": spend,
            "current_stock_units": p.current_stock_units,
            "lead_time_days": p.lead_time_days,
            "supplier_id": p.supplier_id or "N/A",
            "cumulative_expenditure_inr": round(cum_spend, 2),
            "cumulative_expenditure_pct": round(cum_pct, 2),
            "item_cumulative_pct": round(item_pct, 2),
            "abc_class": cls_code,
            "class_code": cls_code,
            "class_label": f"Class {cls_code}",
            "reason": p.classification.classification_reason if p.classification else "Evaluated by Stock Sentry selective control engine."
        }
        items_list.append(item_record)

        # Build comprehensive points for Pareto chart
        if idx < 50 or idx % 3 == 0 or idx == total_parts - 1:
            pareto_points.append({
                "rank": idx + 1,
                "part_id": p.part_id,
                "part_name": p.part_name,
                "annual_spend": spend,
                "spend_in_thousands": round(spend / 1000.0, 1),
                "item_cumulative_pct": round(item_pct, 1),
                "spend_cumulative_pct": round(cum_pct, 1),
                "abc_class": cls_code
            })

    a_items = [p for p in items_list if p["abc_class"] == "A"]
    b_items = [p for p in items_list if p["abc_class"] == "B"]
    c_items = [p for p in items_list if p["abc_class"] == "C"]

    a_spend = sum(p["annual_consumption_value_inr"] for p in a_items)
    b_spend = sum(p["annual_consumption_value_inr"] for p in b_items)
    c_spend = sum(p["annual_consumption_value_inr"] for p in c_items)

    distribution = [
        {
            "category": "A",
            "name": "Class A (Tight Control)",
            "description": "Top ~70% cumulative spend; tight daily control & low safety buffer",
            "count": len(a_items),
            "percentage_items": round((len(a_items) / total_parts * 100.0) if total_parts > 0 else 0, 1),
            "total_spend_inr": round(a_spend, 2),
            "spend_share_pct": round((a_spend / total_spend * 100.0) if total_spend > 0 else 0, 1),
            "color": "#2563eb"
        },
        {
            "category": "B",
            "name": "Class B (Moderate Control)",
            "description": "Next ~20% cumulative spend (up to 90%); periodic review & moderate buffer",
            "count": len(b_items),
            "percentage_items": round((len(b_items) / total_parts * 100.0) if total_parts > 0 else 0, 1),
            "total_spend_inr": round(b_spend, 2),
            "spend_share_pct": round((b_spend / total_spend * 100.0) if total_spend > 0 else 0, 1),
            "color": "#0d9488"
        },
        {
            "category": "C",
            "name": "Class C (Loose Control)",
            "description": "Remaining ~10% cumulative spend; bulk ordering & generous buffer",
            "count": len(c_items),
            "percentage_items": round((len(c_items) / total_parts * 100.0) if total_parts > 0 else 0, 1),
            "total_spend_inr": round(c_spend, 2),
            "spend_share_pct": round((c_spend / total_spend * 100.0) if total_spend > 0 else 0, 1),
            "color": "#64748b"
        }
    ]

    return {
        "total_parts": total_parts,
        "total_annual_spend_inr": round(total_spend, 2),
        "summary": {
            "A": {
                "count": len(a_items),
                "item_share_pct": round(len(a_items) / total_parts * 100.0, 1) if total_parts else 0,
                "spend_inr": round(a_spend, 2),
                "spend_share_pct": round(a_spend / total_spend * 100.0, 1) if total_spend > 0 else 0
            },
            "B": {
                "count": len(b_items),
                "item_share_pct": round(len(b_items) / total_parts * 100.0, 1) if total_parts else 0,
                "spend_inr": round(b_spend, 2),
                "spend_share_pct": round(b_spend / total_spend * 100.0, 1) if total_spend > 0 else 0
            },
            "C": {
                "count": len(c_items),
                "item_share_pct": round(len(c_items) / total_parts * 100.0, 1) if total_parts else 0,
                "spend_inr": round(c_spend, 2),
                "spend_share_pct": round(c_spend / total_spend * 100.0, 1) if total_spend > 0 else 0
            }
        },
        "distribution": distribution,
        "pareto_curve": pareto_points,
        "items": items_list
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
    total = s_count + os_count

    return {
        "monthly_aggregate": monthly_series,
        "counts": {
            "S": {"name": "Seasonal", "count": s_count, "pct": round(s_count / total * 100, 1) if total else 0},
            "OS": {"name": "Off-Seasonal", "count": os_count, "pct": round(os_count / total * 100, 1) if total else 0}
        },
        "distribution": [
            {"category": "S", "name": "Seasonal (S)", "count": s_count, "percentage_items": round(s_count / total * 100, 1) if total else 0, "color": "#ea580c"},
            {"category": "OS", "name": "Off-Seasonal (OS)", "count": os_count, "percentage_items": round(os_count / total * 100, 1) if total else 0, "color": "#0284c7"}
        ],
        "peak_months": ["May (Pre-Monsoon)", "June (Monsoon Start)", "December (Winter Fog Condition)"]
    }

@router.get("/method/{method_name}")
def get_classification_by_method(method_name: str, db: Session = Depends(get_db)):
    """
    Returns unified classification intelligence for any of the 7 selective control methods:
    abc, sde, ved, hml, sos, golf, fsn.
    Provides KPIs, category distribution array, and individual SKU records for tables.
    """
    method = method_name.lower().strip()
    valid_methods = ["abc", "sde", "ved", "hml", "sos", "golf", "fsn"]
    if method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Invalid classification method '{method_name}'. Choose from: {valid_methods}")

    parts = db.query(SparePart).join(PartClassification).join(InventoryMetric).order_by(desc(SparePart.annual_consumption_value_inr)).all()
    total_parts = len(parts)
    total_spend = sum(p.annual_consumption_value_inr for p in parts)

    # Category definitions & color mappings per method
    meta_map = {
        "abc": {
            "title": "ABC Analysis (Annual Consumption Expenditure)",
            "col": lambda cls: cls.abc_class or "C",
            "defs": [
                {"code": "A", "name": "Class A (Tight Control)", "desc": "~70% cumulative spend; tight daily control & low safety buffer", "color": "#2563eb"},
                {"code": "B", "name": "Class B (Moderate Control)", "desc": "Next ~20% cumulative spend (up to 90%); periodic review & moderate buffer", "color": "#0d9488"},
                {"code": "C", "name": "Class C (Loose Control)", "desc": "Remaining ~10% cumulative spend; bulk ordering & generous buffer", "color": "#64748b"}
            ]
        },
        "sde": {
            "title": "SDE Analysis (Procurement Availability & Supply Difficulty)",
            "col": lambda cls: cls.sde_class or "E",
            "defs": [
                {"code": "S", "name": "Scarce (S)", "desc": "Single authorized source, imported dependency, or long specialized manufacturing cycles", "color": "#9333ea"},
                {"code": "D", "name": "Difficult (D)", "desc": "Limited approved railway vendors or moderate delivery lead-time variability", "color": "#2563eb"},
                {"code": "E", "name": "Easily Available (E)", "desc": "Readily available from multiple approved open-market or local zonal depot suppliers", "color": "#16a34a"}
            ]
        },
        "ved": {
            "title": "VED Analysis (Operational Criticality & Safety Consequence)",
            "col": lambda cls: cls.ved_class or "D",
            "defs": [
                {"code": "V", "name": "Vital (V)", "desc": "Absence directly breaches railway safety regulations or causes unscheduled mainline stoppage", "color": "#dc2626"},
                {"code": "E", "name": "Essential (E)", "desc": "Causes operational disruption; temporary secondary buffer or scheduled substitution possible", "color": "#d97706"},
                {"code": "D", "name": "Desirable (D)", "desc": "Non-critical auxiliary or comfort component with negligible operational impact", "color": "#64748b"}
            ]
        },
        "hml": {
            "title": "HML Analysis (Unit Cost Tiers)",
            "col": lambda cls: cls.hml_class or "L",
            "defs": [
                {"code": "H", "name": "High Cost (H)", "desc": "Unit price >= ₹25,000; high capital risk requiring senior financial sign-off", "color": "#7c3aed"},
                {"code": "M", "name": "Medium Cost (M)", "desc": "Unit price ₹5,000 - ₹25,000; standard rolling stock subsystem modules", "color": "#2563eb"},
                {"code": "L", "name": "Low Cost (L)", "desc": "Unit price < ₹5,000; low monetary risk hardware, washers, and seals", "color": "#059669"}
            ]
        },
        "sos": {
            "title": "SOS Analysis (Monthly Seasonality)",
            "col": lambda cls: cls.sos_class or "OS",
            "defs": [
                {"code": "S", "name": "Seasonal (S)", "desc": "Operational spikes during peak climate conditions (Monsoon, Summer HVAC, Winter Fog)", "color": "#ea580c"},
                {"code": "OS", "name": "Off-Seasonal (OS)", "desc": "Year-round uniform consumption with stable maintenance cycle demand", "color": "#0284c7"}
            ]
        },
        "golf": {
            "title": "GOLF Analysis (Procurement Channel & Sourcing Origin)",
            "col": lambda cls: cls.golf_class or "O",
            "defs": [
                {"code": "G", "name": "Government / PSU (G)", "desc": "Supplied by public sector undertakings (SAIL, BHEL) or central railway production units", "color": "#1d4ed8"},
                {"code": "O", "name": "Open Market (O)", "desc": "Sourced through standard open-market railway e-procurement tenders (IREPS)", "color": "#0284c7"},
                {"code": "L", "name": "Local Depot (L)", "desc": "Procured locally from divisional railway stores or regional workshops", "color": "#059669"},
                {"code": "F", "name": "Foreign Import (F)", "desc": "Procured from foreign OEM or international railway consortium", "color": "#7c3aed"}
            ]
        },
        "fsn": {
            "title": "FSN Analysis (Store Turnover Rate & Movement Velocity)",
            "col": lambda cls: cls.fsn_class or "S",
            "defs": [
                {"code": "F", "name": "Fast Moving (F)", "desc": "High turnover store item (> 12 issues per year across maintenance sheds)", "color": "#16a34a"},
                {"code": "S", "name": "Slow Moving (S)", "desc": "Moderate scheduled overhaul parts (2 - 12 issues per year)", "color": "#2563eb"},
                {"code": "N", "name": "Non-Moving / Dormant (N)", "desc": "0 - 1 issues recorded in last 12 months; dead-stock candidate", "color": "#d97706"}
            ]
        }
    }

    config = meta_map[method]
    get_col = config["col"]

    cum_spend = 0.0
    items = []
    category_items = {d["code"]: [] for d in config["defs"]}

    for idx, p in enumerate(parts):
        cls_obj = p.classification
        met_obj = p.metrics
        code = get_col(cls_obj) if cls_obj else config["defs"][-1]["code"]
        
        spend = p.annual_consumption_value_inr
        cum_spend += spend
        cum_pct = (cum_spend / total_spend * 100.0) if total_spend > 0 else 0.0
        item_pct = ((idx + 1) / total_parts * 100.0) if total_parts > 0 else 0.0

        label = next((d["name"] for d in config["defs"] if d["code"] == code), code)

        item_dict = {
            "rank": idx + 1,
            "part_id": p.part_id,
            "part_name": p.part_name,
            "category": p.category,
            "annual_usage_units": p.annual_usage_units,
            "unit_price_inr": p.unit_price_inr,
            "annual_consumption_value_inr": spend,
            "current_stock_units": p.current_stock_units,
            "lead_time_days": p.lead_time_days,
            "supplier_id": p.supplier_id or "N/A",
            "class_code": code,
            "class_label": label,
            "cumulative_expenditure_pct": round(cum_pct, 2),
            "item_cumulative_pct": round(item_pct, 2),
            "reason": (cls_obj.classification_reason if cls_obj else "") or "Evaluated by Stock Sentry Multi-Classification Engine.",
            "safety_impact": (cls_obj.safety_impact if cls_obj else "") or "Standard operational consequence",
            "operational_impact": (cls_obj.operational_impact if cls_obj else "") or "Standard maintenance replenishment",
            "stock_status": met_obj.stock_status if met_obj else "HEALTHY"
        }
        items.append(item_dict)
        if code in category_items:
            category_items[code].append(item_dict)

    # Compute distribution
    distribution = []
    for d in config["defs"]:
        c_code = d["code"]
        cat_parts = category_items.get(c_code, [])
        cat_spend = sum(x["annual_consumption_value_inr"] for x in cat_parts)
        distribution.append({
            "category": c_code,
            "name": d["name"],
            "description": d["desc"],
            "count": len(cat_parts),
            "percentage_items": round((len(cat_parts) / total_parts * 100.0) if total_parts > 0 else 0.0, 1),
            "total_spend_inr": round(cat_spend, 2),
            "spend_share_pct": round((cat_spend / total_spend * 100.0) if total_spend > 0 else 0.0, 1),
            "color": d["color"]
        })

    response = {
        "method": method,
        "title": config["title"],
        "total_parts": total_parts,
        "total_annual_spend_inr": round(total_spend, 2),
        "distribution": distribution,
        "items": items
    }

    if method == "abc":
        pareto_points = []
        for idx, item in enumerate(items):
            if idx < 50 or idx % 3 == 0 or idx == total_parts - 1:
                pareto_points.append({
                    "rank": item["rank"],
                    "part_id": item["part_id"],
                    "part_name": item["part_name"],
                    "annual_spend": item["annual_consumption_value_inr"],
                    "spend_in_thousands": round(item["annual_consumption_value_inr"] / 1000.0, 1),
                    "item_cumulative_pct": item["item_cumulative_pct"],
                    "spend_cumulative_pct": item["cumulative_expenditure_pct"],
                    "abc_class": item["class_code"]
                })
        response["pareto_curve"] = pareto_points
        response["summary"] = {
            d["category"]: {
                "count": d["count"],
                "item_share_pct": d["percentage_items"],
                "spend_inr": d["total_spend_inr"],
                "spend_share_pct": d["spend_share_pct"]
            }
            for d in distribution
        }

    if method == "sos":
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
        response["monthly_aggregate"] = monthly_series
        response["peak_months"] = ["May (Pre-Monsoon)", "June (Monsoon Start)", "December (Winter Fog Condition)"]

    return response

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
