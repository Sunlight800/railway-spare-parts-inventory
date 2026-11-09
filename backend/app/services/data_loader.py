"""
Data Loading, Excel Parsing, and Comprehensive Seeding Service
"""

import os
import datetime
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.models.entities import (
    SparePart, PartClassification, Supplier, InventoryMetric,
    DemandHistory, StockTransaction, Asset, AssetPartLink,
    MaintenanceWorkPackage, WorkPackagePart, BlockWindow
)
from app.services.music3d_engine import compose_music3d_code, get_music3d_metadata
from app.services.classification_engine import (
    calculate_abc_classes, classify_sde, classify_ved,
    classify_hml, classify_sos, classify_golf, classify_fsn
)
from app.services.inventory_metrics import compute_part_metrics

SUPPLIER_PROFILES = {
    "SUP-001": {"name": "Steel Authority of India Ltd (SAIL) - Rail & Wheel Plant", "type": "PSU Undertaking", "golf": "G", "origin": "Domestic (Bhilai/Durgapur)", "imported": False, "rel": 96.0, "lt_avg": 45},
    "SUP-002": {"name": "Bharat Heavy Electricals Ltd (BHEL) Traction Systems", "type": "PSU Undertaking", "golf": "G", "origin": "Domestic (Bhopal/Jhansi)", "imported": False, "rel": 94.5, "lt_avg": 40},
    "SUP-003": {"name": "Chittaranjan Locomotive Works Ancillary Stores", "type": "Railway Production Unit", "golf": "G", "origin": "Domestic (Chittaranjan)", "imported": False, "rel": 95.0, "lt_avg": 35},
    "SUP-004": {"name": "Knorr-Bremse India Pvt Ltd (Braking & Safety Systems)", "type": "OEM Commercial Vendor", "golf": "O", "origin": "Domestic (Palwal Facility)", "imported": False, "rel": 97.2, "lt_avg": 30},
    "SUP-005": {"name": "Faiveley Transport Rail Technologies India", "type": "OEM Commercial Vendor", "golf": "O", "origin": "Domestic (Hosur Plant)", "imported": False, "rel": 95.8, "lt_avg": 28},
    "SUP-006": {"name": "Wabtec India Transportation Systems", "type": "Tier-1 Rail Vendor", "golf": "O", "origin": "Domestic (Marhowra/Bengaluru)", "imported": False, "rel": 96.5, "lt_avg": 32},
    "SUP-007": {"name": "SKF India Ltd - Railway Axlebox & Bearings Division", "type": "Specialized Bearing OEM", "golf": "O", "origin": "Domestic (Pune Facility)", "imported": False, "rel": 98.0, "lt_avg": 25},
    "SUP-008": {"name": "Timken India Rolling Stock Components Ltd", "type": "Precision Manufacturer", "golf": "O", "origin": "Domestic (Jamshedpur)", "imported": False, "rel": 97.0, "lt_avg": 28},
    "SUP-009": {"name": "Northern Railway Central Workshops - Charbagh Stores", "type": "Zonal Railway Depot", "golf": "L", "origin": "Local (Lucknow Zone)", "imported": False, "rel": 93.0, "lt_avg": 15},
    "SUP-010": {"name": "Western Railway Parel Mechanical Workshop Store", "type": "Zonal Railway Depot", "golf": "L", "origin": "Local (Mumbai Zone)", "imported": False, "rel": 92.5, "lt_avg": 18},
    "SUP-011": {"name": "Voith Turbo India Rail Drive Systems", "type": "Power Transmission OEM", "golf": "O", "origin": "Domestic (Hyderabad)", "imported": False, "rel": 94.0, "lt_avg": 38},
    "SUP-012": {"name": "Escorts Railway Equipment Division", "type": "Commercial Railway Vendor", "golf": "O", "origin": "Domestic (Faridabad)", "imported": False, "rel": 93.5, "lt_avg": 26},
    "SUP-013": {"name": "Alstom Transport Deutschland AG (High-Speed Traction)", "type": "International OEM", "golf": "F", "origin": "Foreign (Salzgitter, Germany)", "imported": True, "rel": 91.0, "lt_avg": 65},
    "SUP-014": {"name": "Mitsubishi Electric Rail Transportation Systems", "type": "International OEM", "golf": "F", "origin": "Foreign (Amagasaki, Japan)", "imported": True, "rel": 92.0, "lt_avg": 70},
    "SUP-015": {"name": "Schunk Carbon Technology GmbH (Pantograph Strips)", "type": "Specialized Global OEM", "golf": "F", "origin": "Foreign (Heuchelheim, Austria/Germany)", "imported": True, "rel": 90.5, "lt_avg": 60},
}

