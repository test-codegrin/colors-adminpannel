import type {
  ActivityFeedData,
  ActivityFeedItem,
  AnalyticsOverview,
  ApiEnvelope,
  ApiErrorEnvelope,
  DayRange,
  DeviceAnalyticsPayload,
  FeatureUsageData,
  LiveUsersData,
  LocationsData,
  MessagesGrowthResponse,
  MinutesRange,
  PageViewsSummary,
  PaginatedItems,
  PerformanceData,
  RecentMessage,
  RecentPayment,
  RecentUser,
  RevenueGrowthResponse,
  SessionsSummary,
  TopPage,
  TrafficSourcesData,
  UserActivityData,
  UsersGrowthResponse,
} from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

import api from "@/lib/axios";

const FALLBACK_ERROR = "Failed to load analytics data.";
const DEFAULT_PAGE_SIZE = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeUserIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();

  return value.reduce<number[]>((result, item) => {
    const parsed =
      typeof item === "number"
        ? item
        : typeof item === "string" && item.trim()
          ? Number(item)
          : Number.NaN;

    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
      return result;
    }

    seen.add(parsed);
    result.push(parsed);

    return result;
  }, []);
}

function normalizeLiveUsersData(data: LiveUsersData): LiveUsersData {
  const userIds = normalizeUserIds(
    (data as LiveUsersData & { user_ids?: unknown }).user_ids,
  );
  const totalOnline =
    typeof data.total_online_users === "number" &&
    Number.isFinite(data.total_online_users)
      ? data.total_online_users
      : userIds.length;

  return {
    ...data,
    total_online_users: totalOnline,
    user_ids: userIds,
    active_users_now: data.active_users_now ?? totalOnline,
    active_sessions: data.active_sessions ?? totalOnline,
    users_last_5_minutes: data.users_last_5_minutes ?? totalOnline,
    users_last_30_minutes: data.users_last_30_minutes ?? totalOnline,
    logged_in_users_now: data.logged_in_users_now ?? totalOnline,
    guest_users_now: data.guest_users_now ?? 0,
    logged_in_users_last_30_minutes: data.logged_in_users_last_30_minutes ?? 0,
    guest_users_last_30_minutes: data.guest_users_last_30_minutes ?? 0,
    logged_in_active_sessions: data.logged_in_active_sessions ?? 0,
    guest_active_sessions: data.guest_active_sessions ?? 0,
    sessions_last_30_minutes: data.sessions_last_30_minutes ?? 0,
    sessions_per_user_now: data.sessions_per_user_now ?? 0,
  };
}

function normalizePagination(
  pagination: PaginationPayload | undefined,
  page: number,
  limit: number,
  itemCount: number,
): PaginationPayload {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = Math.max(0, pagination?.total ?? itemCount);
  const totalPages =
    pagination?.total_pages ??
    pagination?.totalPages ??
    Math.max(1, Math.ceil(Math.max(total, itemCount) / safeLimit));

  return {
    total,
    page: pagination?.page ?? safePage,
    limit: pagination?.limit ?? safeLimit,
    total_pages: totalPages,
    totalPages,
  };
}

async function fetchAnalytics<T>(
  path: string,
  params?: Record<string, number | undefined>,
): Promise<T> {
  const response = await api.get<ApiEnvelope<T> | ApiErrorEnvelope>(path, {
    params,
  });
  const payload = response.data;

  if (!isRecord(payload)) {
    throw new Error(FALLBACK_ERROR);
  }

  if (payload.success === false) {
    throw new Error(
      typeof payload.message === "string" ? payload.message : FALLBACK_ERROR,
    );
  }

  if (payload.success === true && "data" in payload) {
    return payload.data as T;
  }

  throw new Error(FALLBACK_ERROR);
}

export async function getAnalyticsOverview(
  days: DayRange,
): Promise<AnalyticsOverview> {
  return fetchAnalytics<AnalyticsOverview>("/admin/analytics/overview", {
    days,
  });
}

export async function getUsersGrowth(
  days: DayRange,
): Promise<UsersGrowthResponse["growth"]> {
  const data = await fetchAnalytics<UsersGrowthResponse>(
    "/admin/analytics/users-growth",
    { days },
  );

  return data.growth ?? [];
}

export async function getRevenueGrowth(
  days: DayRange,
): Promise<RevenueGrowthResponse["growth"]> {
  const data = await fetchAnalytics<RevenueGrowthResponse>(
    "/admin/analytics/revenue-growth",
    { days },
  );

  return data.growth ?? [];
}

export async function getMessagesGrowth(
  days: DayRange,
): Promise<MessagesGrowthResponse["growth"]> {
  const data = await fetchAnalytics<MessagesGrowthResponse>(
    "/admin/analytics/messages-growth",
    { days },
  );

  return data.growth ?? [];
}

