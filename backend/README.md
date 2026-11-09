# AI-Powered Automatic Block Planning to Maximize Asset Availability
## MUSIC-3D-Based Spare-Part Inventory Intelligence for Indian Railways

An academic, decision-support web application for **Logistics and Supply Chain Management (LSCM)**. Demonstrates how selective inventory classification and analytical techniques help Indian Railways optimize spare-part inventory, reduce stockout vulnerability, improve rolling stock asset availability, and schedule indicative maintenance blocks.

---

## 1. Core Model: The 27-Combination MUSIC-3D Framework

The application implements the **Multi-Unit Selective Inventory Control - 3 Dimensional (MUSIC-3D)** model by synthesizing three primary inventory dimensions:

1. **ABC Analysis (1st Dimension – Annual Consumption Spend)**:
   - Annual Consumption Value = Annual Usage Units × Unit Price (INR)
   - Calculated via descending cumulative expenditure sorting:
     - **Class A**: ~10–15% of items accounting for ~70% of expenditure.
     - **Class B**: ~20–25% of items accounting for ~20% of expenditure.
     - **Class C**: ~60–70% of items accounting for ~10% of expenditure.
2. **SDE Analysis (2nd Dimension – Availability & Procurement Difficulty)**:
   - **S (Scarce)**: Single/sole-source, imported dependency, specialized manufacturing constraints.
   - **D (Difficult)**: Limited approved railway vendors, moderate lead-time variability.
   - **E (Easily Available)**: Open-market commercial stockists, local zonal depot vendors.
3. **VED Analysis (3rd Dimension – Operational & Safety Criticality)**:
   - **V (Vital)**: Unavailability directly causes train stoppage or safety hazard (e.g., brake pads, wheelset bearings, pantograph strips).
   - **E (Essential)**: Subsystem disruption; temporary bypass or buffer permissible.
   - **D (Desirable)**: Auxiliary comfort/aesthetic component with non-critical impact.

### Exact 27 MUSIC-3D Service Level & Z-Score Master Reference Table

| Code | ABC | SDE | VED | Target Service Level | Z-Score | Target Stockout Prob. (1 − SL) |
|---|---|---|---|---:|---:|---:|
| **ASV** | A | S | V | 99% | 2.32 | 1.0% |
| **ASE** | A | S | E | 95% | 1.64 | 5.0% |
| **ASD** | A | S | D | 95% | 1.64 | 5.0% |
| **ADV** | A | D | V | 95% | 1.64 | 5.0% |
| **ADE** | A | D | E | 95% | 1.64 | 5.0% |
| **ADD** | A | D | D | 90% | 1.28 | 10.0% |
| **AEV** | A | E | V | 80% | 0.84 | 20.0% |
| **AEE** | A | E | E | 80% | 0.84 | 20.0% |
| **AED** | A | E | D | 80% | 0.84 | 20.0% |
| **BSV** | B | S | V | 95% | 1.64 | 5.0% |
| **BSE** | B | S | E | 95% | 1.64 | 5.0% |
| **BSD** | B | S | D | 90% | 1.28 | 10.0% |
| **BDV** | B | D | V | 95% | 1.64 | 5.0% |
| **BDE** | B | D | E | 90% | 1.28 | 10.0% |
| **BDD** | B | D | D | 90% | 1.28 | 10.0% |
| **BEV** | B | E | V | 80% | 0.84 | 20.0% |
| **BEE** | B | E | E | 75% | 0.67 | 25.0% |
| **BED** | B | E | D | 60% | 0.25 | 40.0% |
| **CSV** | C | S | V | 95% | 1.64 | 5.0% |
| **CSE** | C | S | E | 90% | 1.28 | 10.0% |
| **CSD** | C | S | D | 90% | 1.28 | 10.0% |
| **CDV** | C | D | V | 90% | 1.28 | 10.0% |
| **CDE** | C | D | E | 90% | 1.28 | 10.0% |
| **CDD** | C | D | D | 90% | 1.28 | 10.0% |
| **CEV** | C | E | V | 80% | 0.84 | 20.0% |
| **CEE** | C | E | E | 75% | 0.67 | 25.0% |
| **CED** | C | E | D | 60% | 0.25 | 40.0% |

---

## 2. Complementary Selective Inventory Control Techniques

1. **HML Analysis**: Unit purchase cost tiers (H: &ge; ₹25,000, M: ₹5,000–₹25,000, L: &lt; ₹5,000).
2. **SOS Analysis**: Seasonality in rolling stock failure and consumption patterns (S: Seasonal weather shocks, OS: Off-seasonal uniform demand).
3. **GOLF Analysis**: Sourcing channel origin (G: Govt/PSU such as SAIL or BHEL, O: Open market IREPS tender, L: Local zonal depot workshop, F: Foreign OEM import).
4. **FSN Analysis**: Store issuance velocity (F: Fast-moving &gt;12 issues/yr, S: Slow-moving 2–12 issues/yr, N: Non-moving dormant dead-stock).

---

## 3. Mathematical Formulations