ASSETS_DATA = [
    {"asset_id": "WAP-7-30201", "name": "Electric Locomotive WAP-7 #30201 (Ghaziabad Shed)", "type": "Electric Passenger Locomotive", "system": "Electrical", "loc": "Northern Railway - Ghaziabad", "crit": "Vital"},
    {"asset_id": "WAG-9-31105", "name": "Heavy Freight Locomotive WAG-9 #31105 (Tughlakabad)", "type": "Electric Freight Locomotive", "system": "Braking", "loc": "Northern Railway - Tughlakabad", "crit": "Vital"},
    {"asset_id": "LHB-AC-22104", "name": "LHB 1st AC Coach NR-22104 (Rajdhani Rake)", "type": "LHB Passenger Coach", "system": "Pneumatic", "loc": "New Delhi Coaching Yard", "crit": "Vital"},
    {"asset_id": "LHB-3T-23450", "name": "LHB 3-Tier Sleeper Coach NR-23450", "type": "LHB Passenger Coach", "system": "Door system", "loc": "Anand Vihar Coaching Terminal", "crit": "Essential"},
    {"asset_id": "BOXNHL-41029", "name": "BOXNHL Heavy Bogie Coal Wagon #41029", "type": "Bogie Freight Wagon", "system": "Bogie", "loc": "Dadri Freight Logistics Depot", "crit": "Essential"},
    {"asset_id": "OHE-CAT-SEC4", "name": "25kV AC Traction Catenary & Mast System Sec-04", "type": "OHE Traction Substation & Catenary", "system": "Electrical", "loc": "Ghaziabad - Aligarh Section", "crit": "Vital"},
    {"asset_id": "SSI-INTER-GZB", "name": "Solid State Interlocking & Signalling Rack GZB-East", "type": "Signalling & Electronic Interlocking", "system": "Control", "loc": "Ghaziabad East Cabin", "crit": "Vital"},
    {"asset_id": "TAMPER-CSM-90", "name": "Plasser CSM-09 Track Continuous Tamping Machine", "type": "Track Maintenance Machine", "system": "Mechanical", "loc": "Delhi Divisional Track Depot", "crit": "Essential"},
    {"asset_id": "COUPLER-CBC-12", "name": "AAR Tightlock Center Buffer Coupler Assembly #12", "type": "Rolling Stock Coupling", "system": "Coupling", "loc": "Shakurbasti Maintenance Shed", "crit": "Vital"},
    {"asset_id": "GEN-DEPOT-GZB", "name": "Ghaziabad Rolling Stock General Stores Depot", "type": "General Maintenance Stores", "system": "General", "loc": "Ghaziabad Main Depot", "crit": "Desirable"}
]

