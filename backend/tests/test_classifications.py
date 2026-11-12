import pytest
from app.database import SessionLocal
from app.routers.classifications import (
    get_abc_analysis, get_sos_analysis, get_classification_by_method, get_classification_summary
)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_classification_summary(db):
    summary = get_classification_summary(db)
    assert summary["total_parts"] > 0
    assert summary["total_annual_spend_inr"] > 0
    for key in ["abc", "sde", "ved", "hml", "sos", "golf", "fsn"]:
        assert key in summary
        assert len(summary[key]) > 0

def test_abc_analysis_endpoint(db):
    res = get_abc_analysis(db)
    assert res["total_parts"] > 0
    assert res["total_annual_spend_inr"] > 0
    assert len(res["pareto_curve"]) > 0
    assert len(res["items"]) == res["total_parts"]
    assert "A" in res["summary"]
    assert "B" in res["summary"]
    assert "C" in res["summary"]
    
    # Check that items are ordered by annual spend descending
    spends = [it["annual_consumption_value_inr"] for it in res["items"]]
    assert spends == sorted(spends, reverse=True)
    
    # Cumulative pct at end must reach 100%
    assert abs(res["items"][-1]["cumulative_expenditure_pct"] - 100.0) < 0.1

def test_all_seven_classification_methods(db):
    methods = ["abc", "sde", "ved", "hml", "sos", "golf", "fsn"]
    for m in methods:
        data = get_classification_by_method(m, db)
        assert data["method"] == m
        assert data["total_parts"] > 0
        assert len(data["items"]) == data["total_parts"]
        assert len(data["distribution"]) > 0
        
        # Verify category counts reconcile with total_parts
        cat_sum = sum(d["count"] for d in data["distribution"])
        assert cat_sum == data["total_parts"], f"Failed reconciliation for {m}: {cat_sum} != {data['total_parts']}"

def test_sos_monthly_trend(db):
    res = get_sos_analysis(db)
    assert len(res["monthly_aggregate"]) == 12
    assert "S" in res["counts"]
    assert "OS" in res["counts"]
    assert len(res["peak_months"]) > 0
