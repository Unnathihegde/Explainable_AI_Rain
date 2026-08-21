import type { ModelInfoResponse, PredictionRequest, PredictionResponse } from "../types/api";
import { apiClient, API_V1 } from "./client";
import { toApiError } from "./errors";

export async function createPrediction(body: PredictionRequest): Promise<PredictionResponse> {
  try {
    const { data } = await apiClient.post<PredictionResponse>(`${API_V1}/predictions`, body);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getModelInfo(): Promise<ModelInfoResponse> {
  try {
    const { data } = await apiClient.get<ModelInfoResponse>(`${API_V1}/predictions/model-info`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
