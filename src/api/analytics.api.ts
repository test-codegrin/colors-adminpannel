import api from "@/lib/axios";
import type {
  ActivityFeedItem,
  AnalyticsOverview,
  ApiEnvelope,
  DeviceBreakdownItem,
  DayRange,
  FeatureUsageItem,
  LiveUsersData,
  LocationBreakdownItem,
  MessagesGrowthPoint,
  PageViewsPoint,
  PaginatedItems,
  PerformanceData,
  RecentMessage,
  RecentPayment,
  RecentUser,
  RevenueGrowthPoint,
  SessionsPoint,
  TopPage,
  TrafficSourceItem,
  UserActivityItem,
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

function getNumberByKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
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

function getOptionalNumberByKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const parsed = toNumber(record[key], Number.NaN);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getStringByKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = toStringValue(record[key]);

    if (value) {
      return value;
    }
  }

  return "";
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

function normalizePageViews(data: unknown): PageViewsPoint[] {
  let rows = extractArray(data, [
    "page_views",
    "pageViews",
    "views",
    "series",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "views" in item || "page_views" in item || "count" in item;
    });
  }

  const normalizedRows = rows
    .filter(isRecord)
    .map((row) => ({
      date: getStringByKeys(row, [
        "date",
        "day",
        "label",
        "hour",
        "month",
        "created_at",
        "createdAt",
      ]),
      views: getNumberByKeys(row, ["views", "page_views", "count", "value"], 0),
      unique_visitors: getOptionalNumberByKeys(row, [
        "unique_visitors",
        "uniqueVisitors",
        "visitors",
      ]),
    }))
    .filter((row) => Boolean(row.date));

  if (normalizedRows.length) {
    return normalizedRows;
  }

  if (isRecord(data)) {
    const rangeDays = getNumberByKeys(data, ["range_days", "rangeDays"], 30);
    const totalViews = getNumberByKeys(
      data,
      ["total_page_views", "totalPageViews", "views", "total_views"],
      0,
    );
    const uniqueViews = getOptionalNumberByKeys(data, [
      "unique_page_views",
      "uniquePageViews",
      "unique_visitors",
      "uniqueVisitors",
    ]);
    const todayViews = getOptionalNumberByKeys(data, [
      "page_views_today",
      "pageViewsToday",
    ]);
    const views7d = getOptionalNumberByKeys(data, ["page_views_7d", "pageViews7d"]);

    const fallback: PageViewsPoint[] = [];

    if (typeof todayViews === "number") {
      fallback.push({
        date: "Today",
        views: todayViews,
      });
    }

    if (typeof views7d === "number") {
      fallback.push({
        date: "Last 7 Days",
        views: views7d,
      });
    }

    fallback.push({
      date: `Last ${Math.max(1, rangeDays)} Days`,
      views: totalViews,
      unique_visitors: uniqueViews,
    });

    return fallback;
  }

  return [];
}

function normalizeTopPages(data: unknown): TopPage[] {
  let rows = extractArray(data, [
    "top_pages",
    "topPages",
    "most_viewed_pages",
    "mostViewedPages",
    "pages",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "page" in item || "path" in item || "url" in item;
    });
  }

  return rows
    .filter(isRecord)
    .map((row) => ({
      page: getStringByKeys(row, ["page", "path", "url", "slug", "title", "label"]),
      views: getNumberByKeys(row, ["views", "page_views", "count", "hits", "value"], 0),
      unique_visitors: getOptionalNumberByKeys(row, [
        "unique_visitors",
        "uniqueVisitors",
        "visitors",
      ]),
    }))
    .filter((row) => Boolean(row.page));
}

function normalizeDevices(data: unknown): DeviceBreakdownItem[] {
  let rows = extractArray(data, [
    "devices",
    "device_breakdown",
    "deviceBreakdown",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "device" in item || "type" in item || "category" in item;
    });
  }

  const normalizedRows = rows
    .filter(isRecord)
    .map((row) => ({
      device: getStringByKeys(row, ["device", "type", "category", "label", "name"]),
      users: getNumberByKeys(row, ["users", "count", "value", "sessions"], 0),
      percentage: getOptionalNumberByKeys(row, ["percentage", "share", "ratio"]),
    }))
    .filter((row) => Boolean(row.device));

  if (normalizedRows.length) {
    return normalizedRows;
  }

  if (isRecord(data) && isRecord(data.devices)) {
    const totalEvents = getNumberByKeys(data, ["total_events", "totalEvents"], 0);
    const mapped = Object.entries(data.devices)
      .map(([key, value]) => {
        const percentage = toNumber(value, 0);

        return {
          device: key,
          percentage,
          users:
            totalEvents > 0
              ? Math.round((totalEvents * Math.max(0, percentage)) / 100)
              : 0,
        };
      })
      .filter((item) => Boolean(item.device))
      .sort((a, b) => b.users - a.users);

    if (mapped.length) {
      return mapped;
    }
  }

  return [];
}

