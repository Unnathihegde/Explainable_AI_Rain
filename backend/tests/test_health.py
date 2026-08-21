"""Smoke tests for the API — verify the app boots, the contract holds, and
the real hybrid model is deployed and producing predictions."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "VARUNA AI"


def test_model_info_reports_model_loaded():
    """model-info must report model_loaded=True now that the hybrid model is deployed."""
    response = client.get("/api/v1/predictions/model-info")
    assert response.status_code == 200
    body = response.json()
    assert body["model_loaded"] is True, (
        "The hybrid model should be loaded. "
        "Check startup logs for loading errors."
    )
    assert "loaded_model" in body
    assert body["loaded_model"]["version"] == "v1"


def test_prediction_returns_200_with_real_model():
    """The hybrid model should return a real prediction (not 501) with weather inputs."""
    response = client.post(
        "/api/v1/predictions",
        json={
            "location": {"latitude": 10.0, "longitude": 76.3},
            "region_name": "Kerala",
            "horizon_hours": 24,
            "weather": {
                "temperature_c": 29.4,
                "humidity_pct": 91.0,
                "pressure_hpa": 1002.0,
                "wind_speed_ms": 7.1,
                "cloud_cover_pct": 96.0,
            },
            "include_explanation": True,
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    assert "probability" in body
    assert 0.0 <= body["probability"] <= 1.0
    assert body["risk_level"] in {"low", "moderate", "heavy", "extreme"}
    assert 0.0 <= body["confidence"] <= 1.0
    assert "v1" in body["model_version"]
    # Explanation must be present with real SHAP attributions
    assert body["explanation"] is not None
    assert len(body["explanation"]["feature_attributions"]) > 0
    assert body["explanation"]["historical_explanation"] is not None
    assert body["explanation"]["confidence_explanation"] is not None
    assert len(body["explanation"]["caveats"]) > 0


def test_alerts_list_is_empty_initially():
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    assert response.json() == []