export async function getPageViews(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PageViewsSummary> {
  return fetchAnalytics<PageViewsSummary>("/admin/analytics/page-views", {
    days,
    limit,
  });
}

export async function getTopPages(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<TopPage[]> {
  const data = await fetchAnalytics<{
    range_days: number;
    top_pages: TopPage[];
  }>("/admin/analytics/top-pages", { days, limit });

  return data.top_pages ?? [];
}

export async function getDevices(
  days: DayRange,
): Promise<DeviceAnalyticsPayload> {
  return fetchAnalytics<DeviceAnalyticsPayload>("/admin/analytics/devices", {
    days,
  });
}

export async function getDevicesAnalytics(
  days: DayRange,
): Promise<DeviceAnalyticsPayload> {
  return getDevices(days);
}

export async function getLiveUsers(): Promise<LiveUsersData> {
  const response = await api.get("/analytics/online-users");
  const payload = response.data;
  const data = isRecord(payload) && "data" in payload ? payload.data : payload;

  return normalizeLiveUsersData(data as LiveUsersData);
}

export async function getAnalyticsLiveUsers(): Promise<LiveUsersData> {
  return fetchAnalytics<LiveUsersData>("/admin/analytics/live-users");
}

export async function getFeatureUsage(
  days: DayRange,
): Promise<FeatureUsageData> {
  return fetchAnalytics<FeatureUsageData>("/admin/analytics/feature-usage", {
    days,
  });
}

export async function getUserActivity(): Promise<UserActivityData> {
  return fetchAnalytics<UserActivityData>("/admin/analytics/user-activity");
}

export async function getSessions(days: DayRange): Promise<SessionsSummary> {
  return fetchAnalytics<SessionsSummary>("/admin/analytics/sessions", { days });
}

export async function getLocations(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<LocationsData> {
  return fetchAnalytics<LocationsData>("/admin/analytics/locations", {
    days,
    limit,
  });
}

export async function getTrafficSources(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<TrafficSourcesData> {
  return fetchAnalytics<TrafficSourcesData>(
    "/admin/analytics/traffic-sources",
    {
      days,
      limit,
    },
  );
}

export async function getPerformance(
  minutes: MinutesRange,
): Promise<PerformanceData> {
  return fetchAnalytics<PerformanceData>("/admin/analytics/performance", {
    minutes,
  });
}

export async function getActivityFeed(limit = 50): Promise<ActivityFeedData> {
  const response = await api.get("/admin/analytics/activity-feed", {
    params: { limit },
  });
  const payload = response.data;

  if (isRecord(payload) && payload.success === true && isRecord(payload.data)) {
    return payload.data as unknown as ActivityFeedData;
  }

  if (
    isRecord(payload) &&
    payload.success === true &&
    Array.isArray(payload.data)
  ) {
    return { limit, items: payload.data as ActivityFeedItem[] };
  }

  if (isRecord(payload) && Array.isArray(payload.items)) {
    return payload as unknown as ActivityFeedData;
  }

  if (
    isRecord(payload) &&
    payload.success === true &&
    Array.isArray(payload.items)
  ) {
    return { limit, items: payload.items as ActivityFeedItem[] };
  }

  return { limit, items: [] };
}

export async function getRecentUsers(
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PaginatedItems<RecentUser>> {
  const data = await fetchAnalytics<{
    users: RecentUser[];
    pagination?: PaginationPayload;
  }>("/admin/analytics/recent-users", {
    page,
    limit,
  });

  return {
    items: data.users ?? [],
    pagination: normalizePagination(
      data.pagination,
      page,
      limit,
      data.users?.length ?? 0,
    ),
  };
}

export async function getRecentPayments(
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PaginatedItems<RecentPayment>> {
  const data = await fetchAnalytics<{
    payments: RecentPayment[];
    pagination?: PaginationPayload;
  }>("/admin/analytics/recent-payments", {
    page,
    limit,
  });

  return {
    items: data.payments ?? [],
    pagination: normalizePagination(
      data.pagination,
      page,
      limit,
      data.payments?.length ?? 0,
    ),
  };
}

export async function getRecentMessages(
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PaginatedItems<RecentMessage>> {
  const data = await fetchAnalytics<{
    messages: RecentMessage[];
    pagination?: PaginationPayload;
  }>("/admin/analytics/recent-messages", {
    page,
    limit,
  });

  return {
    items: data.messages ?? [],
    pagination: normalizePagination(
      data.pagination,
      page,
      limit,
      data.messages?.length ?? 0,
    ),
  };
}

export function getAnalyticsErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return err.response?.data?.message ?? FALLBACK_ERROR;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return FALLBACK_ERROR;
}
