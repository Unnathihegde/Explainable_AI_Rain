import type { AlertResponse } from "../types/api";
import { apiClient, API_V1 } from "./client";
import { toApiError } from "./errors";

export async function getActiveAlerts(): Promise<AlertResponse[]> {
  try {
    const { data } = await apiClient.get<AlertResponse[]>(`${API_V1}/alerts`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
