import type {
  ColorStory,
  ColorStoryCategory,
  ColorStoryPayload,
  ColorStoryStatus,
  GetColorStoriesParams,
} from "@/types/colorStories.types";

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

export async function getColorStories(
  params: GetColorStoriesParams,
): Promise<PaginatedApiResponse<ColorStory>> {
  const response = await api.get<PaginatedApiResponse<ColorStory>>(
    "/admin/color-stories",
    { params },
  );

  return response.data;
}

export async function getColorStoryById(
  id: number,
): Promise<ApiResponse<ColorStory>> {
  const response = await api.get<ApiResponse<ColorStory>>(
    `/admin/color-stories/${id}`,
  );

  return response.data;
}

export async function getColorStoryCategories(
  search?: string,
): Promise<ApiResponse<ColorStoryCategory[]>> {
  const response = await api.get<ApiResponse<ColorStoryCategory[]>>(
    "/admin/color-stories/categories",
    {
      params: search?.trim() ? { search: search.trim() } : undefined,
    },
  );

  return response.data;
}

export async function createColorStory(
  payload: ColorStoryPayload,
): Promise<ApiResponse<ColorStory>> {
  const response = await api.post<ApiResponse<ColorStory>>(
    "/admin/color-stories",
    payload,
  );

  return response.data;
}

export async function updateColorStoryById(
  id: number,
  payload: ColorStoryPayload,
): Promise<ApiResponse<ColorStory>> {
  const response = await api.patch<ApiResponse<ColorStory>>(
    `/admin/color-stories/${id}`,
    payload,
  );

  return response.data;
}

export async function updateColorStoryStatus(
  id: number,
  status: ColorStoryStatus,
): Promise<ApiResponse<ColorStory>> {
  const response = await api.patch<ApiResponse<ColorStory>>(
    `/admin/color-stories/${id}/status`,
    { status },
  );

  return response.data;
}

export async function deleteColorStoryById(
  id: number,
): Promise<ApiResponse<{ id: number }>> {
  const response = await api.delete<ApiResponse<{ id: number }>>(
    `/admin/color-stories/${id}`,
  );

  return response.data;
}

export async function createColorStoryCategory(
  name: string,
): Promise<ApiResponse<ColorStoryCategory>> {
  const response = await api.post<ApiResponse<ColorStoryCategory>>(
    "/admin/color-stories/categories",
    { name },
  );

  return response.data;
}

export async function updateColorStoryCategoryById(
  id: number,
  name: string,
): Promise<ApiResponse<ColorStoryCategory>> {
  const response = await api.patch<ApiResponse<ColorStoryCategory>>(
    `/admin/color-stories/categories/${id}`,
    { name },
  );

  return response.data;
}

export async function deleteColorStoryCategoryById(
  id: number,
): Promise<ApiResponse<{ id: number }>> {
  const response = await api.delete<ApiResponse<{ id: number }>>(
    `/admin/color-stories/categories/${id}`,
  );

  return response.data;
}

export function getColorStoriesErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to process color stories request.";
}
