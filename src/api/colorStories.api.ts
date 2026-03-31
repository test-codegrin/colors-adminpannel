import type {
  ColorStoriesApiResponse,
  ColorStory,
  ColorStoryAuthor,
  ColorStoryPayload,
  ColorStoryStatus,
  GetColorStoriesParams,
  SingleColorStoryApiResponse,
} from "@/types/colorStories.types";

import api from "@/lib/axios";

interface ColorStoryMutationResponse {
  success: boolean;
  message?: string;
  data?: ColorStory;
  story?: ColorStory;
  colorStory?: ColorStory;
}

interface DeleteColorStoryApiResponse {
  success: boolean;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function normalizeStatus(value: unknown): ColorStoryStatus {
  return value === 1 || value === "1" ? 1 : 0;
}

function normalizeAuthor(value: unknown): ColorStoryAuthor {
  if (!isRecord(value)) {
    return {
      name: "",
    };
  }

  return {
    name: typeof value.name === "string" ? value.name : "",
    avatar: typeof value.avatar === "string" ? value.avatar : undefined,
    readTime:
      typeof value.readTime === "string" ? value.readTime : undefined,
    date: typeof value.date === "string" ? value.date : undefined,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeColorStory(value: unknown): ColorStory | null {
  if (!isRecord(value)) {
    return null;
  }

  const idCandidate = value.id;

  if (typeof idCandidate !== "number" || !Number.isFinite(idCandidate)) {
    return null;
  }

  return {
    id: idCandidate,
    title: typeof value.title === "string" ? value.title : "",
    excerpt: typeof value.excerpt === "string" ? value.excerpt : "",
    palette: normalizeStringArray(value.palette),
    category: typeof value.category === "string" ? value.category : "",
    author: normalizeAuthor(value.author),
    tags: normalizeStringArray(value.tags),
    status: normalizeStatus(value.status),
    published_at:
      typeof value.published_at === "string" || value.published_at === null
        ? value.published_at
        : undefined,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : "",
  };
}

function extractColorStories(raw: unknown): ColorStory[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeColorStory(entry))
      .filter((story): story is ColorStory => story !== null);
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.data)) {
    return raw.data
      .map((entry) => normalizeColorStory(entry))
      .filter((story): story is ColorStory => story !== null);
  }

  if (Array.isArray(raw.stories)) {
    return raw.stories
      .map((entry) => normalizeColorStory(entry))
      .filter((story): story is ColorStory => story !== null);
  }

  if (Array.isArray(raw.colorStories)) {
    return raw.colorStories
      .map((entry) => normalizeColorStory(entry))
      .filter((story): story is ColorStory => story !== null);
  }

  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.stories)) {
      return raw.data.stories
        .map((entry) => normalizeColorStory(entry))
        .filter((story): story is ColorStory => story !== null);
    }

    if (Array.isArray(raw.data.colorStories)) {
      return raw.data.colorStories
        .map((entry) => normalizeColorStory(entry))
        .filter((story): story is ColorStory => story !== null);
    }
  }

  return [];
}

function extractSingleColorStory(raw: unknown): ColorStory | null {
  const direct = normalizeColorStory(raw);

  if (direct) {
    return direct;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const candidates = [raw.story, raw.colorStory, raw.data];

  for (const candidate of candidates) {
    const normalized = normalizeColorStory(candidate);

    if (normalized) {
      return normalized;
    }
  }

  if (isRecord(raw.data)) {
    const nestedCandidates = [raw.data.story, raw.data.colorStory];

    for (const candidate of nestedCandidates) {
      const normalized = normalizeColorStory(candidate);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function normalizeColorStoriesResponse(
  raw: unknown,
  requestedPage: number,
  requestedPerPage: number,
): ColorStoriesApiResponse {
  const stories = extractColorStories(raw);
  const total = toNonNegativeInteger(
    isRecord(raw)
      ? raw.total ??
          (isRecord(raw.data) ? raw.data.total : undefined) ??
          (isRecord(raw.pagination) ? raw.pagination.total : undefined)
      : undefined,
    stories.length,
  );
  const page = toPositiveInteger(
    isRecord(raw)
      ? raw.page ??
          raw.currentPage ??
          raw.current_page ??
          (isRecord(raw.pagination)
            ? raw.pagination.page ??
              raw.pagination.currentPage ??
              raw.pagination.current_page
            : undefined)
      : undefined,
    requestedPage,
  );
  const perPage = toPositiveInteger(
    isRecord(raw)
      ? raw.per_page ??
          raw.perPage ??
          raw.limit ??
          (isRecord(raw.pagination)
            ? raw.pagination.per_page ??
              raw.pagination.perPage ??
              raw.pagination.limit
            : undefined)
      : undefined,
    requestedPerPage,
  );
  const totalPages = toPositiveInteger(
    isRecord(raw)
      ? raw.total_pages ??
          raw.totalPages ??
          (isRecord(raw.pagination)
            ? raw.pagination.total_pages ?? raw.pagination.totalPages
            : undefined)
      : undefined,
    Math.max(Math.ceil(Math.max(total, stories.length) / perPage), 1),
  );

  return {
    success: isRecord(raw) ? (raw.success as boolean | undefined) : undefined,
    page,
    per_page: perPage,
    total,
    total_pages: totalPages,
    data: stories,
    pagination: {
      total,
      page,
      limit: perPage,
      total_pages: totalPages,
      totalPages: totalPages,
    },
  };
}

export async function getColorStories(
  params: GetColorStoriesParams,
): Promise<ColorStoriesApiResponse> {
  const response = await api.get<unknown>("/admin/color-stories", {
    params,
  });

  return normalizeColorStoriesResponse(
    response.data,
    params.page,
    params.per_page,
  );
}

export async function getColorStoryById(id: number): Promise<ColorStory> {
  const response = await api.get<ColorStory | SingleColorStoryApiResponse>(
    `/admin/color-stories/${id}`,
  );
  const story = extractSingleColorStory(response.data);

  if (!story) {
    throw new Error("Color story not found.");
  }

  return story;
}

export async function createColorStory(
  payload: ColorStoryPayload,
): Promise<ColorStoryMutationResponse> {
  const response = await api.post<ColorStoryMutationResponse>(
    "/admin/color-stories",
    payload,
  );

  return response.data;
}

export async function updateColorStoryById(
  id: number,
  payload: ColorStoryPayload,
): Promise<ColorStoryMutationResponse> {
  const response = await api.patch<ColorStoryMutationResponse>(
    `/admin/color-stories/${id}`,
    payload,
  );

  return response.data;
}

export async function updateColorStoryStatus(
  id: number,
  status: ColorStoryStatus,
): Promise<ColorStoryMutationResponse> {
  const response = await api.patch<ColorStoryMutationResponse>(
    `/admin/color-stories/${id}/status`,
    {
      status,
    },
  );

  return response.data;
}

export async function deleteColorStoryById(
  id: number,
): Promise<DeleteColorStoryApiResponse> {
  const response = await api.delete<DeleteColorStoryApiResponse>(
    `/admin/color-stories/${id}`,
  );

  return response.data;
}

export function getColorStoriesErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return (
      err.response?.data?.message ?? "Failed to process color stories request."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to process color stories request.";
}
