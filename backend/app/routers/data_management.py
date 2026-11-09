"""
Data Management Router: File Upload (Excel/CSV), Mapping, Validation, Export, and Demo Reset
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
import os
import datetime

from app.database import get_db
from app.models.entities import SparePart, PartClassification, InventoryMetric, DataImport
from app.services.data_loader import seed_database_from_excel
from app.services.classification_engine import calculate_abc_classes, classify_sde, classify_ved, classify_hml, classify_sos, classify_golf, classify_fsn
from app.services.music3d_engine import compose_music3d_code
from app.services.inventory_metrics import compute_part_metrics

router = APIRouter(prefix="/api/data-management", tags=["Data Management"])

def normalize_col(col_name: str) -> str:
    return str(col_name).strip().lower().replace(" ", "").replace("_", "").replace("-", "").replace("(", "").replace(")", "").replace(".", "")

COLUMN_ALIAS_MAP = {
    "partid": "Part_ID",
    "partcode": "Part_ID",
    "partnumber": "Part_ID",
    "sku": "Part_ID",
    "itemid": "Part_ID",
    "partname": "Part_Name",
    "name": "Part_Name",
    "description": "Part_Name",
    "itemname": "Part_Name",
    "partdescription": "Part_Name",
    "category": "Category",
    "subsystem": "Category",
    "system": "Category",
    "annualusageunits": "Annual_Usage_Units",
    "annualusage": "Annual_Usage_Units",
    "usageunits": "Annual_Usage_Units",
    "annualconsumptionunits": "Annual_Usage_Units",
    "annualvolume": "Annual_Usage_Units",
    "unitpriceinr": "Unit_Price_INR",
    "unitprice": "Unit_Price_INR",
    "priceinr": "Unit_Price_INR",
    "price": "Unit_Price_INR",
    "cost": "Unit_Price_INR",
    "leadtimedays": "Lead_Time_Days",
    "leadtime": "Lead_Time_Days",
    "currentstockunits": "Current_Stock_Units",
    "currentstock": "Current_Stock_Units",
    "stockunits": "Current_Stock_Units",
    "stock": "Current_Stock_Units",
    "stockonhand": "Current_Stock_Units",
    "supplierid": "Supplier_ID",
    "supplier": "Supplier_ID",
    "vendorid": "Supplier_ID",
    "criticality": "Criticality",
    "ved": "Criticality",
    "criticalityclass": "Criticality"
}

@router.post("/import")
async def import_inventory_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads and parses an Excel (.xlsx) or CSV file, validates columns, and recalculates classifications."""
    filename = file.filename or "uploaded_file"
    contents = await file.read()

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            excel_file = io.BytesIO(contents)
            xl = pd.ExcelFile(excel_file)
            sheet_name = "Railway_Spare_Parts" if "Railway_Spare_Parts" in xl.sheet_names else xl.sheet_names[0]
            df = pd.read_excel(excel_file, sheet_name=sheet_name)
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .xlsx or .csv.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Normalize column names flexibly to handle spaces, casing, and aliases
    rename_dict = {}
    for c in df.columns:
        norm = normalize_col(c)
        if norm in COLUMN_ALIAS_MAP:
            rename_dict[c] = COLUMN_ALIAS_MAP[norm]
    if rename_dict:
        df.rename(columns=rename_dict, inplace=True)

    # Check required minimum columns
    req_cols = ["Part_ID", "Part_Name", "Category", "Annual_Usage_Units", "Unit_Price_INR", "Lead_Time_Days", "Current_Stock_Units"]
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file missing required columns: {', '.join(missing)}. Available columns: {list(df.columns)}"
        )

    # Process records
    imported_count = 0
    rejected_count = 0
    rejections = []

    raw_items = []
    seen_ids = set()

    for idx, row in df.iterrows():
        pid = str(row["Part_ID"]).strip()
        if not pid or pid == "nan":
            rejections.append(f"Row {idx+2}: Missing Part_ID")
            rejected_count += 1
            continue

        if pid in seen_ids:
            rejections.append(f"Row {idx+2}: Duplicate Part_ID '{pid}'")
            rejected_count += 1
            continue
        seen_ids.add(pid)

        try:
            usage = float(row["Annual_Usage_Units"])
            price = float(row["Unit_Price_INR"])
            stock = float(row["Current_Stock_Units"])
            lt = int(row["Lead_Time_Days"])

            if usage < 0 or price < 0 or stock < 0 or lt < 1:
                rejections.append(f"Row {idx+2} ({pid}): Negative quantity or invalid lead time.")
                rejected_count += 1
                continue

            raw_items.append({
                "part_id": pid,
                "part_name": str(row.get("Part_Name", f"Part {pid}")).strip(),
                "category": str(row.get("Category", "General")).strip(),
                "annual_usage_units": usage,
                "unit_price_inr": price,
                "annual_consumption_value_inr": round(usage * price, 2),
                "current_stock_units": stock,
                "lead_time_days": lt,
                "supplier_id": str(row.get("Supplier_ID", "SUP-001")).strip(),
                "legacy_criticality": str(row.get("Criticality", "Critical")).strip()
            })
            imported_count += 1
        except Exception as e:
            rejections.append(f"Row {idx+2} ({pid}): Data conversion error ({str(e)})")
            rejected_count += 1

    if not raw_items:
        raise HTTPException(status_code=400, detail="No valid records could be extracted from file.")

    # Calculate ABC classes
    classified_abc = calculate_abc_classes(raw_items, 70.0, 90.0)
    abc_map = {item["part_id"]: item for item in classified_abc}

    # Upsert into database
    for item in raw_items:
        pid = item["part_id"]
        abc_info = abc_map.get(pid, {})
        abc_cls = abc_info.get("abc_class", "B")

        # Classifications
        sde_cls, sde_reason = classify_sde(supplier_count=2, alternate_supplier_count=1, lead_time_days=item["lead_time_days"])
        ved_cls, ved_reason = classify_ved(item["category"], item["part_name"], item["legacy_criticality"])
        code, meta = compose_music3d_code(abc_cls, sde_cls, ved_cls)
        hml_cls, _ = classify_hml(item["unit_price_inr"])
        sos_cls, _ = classify_sos(None, item["category"], item["part_name"])
        golf_cls, _ = classify_golf("Domestic", "Private", False)
        fsn_cls, _ = classify_fsn(12, 1)

        sl = meta["service_level"] if meta else 90.0
        z = meta["z_score"] if meta else 1.28
        target_prob = meta["target_stockout_prob"] if meta else 0.10

        metrics = compute_part_metrics(
            annual_usage=item["annual_usage_units"],
            lead_time_days=item["lead_time_days"],
            current_stock=item["current_stock_units"],
            z_score=z,
            service_level=sl
        )

        existing_sp = db.query(SparePart).filter(SparePart.part_id == pid).first()
        if existing_sp:
            existing_sp.part_name = item["part_name"]
            existing_sp.category = item["category"]
            existing_sp.annual_usage_units = item["annual_usage_units"]
            existing_sp.unit_price_inr = item["unit_price_inr"]
            existing_sp.annual_consumption_value_inr = item["annual_consumption_value_inr"]
            existing_sp.current_stock_units = item["current_stock_units"]
            existing_sp.lead_time_days = item["lead_time_days"]
            existing_sp.supplier_id = item["supplier_id"]
            existing_sp.data_source = "User Uploaded Dataset"

            cls_obj = existing_sp.classification
            if cls_obj:
                cls_obj.abc_class = abc_cls
                cls_obj.sde_class = sde_cls
                cls_obj.ved_class = ved_cls
                cls_obj.music3d_code = code
                cls_obj.service_level = sl
                cls_obj.z_score = z
                cls_obj.target_stockout_probability = target_prob
                cls_obj.hml_class = hml_cls
                cls_obj.sos_class = sos_cls
                cls_obj.golf_class = golf_cls
                cls_obj.fsn_class = fsn_cls

            met_obj = existing_sp.metrics
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
        else:
            sp = SparePart(
                part_id=pid,
                part_name=item["part_name"],
                category=item["category"],
                annual_usage_units=item["annual_usage_units"],
                unit_price_inr=item["unit_price_inr"],
                annual_consumption_value_inr=item["annual_consumption_value_inr"],
                current_stock_units=item["current_stock_units"],
                lead_time_days=item["lead_time_days"],
                supplier_id=item["supplier_id"],
                data_source="User Uploaded Dataset"
            )
            db.add(sp)

            cls = PartClassification(
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
                classification_reason="Computed on file upload"
            )
            db.add(cls)

            met = InventoryMetric(
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
            db.add(met)

    # Log import
    log = DataImport(
        filename=filename,
        record_count=imported_count,
        rejected_count=rejected_count,
        import_status="SUCCESS" if rejected_count == 0 else "PARTIAL_SUCCESS",
        details_json={"rejections": rejections[:20]}
    )
    db.add(log)
    db.commit()

    return {
        "status": "SUCCESS",
        "imported_records": imported_count,
        "rejected_records": rejected_count,
        "rejection_sample": rejections[:10]
    }

@router.post("/reset-demo")
def reset_to_synthetic_demo(db: Session = Depends(get_db)):
    """Resets database back to clean 200 synthetic items from the original workbook."""
    res = seed_database_from_excel(db)
    return {"status": "SUCCESS", "message": "Database reset to original 200 synthetic demonstration records.", "details": res}

@router.get("/template")
def download_template():
    """Generates and streams a sample CSV template for inventory upload."""
    sample_data = """Part_ID,Part_Name,Category,Annual_Usage_Units,Unit_Price_INR,Lead_Time_Days,Current_Stock_Units,Supplier_ID,Criticality
RSP-SAMPLE-01,Brake Disc Pad Friction Assembly,Braking,120,4500.00,30,25,SUP-004,Critical
RSP-SAMPLE-02,Solid State Signal Interlocking Relay,Control,40,12000.00,45,8,SUP-002,Critical
RSP-SAMPLE-03,Door Guide Roller Bearing,Door system,250,850.00,20,40,SUP-007,Non-Critical
"""
    stream = io.StringIO(sample_data)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=indian_railways_inventory_template.csv"
    return response

@router.get("/download-sample-excel")
def download_sample_excel():
    """Generates and streams a ready-to-upload Indian Railways Excel (.xlsx) file."""
    candidates = [
        "indian_railways_sample_spare_parts.xlsx",
        "backend/indian_railways_sample_spare_parts.xlsx",
        "synthetic_railway_spare_parts_test_upload.xlsx",
        "synthetic_railway_spare_parts_music3d.xlsx",
        os.path.join(os.path.dirname(__file__), "../../../indian_railways_sample_spare_parts.xlsx"),
        os.path.join(os.path.dirname(__file__), "../../indian_railways_sample_spare_parts.xlsx")
    ]
    for c in candidates:
        if os.path.exists(c):
            return FileResponse(
                path=os.path.abspath(c),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                filename="indian_railways_sample_spare_parts.xlsx"
            )
    raise HTTPException(status_code=404, detail="Sample Excel file not found on server.")