function normalizeLiveUsers(data: unknown): LiveUsersData {
  const records = [data, ...collectRecords(data)];

  for (const record of records) {
    if (!isRecord(record)) {
      continue;
    }

    const liveUsers = getOptionalNumberByKeys(record, [
      "live_users",
      "liveUsers",
      "online_users",
      "onlineUsers",
      "active_users",
      "activeUsers",
      "active_users_now",
      "activeUsersNow",
      "count",
      "users",
    ]);

    if (typeof liveUsers === "number") {
      return {
        live_users: liveUsers,
        active_sessions: getOptionalNumberByKeys(record, [
          "active_sessions",
          "activeSessions",
        ]),
        users_last_5_minutes: getOptionalNumberByKeys(record, [
          "users_last_5_minutes",
          "usersLast5Minutes",
        ]),
        users_last_30_minutes: getOptionalNumberByKeys(record, [
          "users_last_30_minutes",
          "usersLast30Minutes",
        ]),
        updated_at: getStringByKeys(record, ["updated_at", "updatedAt", "timestamp"]),
      };
    }
  }

  return { live_users: 0 };
}

function normalizeFeatureUsage(data: unknown): FeatureUsageItem[] {
  let rows = extractArray(data, [
    "feature_usage",
    "featureUsage",
    "features",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return (
        "feature" in item ||
        "name" in item ||
        "action" in item ||
        "event_type" in item ||
        "eventType" in item
      );
    });
  }

  const normalizedRows = rows
    .filter(isRecord)
    .map((row) => ({
      feature: getStringByKeys(row, [
        "feature",
        "feature_name",
        "featureName",
        "name",
        "label",
        "action",
        "event_type",
        "eventType",
      ]),
      usage: getNumberByKeys(row, ["usage", "count", "total", "events", "value"], 0),
      percentage: getOptionalNumberByKeys(row, ["percentage", "share", "ratio"]),
    }))
    .filter((row) => Boolean(row.feature));

  if (normalizedRows.length) {
    return normalizedRows;
  }

  if (!isRecord(data)) {
    return [];
  }

  const ignoredKeys = new Set([
    "range_days",
    "rangeDays",
    "top_feature_events",
    "topFeatureEvents",
  ]);

  const metricRows = Object.entries(data)
    .filter(([key, value]) => !ignoredKeys.has(key) && typeof value === "number")
    .map(([feature, usage]) => ({
      feature,
      usage: toNumber(usage, 0),
    }))
    .filter((item) => item.usage > 0);

  const topEvents = extractArray(data, ["top_feature_events", "topFeatureEvents"])
    .filter(isRecord)
    .map((row) => ({
      feature: getStringByKeys(row, ["event_type", "eventType", "feature", "name"]),
      usage: getNumberByKeys(row, ["count", "usage", "total", "value"], 0),
    }))
    .filter((item) => Boolean(item.feature));

  const mergedMap = new Map<string, number>();

  for (const item of [...metricRows, ...topEvents]) {
    mergedMap.set(item.feature, (mergedMap.get(item.feature) ?? 0) + item.usage);
  }

  const merged = Array.from(mergedMap.entries()).map(([feature, usage]) => ({
    feature,
    usage,
  }));
  const total = merged.reduce((sum, item) => sum + item.usage, 0);

  return merged
    .sort((a, b) => b.usage - a.usage)
    .map((item) => ({
      ...item,
      percentage: total ? Number(((item.usage / total) * 100).toFixed(2)) : undefined,
    }));
}