- **Average Daily Demand ($d$)**: $\text{Annual Usage Units} / 365$
- **Lead-Time Demand ($\text{LTD}$)**: $d \times \text{Lead Time Days}$
- **Safety Stock ($\text{SS}$)**: $Z \times \sigma_d \times \sqrt{\text{Lead Time Days}}$
- **Reorder Point ($\text{ROP}$)**: $\text{LTD} + \text{SS}$
- **Stock Coverage Days**: $\text{Current Stock} / d$
- **Target Stockout Probability**: $1 - \text{MUSIC-3D Target Service Level}$
- **Actual Estimated Stockout Risk**: Computed dynamically via Monte Carlo simulation (500 runs) comparing cumulative lead-time demand paths against depot stock on hand.
- **Risk Gap**: $\text{Actual Estimated Stockout Risk} - (\text{Target Stockout Probability} \times 100\%)$
- **Fill Rate**: $\frac{\sum \min(\text{Stock}, \text{Simulated Demand})}{\sum \text{Simulated Demand}} \times 100\%$

---

## 4. Key Dashboards

1. **Executive Overview (`/dashboard`)**: 10 primary KPIs, ABC Pareto chart, VED/SDE distributions, subsystem valuations, and critical zero-stock/shortage alerts.
2. **MUSIC-3D Model (`/music3d`)**: Interactive 3D Canvas Cube (Three.js), stacked 3×3 layers matrix, full 27-row lookup table, and "How MUSIC-3D Works" academic panel.
3. **Spare-Part Inventory Explorer (`/inventory`)**: Searchable, filterable 200 items table with multi-classification chips, stock statuses, and detailed part inspection drawer.
4. **Multi-Parameter Classification Analysis (`/classifications`)**: Dedicated tabs for ABC, SDE, VED, HML, SOS, GOLF, and FSN with Pareto curves and monthly seasonal histograms.
5. **Stock Health & Risk (`/stock-health`)**: Monte Carlo simulation results, Target Risk vs Actual Risk comparisons, and top vulnerable parts.
6. **AI Recommendation Centre (`/recommendations`)**: Explainable rule-based heuristics detecting understock, high lead-time scarcity, working capital overstock, and dead stock.
7. **Indicative Block Planning (`/block-planning`)**: Maintenance work packages, BOM readiness evaluation (READY, PARTIALLY READY, NOT READY), priority scoring, and block slot reallocation.
8. **Simulation Studio (`/simulation`)**: Interactive what-if laboratory with sliders for demand surges, supplier delays, stock shocks, and 8 prebuilt scenarios.
9. **Assets & Systems (`/assets`)**: Locomotives, coaches, freight wagons, OHE catenary, and signalling interlocking racks linked to BOM spare parts.
10. **Suppliers & Procurement (`/suppliers`)**: GOLF vendor master, single-source dependency analysis, and lead-time variability.
11. **Data Management (`/data-management`)**: Excel/CSV upload, data validation, rejection log, template download, and one-click demo data reset.
12. **Methodology & Viva Guide (`/methodology`)**: Complete theoretical guide with worked viva example.

---

## 5. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Three.js.
- **Backend**: Python 3.11+, FastAPI, Pydantic V2, SQLAlchemy, Pandas, NumPy, SciPy.
- **Database**: SQLite (default, zero-config local file `railway_inventory.db`) or PostgreSQL (`DATABASE_URL`).
- **Data Engine**: OpenPyXL & Pandas for Excel workbook ingestion.

---

## 6. Quick Start & Setup Instructions

### Prerequisites
- Python 3.10+ (Python 3.11/3.14 tested)
- Node.js 18+ and npm

### Method 1: Single-Command Launch (Recommended on Windows)
Double-click `run_project.bat` or run in PowerShell:
```powershell
.\run_project.ps1
```
This automatically seeds the database and starts the unified full-stack server at **`http://localhost:8000`**.

### Method 2: Manual Step-by-Step

#### 1. Setup Backend & Seed Database
```powershell
# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Initialize database and populate from synthetic workbook
python backend/seed_data.py

# Start FastAPI Backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
```

#### 2. Setup Frontend (Development Mode)
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. (API requests are automatically proxied to port 8000).

#### 3. API Documentation
Open **`http://localhost:8000/docs`** for interactive Swagger/OpenAPI documentation.

---

## 7. Running Automated Tests

Run pytest to verify the 27 MUSIC-3D combination mappings, Pareto logic, and safety stock formulas:
```powershell
python -m pytest backend/tests -v
```
All 7 unit tests validate exact mathematical and course alignment.

---

## 8. Academic Evaluation Viva Notes

- **Synthetic Data Disclaimer**: Displayed prominently across the header and methodology pages. The 200 items are synthetic demonstration records for academic analysis.
- **Safety Criticality Distinction**: VED labels cannot be determined by unit price alone. Low-cost items like brake seals or relay pins are Vital, while high-cost items can be Desirable.
- **Block Planning Limitation**: Clearly designated as **Inventory-Led Indicative Maintenance Block Planning**. Actual operational railway block authorization requires formal Railway Board / Operating Department possession clearances.
