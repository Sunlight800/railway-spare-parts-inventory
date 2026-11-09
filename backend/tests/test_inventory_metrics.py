"""
Automated unit tests for inventory calculations and safety stock formulas
"""

import pytest
from app.services.inventory_metrics import compute_part_metrics
from app.services.classification_engine import calculate_abc_classes, classify_hml

def test_inventory_metric_calculations():
    # Annual usage: 3650 units -> daily demand = 10 units/day
    # Lead time: 16 days -> Lead time demand = 160 units
    # Z-score: 2.32 (ASV)
    # Demand CV: 0.20 -> daily_std = 2.0
    # Safety stock = 2.32 * 2.0 * sqrt(16) = 2.32 * 2.0 * 4 = 18.56
    # ROP = 160 + 18.56 = 178.56
    res = compute_part_metrics(
        annual_usage=3650,
        lead_time_days=16,
        current_stock=200,
        z_score=2.32,
        service_level=99.0,
        demand_cv=0.20,
        simulation_runs=200
    )
    assert res["average_daily_demand"] == 10.0
    assert res["lead_time_demand"] == 160.0
    assert abs(res["safety_stock"] - 18.56) < 0.1
    assert abs(res["reorder_point"] - 178.56) < 0.1
    assert res["target_stockout_prob"] == 0.01 # 1%
    assert res["stock_cover_days"] == 20.0
    assert 0.0 <= res["estimated_stockout_risk"] <= 100.0

def test_zero_demand_handling():
    res = compute_part_metrics(
        annual_usage=0,
        lead_time_days=30,
        current_stock=5,
        z_score=1.64,
        service_level=95.0
    )
    assert res["average_daily_demand"] == 0.0
    assert res["lead_time_demand"] == 0.0
    assert res["reorder_point"] == 0.0
    assert res["stock_cover_days"] == 999.0

def test_abc_pareto_logic():
    parts = [
        {"part_id": "P1", "annual_usage_units": 100, "unit_price_inr": 1000}, # 100,000
        {"part_id": "P2", "annual_usage_units": 10, "unit_price_inr": 2000},  # 20,000
        {"part_id": "P3", "annual_usage_units": 50, "unit_price_inr": 100},   # 5,000
        {"part_id": "P4", "annual_usage_units": 5, "unit_price_inr": 200},    # 1,000
    ]
    # Total spend = 126,000
    # P1 = 100k (79.3%) -> Class A
    # P2 = 20k (cum 95.2%) -> Class B
    # P3, P4 -> Class C
    classified = calculate_abc_classes(parts, a_pct=70.0, b_pct=90.0)
    assert classified[0]["part_id"] == "P1"
    assert classified[0]["abc_class"] == "A"
    assert classified[1]["part_id"] == "P2"
    assert classified[1]["abc_class"] == "B"
    assert classified[2]["abc_class"] == "C"

def test_hml_price_thresholds():
    h_cls, _ = classify_hml(30000, h_threshold=25000, m_threshold=5000)
    assert h_cls == "H"
    m_cls, _ = classify_hml(15000, h_threshold=25000, m_threshold=5000)
    assert m_cls == "M"
    l_cls, _ = classify_hml(1200, h_threshold=25000, m_threshold=5000)
    assert l_cls == "L"