function normalizeSessions(data: unknown): SessionsPoint[] {
  let rows = extractArray(data, [
    "sessions",
    "session_growth",
    "sessionGrowth",
    "series",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "sessions" in item || "session_count" in item || "count" in item;
    });
  }

  const normalizedRows = rows
    .filter(isRecord)
    .map((row) => ({
      date: getStringByKeys(row, [
        "date",
        "day",
        "label",
        "hour",
        "month",
        "created_at",
        "createdAt",
      ]),
      sessions: getNumberByKeys(row, ["sessions", "session_count", "count", "value"], 0),
      avg_duration: getOptionalNumberByKeys(row, [
        "avg_duration",
        "avgDuration",
        "duration",
      ]),
    }))
    .filter((row) => Boolean(row.date));

  if (normalizedRows.length) {
    return normalizedRows;
  }

  if (isRecord(data)) {
    const rangeDays = getNumberByKeys(data, ["range_days", "rangeDays"], 30);

    return [
      {
        date: `Last ${Math.max(1, rangeDays)} Days`,
        sessions: getNumberByKeys(data, ["total_sessions", "totalSessions", "sessions"], 0),
        avg_duration: getOptionalNumberByKeys(data, [
          "avg_session_time_seconds",
          "avgSessionTimeSeconds",
          "avg_duration",
          "avgDuration",
        ]),
      },
    ];
  }

  return [];
}

function normalizeLocations(data: unknown): LocationBreakdownItem[] {
  let rows = extractArray(data, [
    "locations",
    "location_breakdown",
    "locationBreakdown",
    "countries",
    "regions",
    "cities",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "location" in item || "city" in item || "country" in item;
    });
  }

  return rows
    .filter(isRecord)
    .map((row) => ({
      location: getStringByKeys(row, [
        "location",
        "city",
        "country",
        "region",
        "name",
        "label",
      ]),
      users: getNumberByKeys(row, ["users", "count", "value", "sessions"], 0),
      percentage: getOptionalNumberByKeys(row, ["percentage", "share", "ratio"]),
    }))
    .filter((row) => Boolean(row.location));
}

function normalizeTrafficSources(data: unknown): TrafficSourceItem[] {
  let rows = extractArray(data, [
    "traffic_sources",
    "trafficSources",
    "sources",
    "items",
    "rows",
    "data",
  ]);

  if (!rows.length) {
    rows = extractArrayByPredicate(data, (item) => {
      return "source" in item || "channel" in item || "referrer" in item;
    });
  }

  const normalizedRows = rows
    .filter(isRecord)
    .map((row) => ({
      source: getStringByKeys(row, ["source", "channel", "referrer", "name", "label"]),
      users: getNumberByKeys(row, ["users", "count", "visits", "value"], 0),
      visits:
        getOptionalNumberByKeys(row, ["visits", "sessions", "hits"]) ??
        getOptionalNumberByKeys(row, ["count", "users", "value"]),
      percentage: getOptionalNumberByKeys(row, ["percentage", "share", "ratio"]),
    }))
    .filter((row) => Boolean(row.source));

  if (normalizedRows.length) {
    return normalizedRows;
  }

  if (isRecord(data) && isRecord(data.sources)) {
    return Object.entries(data.sources)
      .map(([source, value]) => ({
        source,
        users: toNumber(value, 0),
        visits: toNumber(value, 0),
      }))
      .filter((item) => Boolean(item.source))
      .sort((a, b) => b.users - a.users);
  }

  return [];
}

function normalizePerformance(data: unknown): PerformanceData {
  const records = [data, ...collectRecords(data)];

  const getMetric = (keys: readonly string[]): number | undefined => {
    for (const candidate of records) {
      if (!isRecord(candidate)) {
        continue;
      }

      const value = getOptionalNumberByKeys(candidate, keys);

      if (typeof value === "number") {
        return value;
      }
    }

    return undefined;
  };

  const result: PerformanceData = {
    avg_response_time_ms: getMetric([
      "avg_response_time_ms",
      "avgResponseTimeMs",
      "avg_response_time",
      "avgResponseTime",
    ]),
    error_rate: getMetric(["error_rate", "errorRate"]),
    requests_per_minute: getMetric(["requests_per_minute", "requestsPerMinute"]),
    total_requests: getMetric(["total_requests", "totalRequests"]),
    avg_response_time: getMetric([
      "avg_response_time",
      "avgResponseTime",
      "avg_response_time_ms",
      "avgResponseTimeMs",
      "response_time",
      "responseTime",
    ]),
    uptime: getMetric(["uptime", "uptime_percentage", "uptimePercentage"]),
    bounce_rate: getMetric(["bounce_rate", "bounceRate"]),
    conversion_rate: getMetric(["conversion_rate", "conversionRate"]),
  };

  if (typeof result.uptime !== "number" && typeof result.error_rate === "number") {
    result.uptime = Number((100 - result.error_rate).toFixed(2));
  }

  if (typeof result.bounce_rate !== "number" && typeof result.error_rate === "number") {
    result.bounce_rate = result.error_rate;
  }

  return result;
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

function normalizeUserActivityItems(
  data: unknown,
  page: number,
  limit: number,
): PaginatedItems<UserActivityItem> {
  if (isRecord(data)) {
    const dau = getOptionalNumberByKeys(data, ["dau", "DAU"]);
    const wau = getOptionalNumberByKeys(data, ["wau", "WAU"]);
    const mau = getOptionalNumberByKeys(data, ["mau", "MAU"]);

    if (
      typeof dau === "number" ||
      typeof wau === "number" ||
      typeof mau === "number"
    ) {
      const summaryRows: UserActivityItem[] = [
        { id: "dau", name: "Daily Active Users", action: dau ?? 0 },
        { id: "wau", name: "Weekly Active Users", action: wau ?? 0 },
        { id: "mau", name: "Monthly Active Users", action: mau ?? 0 },
      ];

      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, limit);
      const start = (safePage - 1) * safeLimit;
      const end = start + safeLimit;
      const items = summaryRows.slice(start, end);

      return {
        items,
        pagination: normalizePagination(undefined, safePage, safeLimit, summaryRows.length),
      };
    }
  }

  return normalizePaginatedItems<UserActivityItem>(
    data,
    ["activity", "user_activity", "userActivity", "items", "data"],
    page,
    limit,
  );
}