WORK_PACKAGES_DATA = [
    {
        "work_package_id": "MWP-2026-001",
        "title": "Scheduled Trip Inspection & Brake Caliper Overhaul on WAP-7 #30201",
        "asset_id": "WAP-7-30201",
        "section": "Ghaziabad Electric Loco Shed - Bay 1",
        "description": "Comprehensive inspection of pneumatic brake disc pads, brake calipers, and electro-pneumatic distributor valve testing.",
        "estimated_duration_hours": 4.5,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=2),
        "priority": "CRITICAL",
        "parts": [("RSP-0001", 8.0), ("RSP-0004", 2.0), ("RSP-0015", 4.0)]
    },
    {
        "work_package_id": "MWP-2026-002",
        "title": "Pneumatic Air Brake Line Pressure Test & Hose Replacement on LHB Coach NR-22104",
        "asset_id": "LHB-AC-22104",
        "section": "New Delhi Coaching Yard - Track 4",
        "description": "Replacement of flexible braided pneumatic hoses and main reservoir pressure sensors prior to Rajdhani departure.",
        "estimated_duration_hours": 3.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=1),
        "priority": "HIGH",
        "parts": [("RSP-0002", 4.0), ("RSP-0020", 2.0)]
    },
    {
        "work_package_id": "MWP-2026-003",
        "title": "Bogie Axlebox Spherical Roller Bearing Overhaul - Heavy Freight WAG-9",
        "asset_id": "WAG-9-31105",
        "section": "Tughlakabad Freight Yard - Heavy Pit Line",
        "description": "Ultrasonic non-destructive testing and replacement of journal roller bearings and axle end-cap seals.",
        "estimated_duration_hours": 6.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=5),
        "priority": "CRITICAL",
        "parts": [("RSP-0003", 4.0), ("RSP-0025", 8.0), ("RSP-0050", 2.0)]
    },
    {
        "work_package_id": "MWP-2026-004",
        "title": "High-Voltage Roof Pantograph Carbon Contact Strip Replacement",
        "asset_id": "WAP-7-30201",
        "section": "Ghaziabad Loco Shed - Roof Inspection Line",
        "description": "Inspection of current collection contact strips and pneumatic servo cylinder on Schunk pantograph.",
        "estimated_duration_hours": 2.5,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=4),
        "priority": "HIGH",
        "parts": [("RSP-0005", 2.0), ("RSP-0032", 1.0)]
    },
    {
        "work_package_id": "MWP-2026-005",
        "title": "Solid State Interlocking Vital Relay Rack Preventative Maintenance",
        "asset_id": "SSI-INTER-GZB",
        "section": "Ghaziabad - Sahibabad Signalling Block",
        "description": "Periodic inspection of fail-safe Q-style signalling relays, surge arrestors, and digital control cards.",
        "estimated_duration_hours": 3.5,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=3),
        "priority": "CRITICAL",
        "parts": [("RSP-0006", 6.0), ("RSP-0040", 2.0)]
    },
    {
        "work_package_id": "MWP-2026-006",
        "title": "Automatic Sliding Plug Door Mechanism Overhaul on LHB Coach NR-23450",
        "asset_id": "LHB-3T-23450",
        "section": "Anand Vihar Coaching Depot - Pit 2",
        "description": "Overhaul of linear electric actuator, door guide rollers, microswitches, and door rubber edge seals.",
        "estimated_duration_hours": 4.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=7),
        "priority": "MEDIUM",
        "parts": [("RSP-0007", 2.0), ("RSP-0018", 4.0)]
    },
    {
        "work_package_id": "MWP-2026-007",
        "title": "Center Buffer Coupler (CBC) Draft Gear Inspection & Rubber Pad Renewal",
        "asset_id": "COUPLER-CBC-12",
        "section": "Shakurbasti Maintenance Yard",
        "description": "Measuring draft gear slack, checking knuckle lock pin, and replacing compressed polymer draft pads.",
        "estimated_duration_hours": 5.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=6),
        "priority": "HIGH",
        "parts": [("RSP-0008", 2.0), ("RSP-0030", 4.0)]
    },
    {
        "work_package_id": "MWP-2026-008",
        "title": "25kV AC Traction Catenary Isolator & Steady Arm Overhaul",
        "asset_id": "OHE-CAT-SEC4",
        "section": "Ghaziabad - Aligarh Main Line km 45/12",
        "description": "Replacing composite silicon insulator bracket, dropper clamps, and catenary splice fittings during 2-hour power block.",
        "estimated_duration_hours": 2.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=8),
        "priority": "HIGH",
        "parts": [("RSP-0010", 3.0), ("RSP-0045", 6.0)]
    },
    {
        "work_package_id": "MWP-2026-009",
        "title": "Track Tamping Machine Hydraulic Proportional Valve Bank Calibration",
        "asset_id": "TAMPER-CSM-90",
        "section": "Delhi Division Track Maintenance Depot",
        "description": "Flushing hydraulic circuits, renewing high-pressure filtration elements, and valve bench calibration.",
        "estimated_duration_hours": 6.5,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=10),
        "priority": "MEDIUM",
        "parts": [("RSP-0009", 1.0), ("RSP-0022", 2.0)]
    },
    {
        "work_package_id": "MWP-2026-010",
        "title": "General Rolling Stock Hardware and Passenger Amenity Inspection",
        "asset_id": "GEN-DEPOT-GZB",
        "section": "Ghaziabad Depot Auxiliary Shed",
        "description": "Renewal of interior latch assemblies, luggage rack fasteners, and destination board LED modules.",
        "estimated_duration_hours": 3.0,
        "due_date": datetime.datetime.utcnow() + datetime.timedelta(days=14),
        "priority": "LOW",
        "parts": [("RSP-0011", 10.0), ("RSP-0035", 5.0)]
    }
]

