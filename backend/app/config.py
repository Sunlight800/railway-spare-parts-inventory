import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "AI-Powered Automatic Block Planning to Maximize Asset Availability"
    APP_SUBTITLE: str = "MUSIC-3D-Based Spare-Part Inventory Intelligence for Indian Railways"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./railway_inventory.db")
    DEMO_MODE: bool = True
    SIMULATION_DEFAULT_RUNS: int = 500
    
    # ABC default cumulative boundaries (%)
    ABC_A_THRESHOLD: float = 70.0
    ABC_B_THRESHOLD: float = 90.0
    
    # HML default price boundaries (INR)
    HML_H_THRESHOLD: float = 25000.0
    HML_M_THRESHOLD: float = 5000.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
