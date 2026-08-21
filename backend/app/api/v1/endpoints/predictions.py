"""
Rainfall prediction endpoints.

POST /api/v1/predictions               — run the hybrid model (weather inputs)
POST /api/v1/predictions/explain-image — run real Grad-CAM on a satellite image
GET  /api/v1/predictions/model-info    — loaded-model metadata

The /explain-image endpoint accepts a multipart upload so the browser can
supply an INSAT satellite scene directly.  Grad-CAM is then run against
the trained satellite_model_v1.pt (CustomCNN, Captum LayerGradCam) and the
result is returned as base64 PNG data URLs — no static file server is needed.

Nothing here fabricates results: if the satellite checkpoint is missing or
the image cannot be read, the endpoint raises 422 rather than returning a
plausible-looking heatmap.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.prediction import GradCamResponse, PredictionRequest, PredictionResponse
from app.services.prediction_service import PredictionService, ModelNotAvailableError

router = APIRouter()

_service = PredictionService()


@router.post("", response_model=PredictionResponse)
def predict_rainfall(request: PredictionRequest) -> PredictionResponse:
    """Run the rainfall risk model for a location and forecast horizon.

    Returns a probability-based risk assessment with an attached
    explanation payload (SHAP feature attributions; Grad-CAM overlays when
    satellite imagery is part of the input).
    """
    try:
        return _service.predict(request)
    except ModelNotAvailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc


@router.post("/explain-image", response_model=GradCamResponse)
def explain_image(
    image: UploadFile = File(
        ...,
        description=(
            "Satellite scene image (PNG, JPEG, or TIFF). "
            "The file is passed through the trained satellite CNN "
            "(satellite_model_v1.pt) and Grad-CAM attribution is computed "
            "on the final convolutional layer (features.3 for CustomCNN). "
            "The result is real — nothing is synthesised."
        ),
    ),
) -> GradCamResponse:
    """Compute real Grad-CAM attribution for a satellite image.

    Accepts any image format readable by OpenCV/PIL.  Returns:
    - `heatmap_data_url` — pure attribution map (red = high, blue = low)
    - `overlay_data_url` — original scene blended with the heatmap
    - `regions` — named high-attention blobs extracted by connected-component analysis
    - `source: "real"` — always present to distinguish from simulated Grad-CAM

    Raises **422** if the image cannot be decoded or the checkpoint is absent.
    """
    try:
        image_bytes = image.file.read()
        filename = image.filename or "upload.png"
        return _service.explain_image(image_bytes, filename)
    except Exception as exc:
        # Surface the underlying error text so the UI can display it honestly.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Grad-CAM failed: {exc}",
        ) from exc


@router.get("/model-info")
def model_info() -> dict:
    """Metadata about the currently loaded model (version, training window,
    feature set). Used by the dashboard's transparency panel."""
    return _service.model_info()

