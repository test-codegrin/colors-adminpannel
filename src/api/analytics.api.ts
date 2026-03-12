import api from "@/lib/axios";
import type {
  AnalyticsOverview,
  ApiEnvelope,
  DayRange,
  MessagesGrowthPoint,
  PaginatedItems,
  RecentMessage,
  RecentPayment,
  RecentUser,
  RevenueGrowthPoint,
  UsersGrowthPoint,
} from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

const FALLBACK_ERROR = "Failed to load analytics data.";

type GrowthMetricKey =
  | "users"
  | "totalUsers"
  | "newUsers"
  | "revenue"
  | "totalRevenue"
  | "messages"
  | "totalMessages"
  | "payments"
  | "paymentCount"
  | "count"
  | "amount"
  | "value"
  | "total_users"
  | "total_revenue"
  | "total_messages"
  | "payment_count"
  | "total_payments";

type OverviewMetricKey =
  | "total_users"
  | "totalUsers"
  | "new_users_today"
  | "newUsersToday"
  | "new_users_7d"
  | "newUsers7d"
  | "active_users"
  | "activeUsers"
  | "total_payments"
  | "totalPayments"
  | "paid_users"
  | "paidUsers"
  | "total_revenue"
  | "totalRevenue"
  | "revenue_7d"
  | "revenue7d"
  | "revenue_30d"
  | "revenue30d"
  | "total_messages"
  | "totalMessages"
  | "messages_today"
  | "messagesToday"
  | "messages_7d"
  | "messages7d";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function getMetricValue(
  record: Record<string, unknown>,
  keys: readonly GrowthMetricKey[],
  fallback = 0,
): number {
  for (const key of keys) {
    const parsed = toNumber(record[key], Number.NaN);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getOptionalMetricValue(
  record: Record<string, unknown>,
  keys: readonly GrowthMetricKey[],
): number | undefined {
  for (const key of keys) {
    const parsed = toNumber(record[key], Number.NaN);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getOverviewMetricValue(
  record: Record<string, unknown>,
  keys: readonly OverviewMetricKey[],
): number | undefined {
  for (const key of keys) {
    const parsed = toNumber(record[key], Number.NaN);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function collectRecords(root: unknown): Record<string, unknown>[] {
  const queue: unknown[] = [root];
  const visited = new Set<unknown>();
  const collected: Record<string, unknown>[] = [];

  while (queue.length) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    collected.push(current);

    for (const value of Object.values(current)) {
      queue.push(value);
    }
  }

  return collected;
}

function extractArrayByPredicate(
  root: unknown,
  predicate: (record: Record<string, unknown>) => boolean,
): unknown[] {
  if (Array.isArray(root)) {
    return root;
  }

  const records = collectRecords(root);

  for (const record of records) {
    for (const value of Object.values(record)) {
      if (!Array.isArray(value)) {
        continue;
      }

      const firstObject = value.find((item) => isRecord(item));

      if (isRecord(firstObject) && predicate(firstObject)) {
        return value;
      }
    }
  }

  return [];
}

function extractArray(data: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key] as unknown[];
    }
  }

  const nestedData = data.data;

  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  if (isRecord(nestedData)) {
    for (const key of keys) {
      if (Array.isArray(nestedData[key])) {
        return nestedData[key] as unknown[];
      }
    }
  }

  const deepRecords = collectRecords(data);

  for (const record of deepRecords) {
    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }
  }

  for (const record of deepRecords) {
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

function extractPagination(data: unknown): unknown {
  if (isRecord(data) && "pagination" in data) {
    return data.pagination;
  }

  if (isRecord(data) && isRecord(data.data) && "pagination" in data.data) {
    return data.data.pagination;
  }

  const deepRecords = collectRecords(data);

  for (const record of deepRecords) {
    if ("pagination" in record && isRecord(record.pagination)) {
      return record.pagination;
    }
  }

  return undefined;
}

function normalizePagination(
  raw: unknown,
  page: number,
  limit: number,
  itemsLength: number,
): PaginationPayload {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);

  if (!isRecord(raw)) {
    const totalPages = Math.max(1, Math.ceil(itemsLength / safeLimit));

    return {
      total: itemsLength,
      page: safePage,
      limit: safeLimit,
      total_pages: totalPages,
      totalPages,
    };
  }

  const total = Math.max(0, toNumber(raw.total, itemsLength));
  const resolvedPage = Math.max(1, toNumber(raw.page, safePage));
  const resolvedLimit = Math.max(1, toNumber(raw.limit, safeLimit));
  const resolvedTotalPages = Math.max(
    1,
    toNumber(
      raw.total_pages ?? raw.totalPages,
      Math.ceil(Math.max(total, itemsLength) / resolvedLimit),
    ),
  );

  return {
    total,
    page: resolvedPage,
    limit: resolvedLimit,
    total_pages: resolvedTotalPages,
    totalPages: resolvedTotalPages,
  };
}

function normalizeUsersGrowth(data: unknown): UsersGrowthPoint[] {
  let rows = extractArray(data, [
    "users_growth",
    "usersGrowth",
    "growth",
    "series",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return (
        "users" in item ||
        "total_users" in item ||
        "totalUsers" in item ||
        "count" in item
      );
    });
  }

  return rows
    .filter(isRecord)
    .map((row) => ({
      date: toStringValue(
        row.date ??
          row.day ??
          row.label ??
          row.created_at ??
          row.createdAt ??
          row.month,
      ),
      users: getMetricValue(row, [
        "users",
        "count",
        "total_users",
        "totalUsers",
        "newUsers",
        "value",
      ]),
    }))
    .filter((row) => Boolean(row.date));
}

function normalizeRevenueGrowth(data: unknown): RevenueGrowthPoint[] {
  let rows = extractArray(data, [
    "revenue_growth",
    "revenueGrowth",
    "growth",
    "series",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return (
        "revenue" in item ||
        "total_revenue" in item ||
        "totalRevenue" in item ||
        "amount" in item
      );
    });
  }

  return rows
    .filter(isRecord)
    .map((row) => ({
      date: toStringValue(
        row.date ??
          row.day ??
          row.label ??
          row.created_at ??
          row.createdAt ??
          row.month,
      ),
      revenue: getMetricValue(row, [
        "revenue",
        "amount",
        "total_revenue",
        "totalRevenue",
        "value",
      ]),
      payments: getOptionalMetricValue(row, [
        "payments",
        "payment_count",
        "total_payments",
        "paymentCount",
      ]),
    }))
    .filter((row) => Boolean(row.date));
}