def seed_database_from_excel(db: Session, excel_path: str = "synthetic_railway_spare_parts_music3d.xlsx") -> Dict[str, Any]:
    """
    Cleans, parses, classifies, and populates database with 200 synthetic spare parts and full ecosystem.
    """
    if not os.path.exists(excel_path):
        candidates = [
            excel_path,
            os.path.join(os.path.dirname(__file__), "../../", excel_path),
            os.path.join(os.path.dirname(__file__), "../../../", excel_path),
            os.path.join(os.path.dirname(__file__), "../../synthetic_railway_spare_parts_music3d.xlsx"),
            os.path.join(os.path.dirname(__file__), "../../../synthetic_railway_spare_parts_music3d.xlsx"),
            "synthetic_railway_spare_parts_music3d.xlsx",
            "backend/synthetic_railway_spare_parts_music3d.xlsx",
            "../synthetic_railway_spare_parts_music3d.xlsx",
            "synthetic_railway_spare_parts(1).xlsx",
            "../synthetic_railway_spare_parts(1).xlsx",
        ]
        found = None
        for cand in candidates:
            if os.path.exists(cand):
                found = cand
                break
        if found:
            excel_path = found
        else:
            raise FileNotFoundError(f"Could not find synthetic railway spare parts workbook in any of: {candidates}")


    df = pd.read_excel(excel_path, sheet_name="Railway_Spare_Parts")
    
    # Clean existing database records
    db.query(WorkPackagePart).delete()
    db.query(MaintenanceWorkPackage).delete()
    db.query(AssetPartLink).delete()
    db.query(Asset).delete()
    db.query(StockTransaction).delete()
    db.query(DemandHistory).delete()
    db.query(InventoryMetric).delete()
    db.query(PartClassification).delete()
    db.query(SparePart).delete()
    db.query(Supplier).delete()
    db.commit()

    # 1. Seed Suppliers
    for sup_id, sdata in SUPPLIER_PROFILES.items():
        sup_obj = Supplier(
            supplier_id=sup_id,
            supplier_name=sdata["name"],
            supplier_type=sdata["type"],
            golf_category=sdata["golf"],
            location=sdata["origin"],
            procurement_source=f"{sdata['type']} ({sdata['origin']})",
            import_dependency=sdata["imported"],
            approved_status="Approved Railway Vendor",
            lead_time_avg_days=sdata["lt_avg"],
            lead_time_variance_days=int(sdata["lt_avg"] * 0.15),
            reliability_score=sdata["rel"],
            contact_email=f"supplies@{sup_id.lower()}.railways.gov.in"
        )
        db.add(sup_obj)
    db.commit()

    # 2. Extract and Prepare Raw Spare Parts
    raw_parts = []
    for _, row in df.iterrows():
        pid = str(row["Part_ID"]).strip()
        pname = str(row["Part_Name"]).strip()
        cat = str(row["Category"]).strip()
        usage = float(row["Annual_Usage_Units"])
        price = float(row["Unit_Price_INR"])
        spend = usage * price # Recalculated exact consumption value
        stock = float(row["Current_Stock_Units"])
        lt = int(row["Lead_Time_Days"])
        sup = str(row["Supplier_ID"]).strip()
        
        legacy_crit = str(row.get("Criticality", "Critical")).strip()
        legacy_m3d = str(row.get("MUSIC_3D_Category", "")).strip()

        raw_parts.append({
            "part_id": pid,
            "part_name": pname,
            "category": cat,
            "annual_usage_units": usage,
            "unit_price_inr": price,
            "annual_consumption_value_inr": spend,
            "current_stock_units": stock,
            "lead_time_days": lt,
            "supplier_id": sup,
            "legacy_criticality": legacy_crit,
            "legacy_consumption_class": str(row.get("Consumption_Class", "")),
            "legacy_lead_time_class": str(row.get("Lead_Time_Class", "")),
            "legacy_music3d": legacy_m3d,
            "legacy_recommendation": str(row.get("Inventory_Recommendation", ""))
        })

    # 3. Calculate ABC Classes on exact descending cumulative expenditure
    classified_abc = calculate_abc_classes(raw_parts, a_pct=70.0, b_pct=90.0)
    abc_lookup = {p["part_id"]: p for p in classified_abc}

    # 4. Insert Spare Parts, Classifications, and Inventory Metrics
    for item in raw_parts:
        pid = item["part_id"]
        pname = item["part_name"]
        cat = item["category"]
        sup_id = item["supplier_id"]
        lt_days = item["lead_time_days"]
        price = item["unit_price_inr"]
        usage = item["annual_usage_units"]
        stock = item["current_stock_units"]
        
        abc_info = abc_lookup.get(pid, {})
        abc_cls = abc_info.get("abc_class", "B")

        # Evaluate SDE
        sup_data = SUPPLIER_PROFILES.get(sup_id, {})
        is_imported = sup_data.get("imported", False)
        golf_cat = sup_data.get("golf", "O")
        sup_type = sup_data.get("type", "Private")
        
        # Supplier ecosystem counts (synthetic realistic assumption)
        if sup_id in ["SUP-013", "SUP-014", "SUP-015"]:
            sup_cnt, alt_cnt = 1, 0 # Single source foreign
        elif sup_id in ["SUP-001", "SUP-002", "SUP-003"]:
            sup_cnt, alt_cnt = 2, 1 # PSU specialized
        else:
            sup_cnt, alt_cnt = 3, 2 # Open market

        sde_cls, sde_reason = classify_sde(
            supplier_count=sup_cnt,
            alternate_supplier_count=alt_cnt,
            procurement_source=sup_data.get("origin", "Domestic"),
            is_imported=is_imported,
            lead_time_days=lt_days,
            procurement_difficulty="Scarce" if is_imported else ("Difficult" if sup_cnt <= 2 else "Standard")
        )

        # Evaluate VED (Functional/safety consequence, NOT price)
        ved_cls, ved_reason = classify_ved(
            category=cat,
            part_name=pname,
            legacy_criticality=item["legacy_criticality"]
        )

        # Compose 3-letter canonical MUSIC-3D code
        music3d_code, m3d_meta = compose_music3d_code(abc_cls, sde_cls, ved_cls)
        if not m3d_meta:
            service_lvl = 90.0
            z_score = 1.28
            target_stockout_prob = 0.10
        else:
            service_lvl = m3d_meta["service_level"]
            z_score = m3d_meta["z_score"]
            target_stockout_prob = m3d_meta["target_stockout_prob"]

        # Evaluate Complementary Classifications
        hml_cls, hml_reason = classify_hml(price)
        golf_cls, golf_reason = classify_golf(sup_data.get("origin", "Domestic"), sup_type, is_imported)
        
        # Monthly synthetic demand simulation for SOS & FSN
        monthly_base = usage / 12.0
        # Add seasonal fluctuation for HVAC / Braking / Pantograph
        months_arr = []
        is_seasonal_type = any(x in f"{pname} {cat}".lower() for x in ["hvac", "pantograph", "bearing", "monsoon", "compressor", "air conditioner"])
        for m in range(1, 13):
            factor = 1.0
            if is_seasonal_type:
                # Peak in summer (May-July: months 5, 6, 7) or winter (Dec-Jan)
                if m in [5, 6, 7]:
                    factor = 1.6
                elif m in [1, 12]:
                    factor = 1.3
                else:
                    factor = 0.75
            m_demand = max(0.0, float(np.random.normal(monthly_base * factor, monthly_base * 0.15)))
            months_arr.append(round(m_demand, 1))

        sos_cls, sos_reason = classify_sos(months_arr, cat, pname)
        
        # Estimate annual issues
        annual_issues = max(1, int(round(usage / max(1.0, (price / 500.0 if price > 1000 else 5.0)))))
        if usage > 100:
            annual_issues = min(50, max(14, annual_issues))
        elif usage < 10:
            annual_issues = min(2, annual_issues)
        else:
            annual_issues = min(12, max(3, annual_issues))

        fsn_cls, fsn_reason = classify_fsn(annual_issues, months_since_last_issue=1 if annual_issues > 3 else 14)

        # 1. SparePart Entity
        sp_obj = SparePart(
            part_id=pid,
            part_name=pname,
            category=cat,
            annual_usage_units=usage,
            unit_price_inr=price,
            annual_consumption_value_inr=item["annual_consumption_value_inr"],
            current_stock_units=stock,
            lead_time_days=lt_days,
            supplier_id=sup_id,
            legacy_criticality=item["legacy_criticality"],
            legacy_consumption_class=item["legacy_consumption_class"],
            legacy_lead_time_class=item["legacy_lead_time_class"],
            legacy_music3d=item["legacy_music3d"],
            legacy_recommendation=item["legacy_recommendation"],
            data_source="Synthetic Demonstration Dataset (IR LSCM Project)"
        )
        db.add(sp_obj)

        # 2. PartClassification Entity
        cls_obj = PartClassification(
            part_id=pid,
            abc_class=abc_cls,
            sde_class=sde_cls,
            ved_class=ved_cls,
            music3d_code=music3d_code,
            service_level=service_lvl,
            z_score=z_score,
            target_stockout_probability=target_stockout_prob,
            hml_class=hml_cls,
            sos_class=sos_cls,
            golf_class=golf_cls,
            fsn_class=fsn_cls,
            classification_status="APPROVED" if pid in ["RSP-0001", "RSP-0002", "RSP-0003"] else "AI_SUGGESTED",
            classification_reason=f"MUSIC-3D: [{abc_cls}] Spend Pareto + [{sde_cls}] {sde_reason} + [{ved_cls}] {ved_reason}",
            safety_impact="Severe Hazard / Mainline Detainment" if ved_cls == "V" else ("Subsystem Degraded Mode" if ved_cls == "E" else "Negligible / Non-Operational"),
            operational_impact="Traction / Rolling Stock Hold" if ved_cls == "V" else ("Scheduled Maintenance Buffer" if ved_cls == "E" else "Depot Routine Maintenance"),
            service_impact="High Interruption Probability" if ved_cls == "V" else ("Moderate Disruption" if ved_cls == "E" else "Low"),
            procurement_difficulty=sde_reason,
            supplier_count=sup_cnt,
            alternate_supplier_count=alt_cnt,
            confidence=0.96 if pid in ["RSP-0001", "RSP-0002"] else 0.91,
            approved_by="Sr. Divisional Mechanical Engineer (Rolling Stock)" if pid in ["RSP-0001", "RSP-0002", "RSP-0003"] else None,
            approved_at=datetime.datetime.utcnow() if pid in ["RSP-0001", "RSP-0002", "RSP-0003"] else None
        )
        db.add(cls_obj)

        # 3. Inventory Metric & Monte Carlo Simulation
        metrics_dict = compute_part_metrics(
            annual_usage=usage,
            lead_time_days=lt_days,
            current_stock=stock,
            z_score=z_score,
            service_level=service_lvl,
            demand_cv=0.30,
            simulation_runs=settings.SIMULATION_DEFAULT_RUNS
        )

        metric_obj = InventoryMetric(
            part_id=pid,
            average_daily_demand=metrics_dict["average_daily_demand"],
            demand_standard_deviation=metrics_dict["demand_standard_deviation"],
            lead_time_demand=metrics_dict["lead_time_demand"],
            safety_stock=metrics_dict["safety_stock"],
            reorder_point=metrics_dict["reorder_point"],
            stock_cover_days=metrics_dict["stock_cover_days"],
            target_stockout_probability=metrics_dict["target_stockout_prob"],
            estimated_stockout_risk=metrics_dict["estimated_stockout_risk"],
            risk_gap=metrics_dict["risk_gap"],
            estimated_fill_rate=metrics_dict["estimated_fill_rate"],
            stock_status=metrics_dict["stock_status"],
            calculation_method=metrics_dict["calculation_method"],
            calculation_assumptions=metrics_dict["calculation_assumptions"]
        )
        db.add(metric_obj)

        # 4. Monthly Demand History
        for m_idx, m_qty in enumerate(months_arr):
            dh = DemandHistory(
                part_id=pid,
                month=m_idx + 1,
                year=2026,
                demand_quantity=m_qty,
                issue_quantity=max(0.0, round(m_qty * np.random.uniform(0.9, 1.05), 1)),
                data_source="Demonstration Demand Profile"
            )
            db.add(dh)

        # 5. Sample Transaction
        txn = StockTransaction(
            part_id=pid,
            transaction_date=datetime.datetime.utcnow() - datetime.timedelta(days=int(np.random.randint(1, 30))),
            transaction_type="ISSUE",
            quantity=round(max(1.0, usage / 20.0), 1),
            reference=f"ISSUE-REQ-{pid[-4:]}",
            remarks="Routine divisional workshop maintenance withdrawal."
        )
        db.add(txn)

    db.commit()

    # 5. Seed Assets
    for a in ASSETS_DATA:
        asset_obj = Asset(
            asset_id=a["asset_id"],
            asset_name=a["name"],
            asset_type=a["type"],
            system=a["system"],
            location=a["loc"],
            criticality=a["crit"],
            status="OPERATIONAL",
            data_source="Demonstration Railway Rolling Stock Register"
        )
        db.add(asset_obj)
    db.commit()

    # 6. Seed Asset-to-Part BOM Links
    asset_part_mappings = [
        ("WAP-7-30201", ["RSP-0001", "RSP-0004", "RSP-0005", "RSP-0015", "RSP-0032"]),
        ("WAG-9-31105", ["RSP-0003", "RSP-0012", "RSP-0025", "RSP-0050"]),
        ("LHB-AC-22104", ["RSP-0002", "RSP-0020", "RSP-0028"]),
        ("LHB-3T-23450", ["RSP-0007", "RSP-0018", "RSP-0042"]),
        ("BOXNHL-41029", ["RSP-0001", "RSP-0003", "RSP-0014"]),
        ("OHE-CAT-SEC4", ["RSP-0010", "RSP-0045"]),
        ("SSI-INTER-GZB", ["RSP-0006", "RSP-0040"]),
        ("TAMPER-CSM-90", ["RSP-0009", "RSP-0022"]),
        ("COUPLER-CBC-12", ["RSP-0008", "RSP-0030"]),
        ("GEN-DEPOT-GZB", ["RSP-0011", "RSP-0035", "RSP-0055"])
    ]
    for aid, pids in asset_part_mappings:
        for p in pids:
            link = AssetPartLink(
                asset_id=aid,
                part_id=p,
                required_quantity=float(np.random.randint(2, 8)),
                notes="Standard Bill-of-Materials assembly dependency."
            )
            db.add(link)
    db.commit()

    # 7. Seed Maintenance Work Packages
    for wp in WORK_PACKAGES_DATA:
        mwp = MaintenanceWorkPackage(
            work_package_id=wp["work_package_id"],
            title=wp["title"],
            asset_id=wp["asset_id"],
            section=wp["section"],
            description=wp["description"],
            estimated_duration_hours=wp["estimated_duration_hours"],
            due_date=wp["due_date"],
            priority=wp["priority"],
            status="READY",
            recommendation_score=85.0,
            scheduled_block_date=wp["due_date"],
            notes="Indicative block allocation pending final divisional power and traffic clearance."
        )
        db.add(mwp)
        for pid, req_q in wp["parts"]:
            wpp = WorkPackagePart(
                work_package_id=wp["work_package_id"],
                part_id=pid,
                required_quantity=req_q
            )
            db.add(wpp)
    db.commit()

    # 8. Seed Indicative Block Windows
    block_windows = [
        {"name": "GZB-CNB Night Maintenance Block Window A", "section": "Ghaziabad - Kanpur Main Line", "days": 1, "start": "01:30", "end": "05:00"},
        {"name": "NDLS Yard Maintenance Window 02", "section": "New Delhi Coaching Yard", "days": 2, "start": "11:00", "end": "14:00"},
        {"name": "TKD Heavy Freight Pit Line Window B", "section": "Tughlakabad Freight Yard", "days": 3, "start": "02:00", "end": "06:30"},
        {"name": "GZB-ALJN OHE Catenary Power Block", "section": "Ghaziabad - Aligarh Electrified Section", "days": 4, "start": "00:45", "end": "03:45"},
        {"name": "ANVT Coaching Depot Service Window", "section": "Anand Vihar Coaching Depot", "days": 5, "start": "08:00", "end": "12:00"}
    ]
    for bw in block_windows:
        b_obj = BlockWindow(
            window_name=bw["name"],
            section=bw["section"],
            date=datetime.datetime.utcnow() + datetime.timedelta(days=bw["days"]),
            start_time=bw["start"],
            end_time=bw["end"],
            window_status="INDICATIVE_AVAILABLE",
            source="Divisional Indicative Engineering Block Schedule"
        )
        db.add(b_obj)
    db.commit()

    total_parts = db.query(SparePart).count()
    return {
        "status": "SUCCESS",
        "records_imported": total_parts,
        "assets_seeded": len(ASSETS_DATA),
        "work_packages_seeded": len(WORK_PACKAGES_DATA),
        "suppliers_seeded": len(SUPPLIER_PROFILES)
    }
