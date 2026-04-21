import type {
  CaseStudy,
  CaseStudyPayload,
  CaseStudyStatus,
  GetCaseStudiesParams,
} from "@/types/caseStudies.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
}

export async function getCaseStudies(
  params: GetCaseStudiesParams,
): Promise<PaginatedApiResponse<CaseStudy>> {
  const queryParams: Record<string, number | string> = {
    page: params.page,
    per_page: params.per_page,
  };

  if (params.search?.trim()) {
    queryParams.search = params.search.trim();
  }

  if (params.status && params.status.length > 0) {
    queryParams.status = params.status[0].toString();
  }

  const response = await api.get<PaginatedApiResponse<CaseStudy>>(
    "/admin/case-studies",
    { params: queryParams, signal: params.signal },
  );

  return response.data;
}

export async function getCaseStudyById(
  id: number,
): Promise<ApiResponse<CaseStudy>> {
  const response = await api.get<ApiResponse<CaseStudy>>(
    `/admin/case-studies/${id}`,
  );

  return response.data;
}

export async function createCaseStudy(
  payload: CaseStudyPayload,
): Promise<ApiResponse<CaseStudy>> {
  const response = await api.post<ApiResponse<CaseStudy>>(
    "/admin/case-studies",
    payload,
  );

  return response.data;
}

export async function updateCaseStudyById(
  id: number,
  payload: CaseStudyPayload,
): Promise<ApiResponse<CaseStudy>> {
  const response = await api.patch<ApiResponse<CaseStudy>>(
    `/admin/case-studies/${id}`,
    payload,
  );

  return response.data;
}

export async function updateCaseStudyStatus(
  id: number,
  status: CaseStudyStatus,
): Promise<ApiResponse<CaseStudy>> {
  const response = await api.patch<ApiResponse<CaseStudy>>(
    `/admin/case-studies/${id}`,
    { status },
  );

  return response.data;
}

export async function deleteCaseStudyById(
  id: number,
): Promise<ApiResponse<{ id: number }>> {
  const response = await api.delete<ApiResponse<{ id: number }>>(
    `/admin/case-studies/${id}`,
  );

  return response.data;
}

export function getCaseStudiesErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to process case studies request.";
}

export function isCaseStudiesRequestCancelled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED",
  );
}