function normalizeMessagesGrowth(data: unknown): MessagesGrowthPoint[] {
  let rows = extractArray(data, [
    "messages_growth",
    "messagesGrowth",
    "growth",
    "series",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return (
        "messages" in item ||
        "total_messages" in item ||
        "totalMessages" in item ||
        "count" in item
      );
    });
  }

  return rows
    .filter(isRecord)
    .map((row) => ({
      date: toStringValue(
        row.date ??
          row.day ??
          row.label ??
          row.created_at ??
          row.createdAt ??
          row.month,
      ),
      messages: getMetricValue(row, [
        "messages",
        "count",
        "total_messages",
        "totalMessages",
        "value",
      ]),
    }))
    .filter((row) => Boolean(row.date));
}

function normalizePaginatedItems<T>(
  data: unknown,
  keys: readonly string[],
  page: number,
  limit: number,
): PaginatedItems<T> {
  const items = extractArray(data, keys) as T[];
  const pagination = normalizePagination(
    extractPagination(data),
    page,
    limit,
    items.length,
  );

  return { items, pagination };
}

async function fetchAnalyticsData<T>(
  url: string,
  params?: Record<string, number>,
): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url, { params });

  return response.data.data;
}

function normalizeOverview(data: unknown): AnalyticsOverview {
  if (!isRecord(data)) {
    return {};
  }

  const records = collectRecords(data);
  const rootCandidates = [
    data,
    ...(isRecord(data.overview) ? [data.overview] : []),
    ...(isRecord(data.kpi) ? [data.kpi] : []),
    ...(isRecord(data.kpis) ? [data.kpis] : []),
    ...(isRecord(data.metrics) ? [data.metrics] : []),
    ...(isRecord(data.summary) ? [data.summary] : []),
    ...records,
  ];

  const result: AnalyticsOverview = {};

  const setMetric = (
    targetKey: keyof AnalyticsOverview,
    keyCandidates: readonly OverviewMetricKey[],
  ) => {
    for (const source of rootCandidates) {
      const value = getOverviewMetricValue(source, keyCandidates);

      if (typeof value === "number") {
        result[targetKey] = value;
        return;
      }
    }
  };

  setMetric("total_users", ["total_users", "totalUsers"]);
  setMetric("new_users_today", ["new_users_today", "newUsersToday"]);
  setMetric("new_users_7d", ["new_users_7d", "newUsers7d"]);
  setMetric("active_users", ["active_users", "activeUsers"]);
  setMetric("total_payments", ["total_payments", "totalPayments"]);
  setMetric("paid_users", ["paid_users", "paidUsers"]);
  setMetric("total_revenue", ["total_revenue", "totalRevenue"]);
  setMetric("revenue_7d", ["revenue_7d", "revenue7d"]);
  setMetric("revenue_30d", ["revenue_30d", "revenue30d"]);
  setMetric("total_messages", ["total_messages", "totalMessages"]);
  setMetric("messages_today", ["messages_today", "messagesToday"]);
  setMetric("messages_7d", ["messages_7d", "messages7d"]);

  const contactSupport =
    records.find(
      (record) =>
        "contact_support_analytics" in record &&
        isRecord(record.contact_support_analytics),
    )?.contact_support_analytics ??
    records.find(
      (record) =>
        "contactSupportAnalytics" in record &&
        isRecord(record.contactSupportAnalytics),
    )?.contactSupportAnalytics;

  if (isRecord(contactSupport)) {
    result.contact_support_analytics = {
      unread_messages_supported:
        typeof contactSupport.unread_messages_supported === "boolean"
          ? contactSupport.unread_messages_supported
          : typeof contactSupport.unreadMessagesSupported === "boolean"
          ? contactSupport.unreadMessagesSupported
          : undefined,
      unread_messages: toNumber(
        contactSupport.unread_messages ?? contactSupport.unreadMessages,
        0,
      ),
      unread_messages_count: toNumber(
        contactSupport.unread_messages_count ?? contactSupport.unreadMessagesCount,
        0,
      ),
    };
  }

  return result;
}

