"""
Prediction service — the seam between the web API and the AI packages.

The API layer never imports model code directly; it goes through this
service.  This module loads the trained hybrid model (ai_models/) and
the explainer (explainability/) once at import time and delegates to
them on every request.

Cross-platform note
-------------------
``app.core.compat.apply()`` is called from ``app.main`` *before* this
module is imported, so the ``pathlib.PosixPath`` shim is already in
place by the time ``joblib.load()`` deserialises the Linux-serialised
``.pkl`` artifacts.
"""

from __future__ import annotations

import logging
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.config import settings
from app.schemas.prediction import (
    ConfidenceExplanation,
    ConfidenceFactors,
    Explanation,
    FeatureAttribution,
    HistoricalExplanation,
    HistoricalMatch,
    ImageExplanation,
    PredictionRequest,
    PredictionResponse,
    RiskLevel,
)

logger = logging.getLogger(__name__)


class ModelNotAvailableError(RuntimeError):
    """Raised when no trained model artifact is available to serve."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_hybrid_predictor():
    """
    Attempt to load the HybridPredictor from the saved-models directory.

    Returns the predictor on success, or None with a logged warning on
    failure (keeps the API alive even when artifacts are absent).
    """
    try:
        from ai_models.fusion_model.predict import HybridPredictor
        from ai_models.fusion_model.config import FusionConfig, FUSION_BUNDLE_TEMPLATE

        config = FusionConfig()
        bundle_path = config.saved_models_dir / FUSION_BUNDLE_TEMPLATE.format(
            version=config.model_version
        )
        if not bundle_path.exists():
            logger.warning(
                "Fusion bundle not found at %s — predictions will return HTTP 501",
                bundle_path,
            )
            return None, None, None

        with warnings.catch_warnings():
            # sklearn version-skew warnings are expected when the artifact was
            # built on a different minor sklearn release; the model still loads
            # and runs correctly.
            warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
            predictor = HybridPredictor(model_path=bundle_path, config=config)

        logger.info(
            "Hybrid predictor loaded: %s (version %s, strategy %s)",
            predictor.bundle.get("model_name", "unknown"),
            predictor.bundle.get("version", "?"),
            type(predictor.strategy).__name__,
        )
        return predictor, predictor.bundle, config

    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to load HybridPredictor: %s", exc)
        return None, None, None


def _load_shap_explainer(bundle):
    """Load the FusionShapExplainer against the already-loaded bundle."""
    if bundle is None:
        return None
    try:
        from explainability.shap_explainer.explainer import FusionShapExplainer

        explainer = FusionShapExplainer(bundle)
        logger.info("SHAP explainer initialised")
        return explainer
    except Exception as exc:  # noqa: BLE001
        logger.warning("SHAP explainer unavailable: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Risk-level mapping (fusion model uses uppercase; schema uses lowercase enum)
# ---------------------------------------------------------------------------
_RISK_MAP: dict[str, RiskLevel] = {
    "LOW": RiskLevel.LOW,
    "MODERATE": RiskLevel.MODERATE,
    "HEAVY": RiskLevel.HEAVY,
    "EXTREME": RiskLevel.EXTREME,
    # fallback for string labels the model might return
    "low": RiskLevel.LOW,
    "moderate": RiskLevel.MODERATE,
    "heavy": RiskLevel.HEAVY,
    "extreme": RiskLevel.EXTREME,
}

_LABEL_MAP: dict[str, str] = {
    "temperature_c": "Surface Temperature (°C)",
    "humidity_pct": "Relative Humidity (%)",
    "pressure_hpa": "Atmospheric Pressure (hPa)",
    "wind_speed_ms": "Wind Speed (m/s)",
    "wind_direction_deg": "Wind Direction (°)",
    "cloud_cover_pct": "Cloud Cover (%)",
    "rain_sum_1d": "Rainfall — Past 1 Day (mm)",
    "rain_sum_3d": "Rainfall — Past 3 Days (mm)",
    "rain_sum_7d": "Rainfall — Past 7 Days (mm)",
    "rain_sum_30d": "Rainfall — Past 30 Days (mm)",
    "rain_trend_3d": "Rainfall Trend (3-Day)",
    "season_sin": "Seasonal Cycle (sin)",
    "season_cos": "Seasonal Cycle (cos)",
    "cloud_density": "Cloud Density",
    "brightness_mean": "Brightness Temperature Mean",
    "brightness_std": "Brightness Temperature Std",
    "spatial_dispersion": "Spatial Cloud Dispersion",
    "cold_top_fraction": "Cold Cloud-Top Fraction",
    "cloud_growth_rate": "Cloud Growth Rate",
    "valid_fraction": "Valid Pixel Fraction",
    "weather_risk_score": "Weather Risk Score",
    "satellite_risk_score": "Satellite Risk Score",
    "latitude": "Location Latitude",
    "longitude": "Location Longitude",
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class PredictionService:
    """
    Loads the trained hybrid model once at import time and serves predictions.

    ``model_loaded`` is ``True`` iff the full fusion bundle was loaded
    successfully.  The endpoint returns HTTP 501 until that is the case —
    the platform never fabricates predictions.
    """

    def __init__(self) -> None:
        self._predictor, self._bundle, self._config = _load_hybrid_predictor()
        self._explainer = _load_shap_explainer(self._bundle)

    @property
    def model_loaded(self) -> bool:
        return self._predictor is not None

    # ------------------------------------------------------------------
    def predict(self, request: PredictionRequest) -> PredictionResponse:
        if not self.model_loaded:
            raise ModelNotAvailableError(
                "No trained rainfall model is deployed. The fusion bundle "
                "(ai_models/saved_models/varuna_fusion_model_v1.pkl) could not "
                "be loaded — check startup logs for details."
            )

        # --- Build the payload the HybridPredictor expects ----------------
        weather: dict[str, Any] = {}
        if request.weather:
            w = request.weather
            if w.temperature_c is not None:
                weather["temperature_c"] = w.temperature_c
            if w.humidity_pct is not None:
                weather["humidity_pct"] = w.humidity_pct
            if w.pressure_hpa is not None:
                weather["pressure_hpa"] = w.pressure_hpa
            if w.wind_speed_ms is not None:
                weather["wind_speed_ms"] = w.wind_speed_ms
            if w.cloud_cover_pct is not None:
                weather["cloud_cover_pct"] = w.cloud_cover_pct

        # --- Build satellite branch fallback ---------------------------
        # The API currently accepts weather inputs only — no satellite image
        # is ingested at serving time.  The HybridPredictor requires at least
        # one satellite signal; we supply a scalar risk score estimated from
        # the available cloud cover and humidity as a conservative proxy.
        # When these inputs are also absent, the model uses the training-median
        # satellite_risk_score (reported in 'imputed_features').
        satellite_features: dict[str, Any] = {}
        if request.weather:
            cloud = request.weather.cloud_cover_pct
            humidity = request.weather.humidity_pct
            if cloud is not None and humidity is not None:
                # Simple heuristic proxy: high cloud cover + high humidity
                # correlates with elevated convective risk.  This is explicitly
                # labelled as a fallback in the model notes.
                satellite_risk_score = min(1.0, (cloud / 100.0) * 0.6 + (humidity / 100.0) * 0.4)
                satellite_features["satellite_risk_score"] = round(satellite_risk_score, 4)
            elif cloud is not None:
                satellite_features["satellite_risk_score"] = round(cloud / 100.0 * 0.6, 4)

        payload: dict[str, Any] = {
            "weather_data": weather,
            "satellite_features": satellite_features,
            "location": {
                "latitude": request.location.latitude,
                "longitude": request.location.longitude,
                "region": request.region_name or "",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Decode base64 image if provided
        import base64
        import tempfile
        from pathlib import Path

        tmp_path = None
        image_bytes = None
        if getattr(request, "satellite_image_b64", None):
            try:
                b64_data = request.satellite_image_b64
                if "," in b64_data:
                    b64_data = b64_data.split(",")[-1]
                image_bytes = base64.b64decode(b64_data)
            except Exception as exc:
                logger.warning("Failed to decode satellite_image_b64: %s", exc)

        if image_bytes:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp.write(image_bytes)
                tmp_path = Path(tmp.name)
            payload["satellite_image_path"] = str(tmp_path)

        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
                result = self._predictor.predict(payload)

            # Generate real Grad-CAM image_explanation if satellite image is uploaded
            image_explanation = None
            if tmp_path:
                try:
                    from explainability.gradcam_explainer.gradcam import SatelliteGradCam
                    from explainability.gradcam_explainer.config import GradCamConfig
                    from explainability.gradcam_explainer.visualization import blend_overlay
                    from ai_models.satellite_model.preprocessing import load_rgb
                    import cv2
                    import numpy as np

                    cam = SatelliteGradCam()
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore", category=UserWarning)
                        gradcam_result = cam.explain(tmp_path)

                    original_rgb = load_rgb(tmp_path)
                    overlay_rgb = blend_overlay(original_rgb, gradcam_result.heatmap, GradCamConfig())
                    overlay_bgr = cv2.cvtColor(overlay_rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)
                    ok, buf = cv2.imencode(".png", overlay_bgr)
                    if ok:
                        overlay_b64 = base64.b64encode(buf.tobytes()).decode("ascii")
                        overlay_data_url = f"data:image/png;base64,{overlay_b64}"

                        description = (
                            f"Real Grad-CAM overlay using model {gradcam_result.model_name} "
                            f"(layer {gradcam_result.target_layer}). Highlights coverage: "
                            f"{gradcam_result.coverage_label} ({gradcam_result.coverage * 100:.1f}%). "
                        )
                        if gradcam_result.regions:
                            regions_desc = ", ".join([f"{r.name} in {r.position}" for r in gradcam_result.regions])
                            description += f"High-influence regions: {regions_desc}."

                        image_explanation = ImageExplanation(
                            satellite_image_id="uploaded_scene.png",
                            heatmap_url=overlay_data_url,
                            description=description,
                        )
                except Exception as exc:
                    logger.warning("Failed to generate Grad-CAM in predict: %s", exc)

            # --- SHAP attributions -------------------------------------------
            explanation: Explanation | None = None
            if request.include_explanation:
                explanation = self._build_explanation(result, payload, image_explanation)

            # --- Map to API schema -------------------------------------------
            raw_risk = result.get("risk_level", "LOW")
            risk_level = _RISK_MAP.get(str(raw_risk).upper(), RiskLevel.LOW)

            model_version = result.get("model", "hybrid-v1")
            probability = float(result.get("risk_probability", 0.0))
            confidence = float(result.get("confidence_pct", 0.0)) / 100.0

            return PredictionResponse(
                location=request.location,
                region_name=request.region_name,
                generated_at=datetime.fromisoformat(result["generated_at"]),
                horizon_hours=request.horizon_hours,
                probability=probability,
                risk_level=risk_level,
                confidence=confidence,
                model_version=model_version,
                explanation=explanation,
            )
        finally:
            if tmp_path:
                try:
                    tmp_path.unlink(missing_ok=True)
                except Exception:
                    pass

    # ------------------------------------------------------------------
    def _build_explanation(
        self, result: dict[str, Any], payload: dict[str, Any], image_explanation: ImageExplanation | None = None
    ) -> Explanation:
        """Convert the raw HybridPredictor output + SHAP into the API schema."""

        # -- SHAP feature attributions ------------------------------------
        feature_attributions: list[FeatureAttribution] = []
        if self._explainer is not None:
            try:
                # Reconstruct the fusion row that was scored
                feature_names = self._bundle.get("feature_names", [])
                medians = self._bundle.get("feature_medians", {})
                supplied: dict[str, Any] = {
                    **payload.get("weather_data", {}),
                    **payload.get("satellite_features", {}),
                }
                row_values = {
                    name: float(supplied.get(name, medians.get(name, 0.0)))
                    for name in feature_names
                }
                # Add the probability columns the explainer needs
                class_probs = result.get("class_probabilities", {})
                # class_probs is {label_name: prob} — convert to index keys
                prob_list = list(class_probs.values())
                for idx, p in enumerate(prob_list):
                    row_values[f"weather_prob_{idx}"] = p
                    row_values[f"satellite_prob_{idx}"] = p

                row = pd.DataFrame([row_values])
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", category=UserWarning)
                    shap_result = self._explainer.explain(row)

                for contrib in shap_result.top(10):
                    feature_attributions.append(
                        FeatureAttribution(
                            feature=_LABEL_MAP.get(contrib.feature, contrib.feature),
                            value=contrib.value,
                            contribution=contrib.contribution,
                        )
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("SHAP explanation failed: %s", exc)

        # -- Historical matches -------------------------------------------
        hist_matches = result.get("similar_historical_events", [])
        historical: HistoricalExplanation | None = None
        if hist_matches:
            api_matches = [
                HistoricalMatch(
                    event=m.get("event", ""),
                    region=m.get("region", ""),
                    date=m.get("date", ""),
                    observed_category=int(m.get("observed_category", 0)),
                    observed_rainfall_mm=float(m.get("observed_rainfall_mm", 0.0)),
                    similarity=float(m.get("similarity", 0.0)),
                    similarity_pct=float(m.get("similarity_pct", 0.0)),
                )
                for m in hist_matches
            ]
            historical = HistoricalExplanation(
                reference_events=len(api_matches),
                closest_match=api_matches[0] if api_matches else None,
                matches=api_matches,
                notes=result.get("notes", []),
            )

        # -- Confidence breakdown -----------------------------------------
        breakdown = result.get("confidence_breakdown", {})
        contributing = result.get("contributing_models", {})
        confidence_explanation: ConfidenceExplanation | None = None
        if breakdown:
            confidence_explanation = ConfidenceExplanation(
                confidence_pct=float(result.get("confidence_pct", 0.0)),
                confidence=str(result.get("confidence", "Low")),
                factors=ConfidenceFactors(
                    model_agreement=contributing.get("agreement"),
                    historical_similarity=breakdown.get("historical_similarity"),
                    data_quality="Meteorological inputs provided",
                    data_quality_score=float(
                        1.0 - len(result.get("imputed_features", [])) / max(
                            1, len(self._bundle.get("feature_names", [1]))
                        )
                    ),
                ),
                components={
                    "prediction_probability": breakdown.get("prediction_probability"),
                    "agreement": breakdown.get("agreement"),
                    "historical_similarity": breakdown.get("historical_similarity"),
                    "weights": breakdown.get("weights", {}),
                },
            )

        # -- Narrative summary --------------------------------------------
        risk_label = result.get("event_prediction", "No Extreme Rainfall")
        prob_pct = round(float(result.get("risk_probability", 0.0)) * 100, 1)
        conf_label = result.get("confidence", "Low")
        top_driver = (
            feature_attributions[0].feature
            if feature_attributions
            else "meteorological conditions"
        )
        agreement = contributing.get("agreement")
        agreement_str = f" Model branch agreement: {agreement:.0%}." if agreement is not None else ""
        narrative = (
            f"VARUNA AI assessed a {prob_pct}% probability of a high-impact "
            f"rainfall event ({risk_label}) with {conf_label.lower()} confidence. "
            f"The primary driver of this prediction is {top_driver}.{agreement_str} "
            f"The fusion model (weighted-fusion v1) combined the weather branch "
            f"and satellite risk signals trained on Kerala, Mumbai, Chennai, "
            f"and Assam region-days from 2004\u20132024."
        )

        # -- Operational caveats from model_info.json ---------------------
        caveats = [
            "Predictions are based on meteorological station inputs; real-time "
            "satellite imagery is not ingested for live serving.",
            "The fusion model was trained on Kerala, Mumbai, Chennai, and Assam "
            "region-days (2004–2024). Accuracy outside these regions is not "
            "validated.",
            "Extreme rainfall class (≥204 mm) has negligible representation in "
            "the training data; extreme-level predictions carry high uncertainty.",
            "Missing input features are imputed from training-set medians. "
            f"Imputed features in this prediction: "
            f"{', '.join(result.get('imputed_features', [])) or 'none'}.",
        ]

        return Explanation(
            feature_attributions=feature_attributions,
            image_explanation=image_explanation,
            narrative=narrative,
            historical_explanation=historical,
            confidence_explanation=confidence_explanation,
            caveats=caveats,
        )

    # ------------------------------------------------------------------
    def model_info(self) -> dict:
        base: dict[str, Any] = {
            "model_loaded": self.model_loaded,
            "artifact_dir": settings.MODEL_ARTIFACT_DIR,
            "expected_models": {
                "tabular": "Gradient-boosted classifier on meteorological features",
                "vision": "CNN on INSAT satellite imagery",
                "hybrid": "Fusion of tabular + vision outputs",
            },
        }
        if self._bundle is not None:
            base["loaded_model"] = {
                "name": self._bundle.get("model_name"),
                "version": self._bundle.get("version"),
                "approach": self._bundle.get("approach"),
                "trained_at": self._bundle.get("trained_at"),
                "feature_names": self._bundle.get("feature_names", []),
                "shap_available": self._explainer is not None,
            }
        return base

    # ------------------------------------------------------------------
    def explain_image(self, image_bytes: bytes, filename: str) -> "GradCamResponse":
        """
        Run real Grad-CAM on an uploaded satellite image.

        Uses the trained ``satellite_model_v1.pt`` (CustomCNN, target layer
        ``features.3``) via Captum's ``LayerGradCam``.  The heatmap and
        overlay are returned as base64 PNG data URLs — no static file server
        is required.

        Raises ``GradCamError`` if the checkpoint is missing or the image
        cannot be processed.  Never returns a fabricated result.
        """
        import base64
        import io
        import tempfile

        import numpy as np

        from app.schemas.prediction import GradCamRegion, GradCamResponse

        # Write the uploaded bytes to a temp file so the existing
        # SatelliteGradCam.explain() (which takes a path) can read it.
        suffix = Path(filename).suffix or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(image_bytes)
            tmp_path = Path(tmp.name)

        try:
            from explainability.gradcam_explainer.gradcam import (
                GradCamNotAvailableError,
                InvalidSceneError,
                SatelliteGradCam,
            )
            from explainability.gradcam_explainer.config import GradCamConfig
            from explainability.gradcam_explainer.visualization import (
                blend_overlay,
                render_heatmap,
            )
            from ai_models.satellite_model.preprocessing import load_rgb

            cam = SatelliteGradCam()
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=UserWarning)
                result = cam.explain(tmp_path)

            # --- Encode heatmap as base64 PNG ---------------------------
            import cv2

            heatmap_rgb = render_heatmap(result.heatmap, GradCamConfig())
            heatmap_bgr = cv2.cvtColor(heatmap_rgb, cv2.COLOR_RGB2BGR)
            ok, buf = cv2.imencode(".png", heatmap_bgr)
            if not ok:
                raise RuntimeError("cv2.imencode failed on heatmap")
            heatmap_b64 = base64.b64encode(buf.tobytes()).decode("ascii")
            heatmap_data_url = f"data:image/png;base64,{heatmap_b64}"

            # --- Encode overlay (original scene + heatmap blend) -------
            original_rgb = load_rgb(tmp_path)
            overlay_rgb = blend_overlay(original_rgb, result.heatmap, GradCamConfig())
            overlay_bgr = cv2.cvtColor(overlay_rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)
            ok2, buf2 = cv2.imencode(".png", overlay_bgr)
            if not ok2:
                raise RuntimeError("cv2.imencode failed on overlay")
            overlay_b64 = base64.b64encode(buf2.tobytes()).decode("ascii")
            overlay_data_url = f"data:image/png;base64,{overlay_b64}"

            # --- Get satellite model version from checkpoint ------------
            try:
                from ai_models.satellite_model.config import SatelliteConfig
                from ai_models.satellite_model.model import CHECKPOINT_TEMPLATE, load_checkpoint
                sat_config = SatelliteConfig()
                sat_path = sat_config.saved_models_dir / CHECKPOINT_TEMPLATE.format(
                    version=sat_config.model_version
                )
                _, sat_meta = load_checkpoint(sat_path, device="cpu")
                model_version = str(sat_meta.get("version", "v1"))
            except Exception:
                model_version = "v1"

            return GradCamResponse(
                source="real",
                model_name=result.model_name,
                model_version=model_version,
                target_layer=result.target_layer,
                predicted_category=result.predicted_category,
                class_probabilities=result.class_probabilities,
                satellite_risk_score=result.satellite_risk,
                high_influence_coverage=result.coverage,
                coverage_label=result.coverage_label,
                regions=[
                    GradCamRegion(
                        name=r.name,
                        bbox=list(r.bbox),
                        area_share=r.area_share,
                        intensity=r.intensity,
                        position=r.position,
                    )
                    for r in result.regions
                ],
                heatmap_data_url=heatmap_data_url,
                overlay_data_url=overlay_data_url,
                notes=result.notes,
            )

        finally:
            try:
                tmp_path.unlink(missing_ok=True)
            except Exception:
                pass

