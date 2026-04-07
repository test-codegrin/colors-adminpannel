import type {
  CaseStudiesApiResponse,
  CaseStudy,
  CaseStudyOverview,
  CaseStudyOverviewHighlight,
  CaseStudyOverviewQuote,
  CaseStudyPayload,
  CaseStudyProcess,
  CaseStudyProcessStep,
  CaseStudyProjectInfo,
  CaseStudyResultComparison,
  CaseStudyResults,
  CaseStudyResultStat,
  CaseStudyStatus,
  CaseStudyTeamMember,
  GetCaseStudiesParams,
  SingleCaseStudyApiResponse,
} from "@/types/caseStudies.types";

import api from "@/lib/axios";

interface CaseStudyMutationResponse {
  caseStudy?: CaseStudy;
  data?: CaseStudy;
  message?: string;
  success: boolean;
}

interface DeleteCaseStudyApiResponse {
  message?: string;
  success: boolean;
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

function toOptionalInteger(value: unknown): number | undefined {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return Math.floor(parsed);
  }

  return undefined;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

/**
 * FIX: Extended normalizeStatus to handle all common backend formats.
 * Previously only handled numeric 1 and string "1".
 * Backends may return: boolean true, string "published"/"active"/"enabled",
 * numeric 2+ (any positive int treated as published), etc.
 */
function normalizeStatus(value: unknown): CaseStudyStatus {
  if (value === 1 || value === "1" || value === true) return 1;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (
      lower === "published" ||
      lower === "active" ||
      lower === "enabled" ||
      lower === "public"
    ) {
      return 1;
    }
    if (
      lower === "draft" ||
      lower === "inactive" ||
      lower === "disabled" ||
      lower === "private" ||
      lower === "0"
    ) {
      return 0;
    }
    const num = Number(lower);
    if (!isNaN(num)) return num > 0 ? 1 : 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }
  return 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeOverviewQuote(
  value: unknown,
): CaseStudyOverviewQuote | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const text = typeof value.text === "string" ? value.text : "";
  const author = typeof value.author === "string" ? value.author : "";
  const role = typeof value.role === "string" ? value.role : "";

  if (!text && !author && !role) {
    return undefined;
  }

  return { author, role, text };
}

function normalizeOverviewHighlight(
  value: unknown,
): CaseStudyOverviewHighlight | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = typeof value.label === "string" ? value.label : "";
  const detail = typeof value.detail === "string" ? value.detail : "";

  if (!label && !detail) {
    return null;
  }

  return { detail, label };
}

function normalizeOverview(value: unknown): CaseStudyOverview {
  if (!isRecord(value)) {
    return { paragraphs: [] };
  }

  const highlights = Array.isArray(value.highlights)
    ? value.highlights
        .map((entry) => normalizeOverviewHighlight(entry))
        .filter((entry): entry is CaseStudyOverviewHighlight => entry !== null)
    : [];
  const quote = normalizeOverviewQuote(value.quote);
  const overview: CaseStudyOverview = {
    paragraphs: normalizeStringArray(value.paragraphs),
  };

  if (quote) {
    overview.quote = quote;
  }

  if (highlights.length > 0) {
    overview.highlights = highlights;
  }

  return overview;
}

function normalizeProcessStep(value: unknown): CaseStudyProcessStep | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title : "";
  const description =
    typeof value.description === "string" ? value.description : "";

  if (!title && !description) {
    return null;
  }

  return { description, title };
}

function normalizeProcess(value: unknown): CaseStudyProcess {
  if (!isRecord(value)) {
    return { steps: [] };
  }

  return {
    intro: typeof value.intro === "string" ? value.intro : undefined,
    steps: Array.isArray(value.steps)
      ? value.steps
          .map((entry) => normalizeProcessStep(entry))
          .filter((entry): entry is CaseStudyProcessStep => entry !== null)
      : [],
  };
}

function normalizeResultStat(value: unknown): CaseStudyResultStat | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = typeof value.label === "string" ? value.label : "";
  const statValue = typeof value.value === "string" ? value.value : "";
  const description =
    typeof value.description === "string" ? value.description : undefined;

  if (!label && !statValue && !description) {
    return null;
  }

  return {
    description,
    label,
    value: statValue,
  };
}

