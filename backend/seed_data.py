"""
Seed Script to initialize database tables and populate from Excel
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import Base, engine, SessionLocal
from app.services.data_loader import seed_database_from_excel

def main():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

    db = SessionLocal()
    try:
        excel_candidates = [
            "synthetic_railway_spare_parts_music3d.xlsx",
            "synthetic_railway_spare_parts(1).xlsx",
            "../synthetic_railway_spare_parts_music3d.xlsx",
            "../synthetic_railway_spare_parts(1).xlsx"
        ]
        found_path = None
        for cand in excel_candidates:
            if os.path.exists(cand):
                found_path = cand
                break
        
        if not found_path:
            raise FileNotFoundError("Could not find synthetic_railway_spare_parts_music3d.xlsx in working directory.")

        print(f"Loading and seeding data from {found_path}...")
        res = seed_database_from_excel(db, excel_path=found_path)
        print("Seeding completed successfully:", res)
    finally:
        db.close()

if __name__ == "__main__":
    main()
