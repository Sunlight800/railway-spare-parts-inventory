"""
Automated unit tests for MUSIC-3D 27 combinations and mapping
"""

import pytest
from app.services.music3d_engine import (
    compose_music3d_code,
    get_music3d_metadata,
    get_all_27_combinations,
    MUSIC_3D_REFERENCE_TABLE
)

def test_all_27_combinations_present():
    """Verify that exactly 27 combinations exist with valid service levels and z-scores."""
    all_combs = get_all_27_combinations()
    assert len(all_combs) == 27
    
    abc_set = {"A", "B", "C"}
    sde_set = {"S", "D", "E"}
    ved_set = {"V", "E", "D"}

    for a in abc_set:
        for s in sde_set:
            for v in ved_set:
                code = f"{a}{s}{v}"
                assert code in all_combs
                data = all_combs[code]
                assert 50.0 <= data["service_level"] <= 99.0
                assert 0.20 <= data["z_score"] <= 2.50
                assert 0.01 <= data["target_stockout_prob"] <= 0.50

def test_exact_course_mappings():
    """Verify exact service level and z-score mapping from course curriculum."""
    # ASV: 99%, Z=2.32
    asv = get_music3d_metadata("ASV")
    assert asv["service_level"] == 99.0
    assert asv["z_score"] == 2.32
    assert asv["target_stockout_prob"] == 0.01

    # BED: 60%, Z=0.25
    bed = get_music3d_metadata("BED")
    assert bed["service_level"] == 60.0
    assert bed["z_score"] == 0.25
    assert bed["target_stockout_prob"] == 0.40

    # BEE: 75%, Z=0.67
    bee = get_music3d_metadata("BEE")
    assert bee["service_level"] == 75.0
    assert bee["z_score"] == 0.67
    assert bee["target_stockout_prob"] == 0.25

    # ADV: 95%, Z=1.64
    adv = get_music3d_metadata("ADV")
    assert adv["service_level"] == 95.0
    assert adv["z_score"] == 1.64

    # CDD: 90%, Z=1.28
    cdd = get_music3d_metadata("CDD")
    assert cdd["service_level"] == 90.0
    assert cdd["z_score"] == 1.28

def test_compose_music3d_code():
    code, meta = compose_music3d_code("a", "s", "v")
    assert code == "ASV"
    assert meta["service_level"] == 99.0

    # Invalid dimension
    code, meta = compose_music3d_code("X", "S", "V")
    assert code is None
    assert meta is None