function normalizeActivityFeedItems(
  data: unknown,
  page: number,
  limit: number,
): PaginatedItems<ActivityFeedItem> {
  if (Array.isArray(data)) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;

    return {
      items: data.slice(start, end) as ActivityFeedItem[],
      pagination: normalizePagination(undefined, safePage, safeLimit, data.length),
    };
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    const allItems = data.items as ActivityFeedItem[];
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;

    return {
      items: allItems.slice(start, end),
      pagination: normalizePagination(undefined, safePage, safeLimit, allItems.length),
    };
  }

  const normalized = normalizePaginatedItems<ActivityFeedItem>(
    data,
    ["activity_feed", "activityFeed", "feed", "items", "data"],
    page,
    limit,
  );

  return normalized;
}

async function fetchAnalyticsData<T>(
  url: string,
  params?: Record<string, number | undefined>,
): Promise<T> {
  const response = await api.get<ApiEnvelope<T> | Record<string, unknown>>(url, {
    params,
  });

  const payload = response.data;

  if (isRecord(payload) && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
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

export async function getPageViews(days?: DayRange): Promise<PageViewsPoint[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/page-views",
    typeof days === "number" ? { days } : undefined,
  );

  return normalizePageViews(data);
}

export async function getTopPages(
  days: DayRange = 30,
  limit = 10,
): Promise<TopPage[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/top-pages",
    { days, limit },
  );

  return normalizeTopPages(data);
}

export async function getDevices(days?: DayRange): Promise<DeviceBreakdownItem[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/devices",
    typeof days === "number" ? { days } : undefined,
  );

  return normalizeDevices(data);
}

export async function getLiveUsers(): Promise<LiveUsersData> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/live-users");

  return normalizeLiveUsers(data);
}

export async function getFeatureUsage(
  days?: DayRange,
): Promise<FeatureUsageItem[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/feature-usage",
    typeof days === "number" ? { days } : undefined,
  );

  return normalizeFeatureUsage(data);
}

export async function getUserActivity(
  page: number,
  limit: number,
): Promise<PaginatedItems<UserActivityItem>> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/user-activity");

  return normalizeUserActivityItems(data, page, limit);
}

export async function getSessions(days?: DayRange): Promise<SessionsPoint[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/sessions",
    typeof days === "number" ? { days } : undefined,
  );

  return normalizeSessions(data);
}

export async function getLocations(
  days: DayRange = 30,
  limit = 20,
): Promise<LocationBreakdownItem[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/locations",
    { days, limit },
  );

  return normalizeLocations(data);
}

export async function getTrafficSources(
  days?: DayRange,
): Promise<TrafficSourceItem[]> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/traffic-sources",
    typeof days === "number" ? { days } : undefined,
  );

  return normalizeTrafficSources(data);
}

export async function getPerformance(minutes = 60): Promise<PerformanceData> {
  const data = await fetchAnalyticsData<unknown>(
    "/admin/analytics/performance",
    { minutes },
  );

  return normalizePerformance(data);
}

export async function getActivityFeed(
  page: number,
  limit: number,
): Promise<PaginatedItems<ActivityFeedItem>> {
  const data = await fetchAnalyticsData<unknown>("/admin/analytics/activity-feed", {
    limit,
  });

  return normalizeActivityFeedItems(data, page, limit);
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
