import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { AxiosError } from "axios";

import api from "@/lib/axios";

function shouldTryNextPath(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

function getUniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

export async function getWithFallback<T>(
  paths: string[],
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const uniquePaths = getUniquePaths(paths);

  let lastError: unknown = new Error("Request path is required.");

  for (const [index, path] of uniquePaths.entries()) {
    try {
      return await api.get<T>(path, config);
    } catch (error) {
      lastError = error;

      if (!shouldTryNextPath(error) || index === uniquePaths.length - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function deleteWithFallback<T>(
  paths: string[],
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const uniquePaths = getUniquePaths(paths);

  let lastError: unknown = new Error("Request path is required.");

  for (const [index, path] of uniquePaths.entries()) {
    try {
      return await api.delete<T>(path, config);
    } catch (error) {
      lastError = error;

      if (!shouldTryNextPath(error) || index === uniquePaths.length - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}