function normalizeResultComparison(
  value: unknown,
): CaseStudyResultComparison | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = typeof value.label === "string" ? value.label : "";
  const before = toNonNegativeInteger(value.before, 0);
  const after = toNonNegativeInteger(value.after, 0);

  if (!label && before === 0 && after === 0) {
    return null;
  }

  return {
    after,
    before,
    label,
  };
}

function normalizeResults(value: unknown): CaseStudyResults | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const stats = Array.isArray(value.stats)
    ? value.stats
        .map((entry) => normalizeResultStat(entry))
        .filter((entry): entry is CaseStudyResultStat => entry !== null)
    : [];
  const comparisons = Array.isArray(value.comparisons)
    ? value.comparisons
        .map((entry) => normalizeResultComparison(entry))
        .filter((entry): entry is CaseStudyResultComparison => entry !== null)
    : [];
  const intro = typeof value.intro === "string" ? value.intro : undefined;

  if (!intro && stats.length === 0 && comparisons.length === 0) {
    return undefined;
  }

  return {
    comparisons,
    intro,
    stats,
  };
}

function normalizeProjectInfo(value: unknown): CaseStudyProjectInfo {
  if (!isRecord(value)) {
    return {};
  }

  return {
    client: typeof value.client === "string" ? value.client : undefined,
    deliverables:
      typeof value.deliverables === "string" ? value.deliverables : undefined,
    duration: typeof value.duration === "string" ? value.duration : undefined,
    projectType:
      typeof value.projectType === "string" ? value.projectType : undefined,
    published:
      typeof value.published === "string" ? value.published : undefined,
    readTime: typeof value.readTime === "string" ? value.readTime : undefined,
    services: normalizeStringArray(value.services),
    timeline: typeof value.timeline === "string" ? value.timeline : undefined,
  };
}

function normalizeTeamMember(value: unknown): CaseStudyTeamMember | null {
  if (!isRecord(value)) {
    if (typeof value === "string") {
      const parts = value.split(/::|:|-/).map((p) => p.trim());
      if (parts.length >= 2) {
        return { name: parts[0], role: parts.slice(1).join(" ") };
      }
      return { name: value, role: "" };
    }
    return null;
  }

  const name = String(
    value.name ?? value.full_name ?? value.fullname ?? value.fullName ?? "",
  ).trim();
  const role = String(
    value.role ?? value.job_title ?? value.position ?? "",
  ).trim();
  const color = typeof value.color === "string" ? value.color : undefined;
  const initials =
    typeof value.initials === "string" ? value.initials : undefined;

  if (!name && !role && !color && !initials) {
    return null;
  }

  return {
    color,
    initials,
    name,
    role,
  };
}

function normalizeCaseStudy(value: unknown): CaseStudy | null {
  if (!isRecord(value)) {
    return null;
  }

  const v = value as Record<string, any>;
  const idRaw =
    v.id ??
    v._id ??
    v.case_study_id ??
    v.caseStudy_id ??
    v.id_case_study ??
    v.ID ??
    v.casestudyId ??
    v.CaseStudyId;

  const id = idRaw !== undefined && idRaw !== null ? Number(idRaw) : NaN;

  if (isNaN(id) || !Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    client: typeof v.client === "string" ? v.client : "",
    createdAt:
      typeof v.createdAt === "string"
        ? v.createdAt
        : typeof v.created_at === "string"
          ? v.created_at
          : undefined,
    date: typeof v.date === "string" ? v.date : "",
    featured: normalizeBoolean(v.featured),
    industry: typeof v.industry === "string" ? v.industry : "",
    overview: normalizeOverview(v.overview),
    palette: normalizeStringArray(v.palette),
    paletteNames: normalizeStringArray(v.paletteNames ?? v.palette_names),
    process: normalizeProcess(v.process),
    projectInfo: normalizeProjectInfo(v.projectInfo ?? v.project_info),
    publishedAt:
      typeof v.publishedAt === "string" || v.publishedAt === null
        ? v.publishedAt
        : typeof v.published_at === "string" || v.published_at === null
          ? v.published_at
          : undefined,
    readTime:
      typeof v.readTime === "string"
        ? v.readTime
        : typeof v.read_time === "string"
          ? v.read_time
          : "",
    results: normalizeResults(v.results),
    sortOrder: toOptionalInteger(v.sortOrder ?? v.sort_order),
    status: normalizeStatus(v.status),
    summary: typeof v.summary === "string" ? v.summary : "",
    tags: normalizeStringArray(v.tags),
    team: (() => {
      const collection =
        v.team ?? v.team_members ?? v.teamMembers ?? v.members ?? v.team_list;
      return Array.isArray(collection)
        ? collection
            .map((entry) => normalizeTeamMember(entry))
            .filter((entry): entry is CaseStudyTeamMember => entry !== null)
        : [];
    })(),
    title: typeof v.title === "string" ? v.title : "",
    updatedAt:
      typeof v.updatedAt === "string"
        ? v.updatedAt
        : typeof v.updated_at === "string"
          ? v.updated_at
          : undefined,
  };
}

