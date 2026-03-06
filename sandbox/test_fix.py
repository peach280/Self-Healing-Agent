
import pytest
import json
from datetime import datetime

fixed = {"fare_amount": 35.0, "trip_distance": 2.4, "tpep_pickup_datetime": "2024-01-15T09:00:00", "tpep_dropoff_datetime": "2024-01-15T09:02:00"}

def test_R1_fare_non_negative():
    assert fixed["fare_amount"] >= 0, f"fare_amount {fixed['fare_amount']} is negative"

def test_R2_duration_positive():
    pickup  = datetime.fromisoformat(fixed["tpep_pickup_datetime"])
    dropoff = datetime.fromisoformat(fixed["tpep_dropoff_datetime"])
    duration = (dropoff - pickup).total_seconds()
    assert duration > 0, f"duration {duration}s is not positive"

def test_R3_speed_limit():
    pickup  = datetime.fromisoformat(fixed["tpep_pickup_datetime"])
    dropoff = datetime.fromisoformat(fixed["tpep_dropoff_datetime"])
    duration_hours = (dropoff - pickup).total_seconds() / 3600
    speed = fixed["trip_distance"] / duration_hours
    assert speed <= 80, f"speed {speed:.1f} mph exceeds 80 mph limit"