export async function getAnalyticsOverview(
  days: DayRange,
): Promise<AnalyticsOverview> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/overview", {
    days,
  });

  return normalizeOverview(data);
}

export async function getUsersGrowth(days: DayRange): Promise<UsersGrowthPoint[]> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/users-growth", {
    days,
  });

  return normalizeUsersGrowth(data);
}

export async function getRevenueGrowth(
  days: DayRange,
): Promise<RevenueGrowthPoint[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/revenue-growth",
    { days },
  );

  return normalizeRevenueGrowth(data);
}

export async function getMessagesGrowth(
  days: DayRange,
): Promise<MessagesGrowthPoint[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/messages-growth",
    { days },
  );

  return normalizeMessagesGrowth(data);
}

export async function getRecentUsers(
  page: number,
  limit: number,
): Promise<PaginatedItems<RecentUser>> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/recent-users", {
    page,
    limit,
  });

  return normalizePaginatedItems<RecentUser>(
    data,
    ["users", "recent_users", "recentUsers", "items", "data"],
    page,
    limit,
  );
}

export async function getRecentPayments(
  page: number,
  limit: number,
): Promise<PaginatedItems<RecentPayment>> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/recent-payments",
    { page, limit },
  );

  return normalizePaginatedItems<RecentPayment>(
    data,
    ["payments", "recent_payments", "recentPayments", "items", "data"],
    page,
    limit,
  );
}

export async function getRecentMessages(
  page: number,
  limit: number,
): Promise<PaginatedItems<RecentMessage>> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/recent-messages",
    { page, limit },
  );

  return normalizePaginatedItems<RecentMessage>(
    data,
    ["messages", "recent_messages", "recentMessages", "items", "data"],
    page,
    limit,
  );
}

export function getAnalyticsErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? FALLBACK_ERROR;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return FALLBACK_ERROR;
}
