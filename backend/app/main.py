"""
FastAPI Main Application
AI-Powered Automatic Block Planning to Maximize Asset Availability
MUSIC-3D-Based Spare-Part Inventory Intelligence for Indian Railways
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base

# Import routers
from app.routers import (
    spare_parts,
    classifications,
    inventory,
    simulation,
    block_planning,
    suppliers,
    assets,
    data_management,
    methodology
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_SUBTITLE,
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_init():
    """Ensure tables exist and auto-seed benchmark data if the database is newly initialized."""
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal
    from app.models.entities import SparePart
    from app.services.data_loader import seed_database_from_excel
    db = SessionLocal()
    try:
        count = db.query(SparePart).count()
        if count == 0:
            print("[INFO] Database is empty. Auto-seeding 200 synthetic railway spare parts...")
            seed_database_from_excel(db)
            print("[INFO] Auto-seeding completed successfully.")
    except Exception as e:
        print(f"[WARN] Startup database seed check: {e}")
    finally:
        db.close()

# Register API routers
app.include_router(spare_parts.router)
app.include_router(classifications.router)
app.include_router(inventory.router)
app.include_router(simulation.router)
app.include_router(block_planning.router)
app.include_router(suppliers.router)
app.include_router(assets.router)
app.include_router(data_management.router)
app.include_router(methodology.router)

@app.get("/health")
@app.get("/api/health")
def healthcheck():
    return {"status": "HEALTHY", "version": "1.0.0"}


# Static files and frontend SPA fallback
frontend_dist_candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend/dist")),
]
frontend_dist = next((p for p in frontend_dist_candidates if os.path.exists(p)), None)
if frontend_dist:
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api"):
            return {"error": "API endpoint not found"}
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": settings.APP_NAME,
            "subtitle": settings.APP_SUBTITLE,
            "status": "OPERATIONAL",
            "dataset_mode": "Synthetic Demonstration (200 records)",
            "api_documentation": "/docs"
        }