function extractCaseStudies(raw: unknown): CaseStudy[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeCaseStudy(entry))
      .filter((entry): entry is CaseStudy => entry !== null);
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.data)) {
    return raw.data
      .map((entry) => normalizeCaseStudy(entry))
      .filter((entry): entry is CaseStudy => entry !== null);
  }

  const items = (() => {
    if (Array.isArray(raw.caseStudies)) return raw.caseStudies;
    if (Array.isArray(raw.case_studies)) return raw.case_studies;
    if (Array.isArray(raw.items)) return raw.items;
    if (isRecord(raw.data)) {
      if (Array.isArray(raw.data.caseStudies)) return raw.data.caseStudies;
      if (Array.isArray(raw.data.case_studies)) return raw.data.case_studies;
      if (Array.isArray(raw.data.items)) return raw.data.items;
    }
    return null;
  })();

  if (!items) return [];

  const normalized = items
    .map((entry) => normalizeCaseStudy(entry))
    .filter((entry): entry is CaseStudy => entry !== null);

  // DE-DUPLICATE IDs to prevent React render errors
  const seen = new Set<number>();
  return normalized.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function extractSingleCaseStudy(raw: unknown): CaseStudy | null {
  const direct = normalizeCaseStudy(raw);

  if (direct) {
    return direct;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const candidates = [raw.caseStudy, raw.data, raw.item];

  for (const candidate of candidates) {
    const normalized = normalizeCaseStudy(candidate);

    if (normalized) {
      return normalized;
    }
  }

  if (isRecord(raw.data)) {
    const nestedCandidates = [raw.data.caseStudy, raw.data.item];

    for (const candidate of nestedCandidates) {
      const normalized = normalizeCaseStudy(candidate);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function normalizeCaseStudiesResponse(
  raw: unknown,
  requestedPage: number,
  requestedPerPage: number,
): CaseStudiesApiResponse {
  const caseStudies = extractCaseStudies(raw);
  const total = toNonNegativeInteger(
    isRecord(raw)
      ? (raw.total ??
          (isRecord(raw.data) ? raw.data.total : undefined) ??
          (isRecord(raw.pagination) ? raw.pagination.total : undefined))
      : undefined,
    caseStudies.length,
  );
  const page = toPositiveInteger(
    isRecord(raw)
      ? (raw.page ??
          raw.currentPage ??
          raw.current_page ??
          (isRecord(raw.pagination)
            ? (raw.pagination.page ??
              raw.pagination.currentPage ??
              raw.pagination.current_page)
            : undefined))
      : undefined,
    requestedPage,
  );
  const perPage = toPositiveInteger(
    isRecord(raw)
      ? (raw.per_page ??
          raw.perPage ??
          raw.limit ??
          (isRecord(raw.pagination)
            ? (raw.pagination.per_page ??
              raw.pagination.perPage ??
              raw.pagination.limit)
            : undefined))
      : undefined,
    requestedPerPage,
  );
  const totalPages = toPositiveInteger(
    isRecord(raw)
      ? (raw.total_pages ??
          raw.totalPages ??
          (isRecord(raw.pagination)
            ? (raw.pagination.total_pages ?? raw.pagination.totalPages)
            : undefined))
      : undefined,
    Math.max(Math.ceil(Math.max(total, caseStudies.length) / perPage), 1),
  );

  return {
    data: caseStudies,
    page,
    pagination: {
      limit: perPage,
      page,
      total,
      total_pages: totalPages,
      totalPages: totalPages,
    },
    per_page: perPage,
    success: isRecord(raw) ? (raw.success as boolean | undefined) : undefined,
    total,
    total_pages: totalPages,
  };
}

export async function getCaseStudies(
  params: GetCaseStudiesParams,
): Promise<CaseStudiesApiResponse> {
  const response = await api.get<unknown>("/admin/case-studies", {
    params,
  });

  return normalizeCaseStudiesResponse(
    response.data,
    params.page,
    params.per_page,
  );
}

export async function getCaseStudyById(id: number): Promise<CaseStudy> {
  const response = await api.get<CaseStudy | SingleCaseStudyApiResponse>(
    `/admin/case-studies/${id}`,
  );
  const caseStudy = extractSingleCaseStudy(response.data);

  if (!caseStudy) {
    throw new Error("Case study not found.");
  }

  return caseStudy;
}

export async function createCaseStudy(
  payload: CaseStudyPayload,
): Promise<CaseStudyMutationResponse> {
  const response = await api.post<CaseStudyMutationResponse>(
    "/admin/case-studies",
    payload,
  );

  return response.data;
}

export async function updateCaseStudyById(
  id: number,
  payload: CaseStudyPayload,
): Promise<CaseStudyMutationResponse> {
  const response = await api.patch<CaseStudyMutationResponse>(
    `/admin/case-studies/${id}`,
    payload,
  );

  return response.data;
}

/**
 * FIX: Explicitly cast status to number before sending to API.
 * This ensures the payload always sends { status: 0 } or { status: 1 }
 * as a proper number, not a string or boolean, regardless of TypeScript inference.
 */
export async function updateCaseStudyStatus(
  id: number,
  status: CaseStudyStatus,
): Promise<CaseStudyMutationResponse> {
  const response = await api.patch<CaseStudyMutationResponse>(
    `/admin/case-studies/${id}`,
    {
      status: status === 1 ? 1 : 0,
    },
  );

  return response.data;
}

export async function deleteCaseStudyById(
  id: number,
): Promise<DeleteCaseStudyApiResponse> {
  const response = await api.delete<DeleteCaseStudyApiResponse>(
    `/admin/case-studies/${id}`,
  );

  return response.data;
}

export function getCaseStudiesErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          error?: string;
          errors?: unknown;
        };
      };
    };

    const data = err.response?.data;
    const status = err.response?.status;

    if (data) {
      // For 422: extract field-level validation errors (more specific than generic message)
      if (status === 422 && data.errors) {
        const errors = data.errors;

        if (typeof errors === "string") return errors;

        if (Array.isArray(errors) && errors.length > 0) {
          return errors
            .map((e: unknown) =>
              typeof e === "string"
                ? e
                : ((e as { message?: string }).message ?? String(e)),
            )
            .filter(Boolean)
            .join(". ");
        }

        if (typeof errors === "object" && !Array.isArray(errors)) {
          const all: string[] = [];
          for (const fieldErrors of Object.values(
            errors as Record<string, unknown>,
          )) {
            if (Array.isArray(fieldErrors)) {
              for (const fe of fieldErrors) {
                if (typeof fe === "string") all.push(fe);
              }
            } else if (typeof fieldErrors === "string") {
              all.push(fieldErrors);
            }
          }
          if (all.length > 0) return all.slice(0, 3).join(". ");
        }
      }

      if (typeof data.message === "string" && data.message) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error) {
        return data.error;
      }
    }

    return "Failed to process case studies request.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to process case studies request.";
}
