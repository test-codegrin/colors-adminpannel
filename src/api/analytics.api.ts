import type {
  ActivityFeedData,
  AnalyticsOverview,
  DayRange,
  DeviceAnalyticsPayload,
  FeatureUsageData,
  LiveUsersData,
  LocationsData,
  MessagesGrowthResponse,
  MinutesRange,
  PageViewsSummary,
  PerformanceData,
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface RecentUsersPayload {
  users: RecentUser[];
  pagination: PaginationPayload;
}

interface RecentPaymentsPayload {
  payments: RecentPayment[];
  pagination: PaginationPayload;
}

export async function getAnalyticsOverview(
  days: DayRange,
): Promise<ApiResponse<AnalyticsOverview>> {
  const response = await api.get<ApiResponse<AnalyticsOverview>>(
    "/admin/analytics/overview",
    { params: { days } },
  );

  return response.data;
}

export async function getUsersGrowth(
  days: DayRange,
): Promise<ApiResponse<UsersGrowthResponse>> {
  const response = await api.get<ApiResponse<UsersGrowthResponse>>(
    "/admin/analytics/users-growth",
    { params: { days } },
  );

  return response.data;
}

export async function getRevenueGrowth(
  days: DayRange,
): Promise<ApiResponse<RevenueGrowthResponse>> {
  const response = await api.get<ApiResponse<RevenueGrowthResponse>>(
    "/admin/analytics/revenue-growth",
    { params: { days } },
  );

  return response.data;
}

export async function getMessagesGrowth(
  days: DayRange,
): Promise<ApiResponse<MessagesGrowthResponse>> {
  const response = await api.get<ApiResponse<MessagesGrowthResponse>>(
    "/admin/analytics/messages-growth",
    { params: { days } },
  );

  return response.data;
}

export async function getPageViews(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<PageViewsSummary>> {
  const response = await api.get<ApiResponse<PageViewsSummary>>(
    "/admin/analytics/page-views",
    { params: { days, limit } },
  );

  return response.data;
}

export async function getTopPages(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<{ range_days: number; top_pages: TopPage[] }>> {
  const response = await api.get<
    ApiResponse<{ range_days: number; top_pages: TopPage[] }>
  >("/admin/analytics/top-pages", { params: { days, limit } });

  return response.data;
}

export async function getDevices(
  days: DayRange,
): Promise<ApiResponse<DeviceAnalyticsPayload>> {
  const response = await api.get<ApiResponse<DeviceAnalyticsPayload>>(
    "/admin/analytics/devices",
    { params: { days } },
  );

  return response.data;
}

export async function getDevicesAnalytics(
  days: DayRange,
): Promise<ApiResponse<DeviceAnalyticsPayload>> {
  return getDevices(days);
}

export async function getOnlineUsers(): Promise<ApiResponse<LiveUsersData>> {
  const response = await api.get<ApiResponse<LiveUsersData>>(
    "/analytics/online-users",
  );

  return response.data;
}

export async function getLiveUsers(): Promise<ApiResponse<LiveUsersData>> {
  return getOnlineUsers();
}

export async function getAnalyticsLiveUsers(): Promise<ApiResponse<LiveUsersData>> {
  const response = await api.get<ApiResponse<LiveUsersData>>(
    "/admin/analytics/live-users",
  );

  return response.data;
}

export async function getFeatureUsage(
  days: DayRange,
): Promise<ApiResponse<FeatureUsageData>> {
  const response = await api.get<ApiResponse<FeatureUsageData>>(
    "/admin/analytics/feature-usage",
    { params: { days } },
  );

  return response.data;
}

export async function getUserActivity(): Promise<ApiResponse<UserActivityData>> {
  const response = await api.get<ApiResponse<UserActivityData>>(
    "/admin/analytics/user-activity",
  );

  return response.data;
}

export async function getSessions(
  days: DayRange,
): Promise<ApiResponse<SessionsSummary>> {
  const response = await api.get<ApiResponse<SessionsSummary>>(
    "/admin/analytics/sessions",
    { params: { days } },
  );

  return response.data;
}

export async function getLocations(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<LocationsData>> {
  const response = await api.get<ApiResponse<LocationsData>>(
    "/admin/analytics/locations",
    { params: { days, limit } },
  );

  return response.data;
}

export async function getTrafficSources(
  days: DayRange,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<TrafficSourcesData>> {
  const response = await api.get<ApiResponse<TrafficSourcesData>>(
    "/admin/analytics/traffic-sources",
    { params: { days, limit } },
  );

  return response.data;
}

export async function getPerformance(
  minutes: MinutesRange,
): Promise<ApiResponse<PerformanceData>> {
  const response = await api.get<ApiResponse<PerformanceData>>(
    "/admin/analytics/performance",
    { params: { minutes } },
  );

  return response.data;
}

export async function getActivityFeed(
  limit = 50,
): Promise<ApiResponse<ActivityFeedData>> {
  const response = await api.get<ApiResponse<ActivityFeedData>>(
    "/admin/analytics/activity-feed",
    { params: { limit } },
  );

  return response.data;
}

export async function getRecentUsers(
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<RecentUsersPayload>> {
  const response = await api.get<ApiResponse<RecentUsersPayload>>(
    "/admin/analytics/recent-users",
    { params: { page, limit } },
  );

  return response.data;
}

export async function getRecentPayments(
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<ApiResponse<RecentPaymentsPayload>> {
  const response = await api.get<ApiResponse<RecentPaymentsPayload>>(
    "/admin/analytics/recent-payments",
    { params: { page, limit } },
  );

  return response.data;
}

export function getAnalyticsErrorMessage(error: unknown): string {
  console.error(error);
  return FALLBACK_ERROR;
}
