import {
  Button,
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  getActivityFeed,
  getAnalyticsErrorMessage,
  getAnalyticsOverview,
  getDevices,
  getFeatureUsage,
  getLiveUsers,
  getLocations,
  getMessagesGrowth,
  getPageViews,
  getPerformance,
  getRecentMessages,
  getRecentPayments,
  getRecentUsers,
  getRevenueGrowth,
  getSessions,
  getTopPages,
  getTrafficSources,
  getUserActivity,
  getUsersGrowth,
} from "@/api/analytics.api";
import {
  AnalyticsBarChart,
  AnalyticsDoughnutChart,
  AnalyticsLineChart,
  buildChartPalette,
} from "@/components/analytics/AnalyticsCharts";
import {
  DashboardPanel,
  EmptyState,
  ErrorState,
  LoadingBlock,
  MetricCard,
  SegmentedFilter,
} from "@/components/analytics/AnalyticsShell";
import type {
  ActivityFeedData,
  ActivityFeedItem,
  AnalyticsOverview,
  DayRange,
  DeviceAnalyticsPayload,
  FeatureUsageData,
  FeatureUsageItem,
  LiveUsersData,
  LocationsData,
  MessagesGrowthPoint,
  MinutesRange,
  PageViewsSummary,
  PerformanceData,
  RecentMessage,
  RecentPayment,
  RecentUser,
  RevenueGrowthPoint,
  SessionsSummary,
  TopPage,
  TrafficSourcesData,
  UserActivityData,
  UsersGrowthPoint,
} from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

const DAY_OPTIONS: DayRange[] = [7, 30, 90, 180, 365];
const MINUTE_OPTIONS: MinutesRange[] = [15, 30, 60, 180, 360, 1440];
const TOP_LIMIT_OPTIONS = [5, 10, 20];
const ACTIVITY_LIMIT_OPTIONS = [10, 25, 50];
const PAGE_SIZE = 10;

const numberFormatter = new Intl.NumberFormat("en-IN");
const compactNumberFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

interface AsyncState<T> {
  data: T;
  isLoading: boolean;
  error: string;
}

interface DashboardCoreState {
  overview: AsyncState<AnalyticsOverview | null>;
  usersGrowth: AsyncState<UsersGrowthPoint[]>;
  revenueGrowth: AsyncState<RevenueGrowthPoint[]>;
  messagesGrowth: AsyncState<MessagesGrowthPoint[]>;
  pageViews: AsyncState<PageViewsSummary | null>;
  topPages: AsyncState<TopPage[]>;
  devices: AsyncState<DeviceAnalyticsPayload | null>;
  liveUsers: AsyncState<LiveUsersData | null>;
  featureUsage: AsyncState<FeatureUsageData | null>;
  userActivity: AsyncState<UserActivityData | null>;
  sessions: AsyncState<SessionsSummary | null>;
  locations: AsyncState<LocationsData | null>;
  trafficSources: AsyncState<TrafficSourcesData | null>;
  performance: AsyncState<PerformanceData | null>;
  activityFeed: AsyncState<ActivityFeedData | null>;
}

interface PaginatedSectionState<T> {
  items: T[];
  pagination: PaginationPayload;
  isLoading: boolean;
  error: string;
}

interface KpiCardItem {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const emptyPagination: PaginationPayload = {
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  total_pages: 1,
  totalPages: 1,
};

function createAsyncState<T>(data: T): AsyncState<T> {
  return {
    data,
    isLoading: true,
    error: "",
  };
}

function createPaginatedSectionState<T>(): PaginatedSectionState<T> {
  return {
    items: [],
    pagination: { ...emptyPagination },
    isLoading: true,
    error: "",
  };
}

function createCoreState(): DashboardCoreState {
  return {
    overview: createAsyncState<AnalyticsOverview | null>(null),
    usersGrowth: createAsyncState<UsersGrowthPoint[]>([]),
    revenueGrowth: createAsyncState<RevenueGrowthPoint[]>([]),
    messagesGrowth: createAsyncState<MessagesGrowthPoint[]>([]),
    pageViews: createAsyncState<PageViewsSummary | null>(null),
    topPages: createAsyncState<TopPage[]>([]),
    devices: createAsyncState<DeviceAnalyticsPayload | null>(null),
    liveUsers: createAsyncState<LiveUsersData | null>(null),
    featureUsage: createAsyncState<FeatureUsageData | null>(null),
    userActivity: createAsyncState<UserActivityData | null>(null),
    sessions: createAsyncState<SessionsSummary | null>(null),
    locations: createAsyncState<LocationsData | null>(null),
    trafficSources: createAsyncState<TrafficSourcesData | null>(null),
    performance: createAsyncState<PerformanceData | null>(null),
    activityFeed: createAsyncState<ActivityFeedData | null>(null),
  };
}

function resolveAsyncResult<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): AsyncState<T> {
  if (result.status === "fulfilled") {
    return {
      data: result.value,
      isLoading: false,
      error: "",
    };
  }

  return {
    data: fallback,
    isLoading: false,
    error: getAnalyticsErrorMessage(result.reason),
  };
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(toSafeNumber(value));
}

function formatCompactNumber(value: number | null | undefined): string {
  return compactNumberFormatter.format(toSafeNumber(value));
}

function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(toSafeNumber(value));
}

function formatPercent(value: number | null | undefined, digits = 1): string {
  return `${toSafeNumber(value).toFixed(digits)}%`;
}

function formatDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationFromSeconds(seconds: number | null | undefined): string {
  const safeSeconds = toSafeNumber(seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.round(safeSeconds % 60);

  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function prettifyFeatureName(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hasPositiveValues(values: number[]): boolean {
  return values.some((value) => value > 0);
}

function getTotalPages(pagination: PaginationPayload): number {
  return Math.max(1, pagination.total_pages ?? pagination.totalPages ?? 1);
}

function buildFeatureUsageItems(data: FeatureUsageData | null): FeatureUsageItem[] {
  if (!data) {
    return [];
  }

  const metrics = [
    { feature: "Color Saved", usage: data.color_saved },
    { feature: "Color Deleted", usage: data.color_deleted },
    { feature: "Color Copied", usage: data.color_copied },
    { feature: "Palette Generated", usage: data.palette_generated },
    { feature: "Palette Saved", usage: data.palette_saved },
    { feature: "Palette Deleted", usage: data.palette_deleted },
    { feature: "Palette Exported", usage: data.palette_exported },
    { feature: "Gradient Generated", usage: data.gradient_generated },
    { feature: "Gradient Saved", usage: data.gradient_saved },
    { feature: "Gradient Deleted", usage: data.gradient_deleted },
    { feature: "Tailwind Colors Copied", usage: data.tailwind_colors_copied },
  ];

  return metrics.sort((first, second) => second.usage - first.usage);
}

function buildSourceItems(data: TrafficSourcesData | null): { source: string; count: number }[] {
  if (!data) {
    return [];
  }

  if (data.top_sources.length) {
    return [...data.top_sources].sort((first, second) => second.count - first.count);
  }

  return Object.entries(data.sources)
    .map(([source, count]) => ({ source, count }))
    .sort((first, second) => second.count - first.count);
}

function buildLocationRows<T extends { count: number }>(
  items: T[] | null | undefined,
  key: keyof T,
): { label: string; count: number }[] {
  if (!items?.length) {
    return [];
  }

  return items.map((item) => ({
    label: String(item[key] ?? "-"),
    count: item.count,
  }));
}

function renderTableFrame<T>({
  isLoading,
  error,
  items,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: string;
  items: T[];
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return <LoadingBlock className="py-4" lines={6} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return children;
}

function DashboardHome() {
  const [days, setDays] = useState<DayRange>(30);
  const [minutes, setMinutes] = useState<MinutesRange>(60);
  const [topLimit, setTopLimit] = useState<number>(10);
  const [activityLimit, setActivityLimit] = useState<number>(50);

  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentPaymentsPage, setRecentPaymentsPage] = useState(1);
  const [recentMessagesPage, setRecentMessagesPage] = useState(1);

  const [coreState, setCoreState] = useState<DashboardCoreState>(() => createCoreState());
  const [recentUsersState, setRecentUsersState] =
    useState<PaginatedSectionState<RecentUser>>(createPaginatedSectionState);
  const [recentPaymentsState, setRecentPaymentsState] =
    useState<PaginatedSectionState<RecentPayment>>(createPaginatedSectionState);
  const [recentMessagesState, setRecentMessagesState] =
    useState<PaginatedSectionState<RecentMessage>>(createPaginatedSectionState);

  const coreRequestRef = useRef(0);
  const usersRequestRef = useRef(0);
  const paymentsRequestRef = useRef(0);
  const messagesRequestRef = useRef(0);

  const loadCoreDashboard = useCallback(async () => {
    const requestId = ++coreRequestRef.current;

    setCoreState((previous) => ({
      overview: { ...previous.overview, isLoading: true, error: "" },
      usersGrowth: { ...previous.usersGrowth, isLoading: true, error: "" },
      revenueGrowth: { ...previous.revenueGrowth, isLoading: true, error: "" },
      messagesGrowth: { ...previous.messagesGrowth, isLoading: true, error: "" },
      pageViews: { ...previous.pageViews, isLoading: true, error: "" },
      topPages: { ...previous.topPages, isLoading: true, error: "" },
      devices: { ...previous.devices, isLoading: true, error: "" },
      liveUsers: { ...previous.liveUsers, isLoading: true, error: "" },
      featureUsage: { ...previous.featureUsage, isLoading: true, error: "" },
      userActivity: { ...previous.userActivity, isLoading: true, error: "" },
      sessions: { ...previous.sessions, isLoading: true, error: "" },
      locations: { ...previous.locations, isLoading: true, error: "" },
      trafficSources: { ...previous.trafficSources, isLoading: true, error: "" },
      performance: { ...previous.performance, isLoading: true, error: "" },
      activityFeed: { ...previous.activityFeed, isLoading: true, error: "" },
    }));

    const results = await Promise.allSettled([
      getAnalyticsOverview(days),
      getUsersGrowth(days),
      getRevenueGrowth(days),
      getMessagesGrowth(days),
      getPageViews(days, topLimit),
      getTopPages(days, topLimit),
      getDevices(days),
      getLiveUsers(),
      getFeatureUsage(days),
      getUserActivity(),
      getSessions(days),
      getLocations(days, topLimit),
      getTrafficSources(days, topLimit),
      getPerformance(minutes),
      getActivityFeed(activityLimit),
    ]);

    if (requestId !== coreRequestRef.current) {
      return;
    }

    const [
      overviewResult,
      usersGrowthResult,
      revenueGrowthResult,
      messagesGrowthResult,
      pageViewsResult,
      topPagesResult,
      devicesResult,
      liveUsersResult,
      featureUsageResult,
      userActivityResult,
      sessionsResult,
      locationsResult,
      trafficSourcesResult,
      performanceResult,
      activityFeedResult,
    ] = results;

    setCoreState({
      overview: resolveAsyncResult(overviewResult, null),
      usersGrowth: resolveAsyncResult(usersGrowthResult, []),
      revenueGrowth: resolveAsyncResult(revenueGrowthResult, []),
      messagesGrowth: resolveAsyncResult(messagesGrowthResult, []),
      pageViews: resolveAsyncResult(pageViewsResult, null),
      topPages: resolveAsyncResult(topPagesResult, []),
      devices: resolveAsyncResult(devicesResult, null),
      liveUsers: resolveAsyncResult(liveUsersResult, null),
      featureUsage: resolveAsyncResult(featureUsageResult, null),
      userActivity: resolveAsyncResult(userActivityResult, null),
      sessions: resolveAsyncResult(sessionsResult, null),
      locations: resolveAsyncResult(locationsResult, null),
      trafficSources: resolveAsyncResult(trafficSourcesResult, null),
      performance: resolveAsyncResult(performanceResult, null),
      activityFeed: resolveAsyncResult(activityFeedResult, null),
    });
  }, [activityLimit, days, minutes, topLimit]);

  const loadRecentUsers = useCallback(async (page: number) => {
    const requestId = ++usersRequestRef.current;

    setRecentUsersState((previous) => ({
      ...previous,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentUsers(page, PAGE_SIZE);

      if (requestId !== usersRequestRef.current) {
        return;
      }

      setRecentUsersState({
        items: response.items,
        pagination: response.pagination,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (requestId !== usersRequestRef.current) {
        return;
      }

      setRecentUsersState({
        items: [],
        pagination: { ...emptyPagination, page },
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      });
    }
  }, []);

  const loadRecentPayments = useCallback(async (page: number) => {
    const requestId = ++paymentsRequestRef.current;

    setRecentPaymentsState((previous) => ({
      ...previous,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentPayments(page, PAGE_SIZE);

      if (requestId !== paymentsRequestRef.current) {
        return;
      }

      setRecentPaymentsState({
        items: response.items,
        pagination: response.pagination,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (requestId !== paymentsRequestRef.current) {
        return;
      }

      setRecentPaymentsState({
        items: [],
        pagination: { ...emptyPagination, page },
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      });
    }
  }, []);

  const loadRecentMessages = useCallback(async (page: number) => {
    const requestId = ++messagesRequestRef.current;

    setRecentMessagesState((previous) => ({
      ...previous,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentMessages(page, PAGE_SIZE);

      if (requestId !== messagesRequestRef.current) {
        return;
      }

      setRecentMessagesState({
        items: response.items,
        pagination: response.pagination,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (requestId !== messagesRequestRef.current) {
        return;
      }

      setRecentMessagesState({
        items: [],
        pagination: { ...emptyPagination, page },
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    loadCoreDashboard();
  }, [loadCoreDashboard]);

  useEffect(() => {
    loadRecentUsers(recentUsersPage);
  }, [loadRecentUsers, recentUsersPage]);

  useEffect(() => {
    loadRecentPayments(recentPaymentsPage);
  }, [loadRecentPayments, recentPaymentsPage]);

  useEffect(() => {
    loadRecentMessages(recentMessagesPage);
  }, [loadRecentMessages, recentMessagesPage]);

  const overview = coreState.overview.data;
  const pageViews = coreState.pageViews.data;
  const devices = coreState.devices.data;
  const liveUsers = coreState.liveUsers.data;
  const userActivity = coreState.userActivity.data;
  const sessions = coreState.sessions.data;
  const locations = coreState.locations.data;
  const trafficSources = coreState.trafficSources.data;
  const performance = coreState.performance.data;
  const activityFeed = coreState.activityFeed.data;

  const featureUsageItems = useMemo(
    () => buildFeatureUsageItems(coreState.featureUsage.data),
    [coreState.featureUsage.data],
  );
  const sourceItems = useMemo(() => buildSourceItems(trafficSources), [trafficSources]);
  const countryRows = useMemo(
    () => buildLocationRows(locations?.countries, "country"),
    [locations],
  );
  const regionRows = useMemo(
    () => buildLocationRows(locations?.regions, "region"),
    [locations],
  );
  const cityRows = useMemo(() => buildLocationRows(locations?.cities, "city"), [locations]);

  const usersGrowthLabels = useMemo(
    () => coreState.usersGrowth.data.map((item) => formatDateLabel(item.date)),
    [coreState.usersGrowth.data],
  );
  const revenueGrowthLabels = useMemo(
    () => coreState.revenueGrowth.data.map((item) => formatDateLabel(item.date)),
    [coreState.revenueGrowth.data],
  );
  const messagesGrowthLabels = useMemo(
    () => coreState.messagesGrowth.data.map((item) => formatDateLabel(item.date)),
    [coreState.messagesGrowth.data],
  );
  const apiUsageLabels = useMemo(
    () =>
      overview?.platform_usage_analytics.api_usage_stats.map((item) =>
        formatDateLabel(item.date),
      ) ?? [],
    [overview],
  );

  const kpiCards = useMemo<KpiCardItem[]>(
    () => [
      {
        label: "Total Users",
        value: formatCompactNumber(overview?.user_analytics.total_users),
        hint: `${formatNumber(overview?.user_analytics.new_users_7d)} new in 7 days`,
        icon: "mdi:account-group-outline",
      },
      {
        label: "New Users Today",
        value: formatNumber(overview?.user_analytics.new_users_today),
        hint: `${formatNumber(overview?.user_analytics.active_users)} active users`,
        icon: "mdi:account-plus-outline",
      },
      {
        label: "Active Users",
        value: formatCompactNumber(overview?.user_analytics.active_users),
        hint: `${formatNumber(userActivity?.dau)} DAU`,
        icon: "mdi:pulse",
      },
      {
        label: "Total Revenue",
        value: formatCurrency(overview?.payment_analytics.total_revenue),
        hint: `${formatCurrency(overview?.payment_analytics.revenue_30d)} in 30 days`,
        icon: "mdi:currency-inr",
        tone: "success",
      },
      {
        label: "Total Payments",
        value: formatCompactNumber(overview?.payment_analytics.total_payments),
        hint: `${formatNumber(overview?.payment_analytics.paid_users)} paid users`,
        icon: "mdi:credit-card-outline",
      },
      {
        label: "Total Messages",
        value: formatCompactNumber(overview?.contact_support_analytics.total_messages),
        hint: overview?.contact_support_analytics.unread_messages_supported
          ? `${formatNumber(overview?.contact_support_analytics.unread_messages)} unread`
          : "Unread tracking unavailable",
        icon: "mdi:message-outline",
      },
      {
        label: "Total Requests",
        value: formatCompactNumber(overview?.platform_usage_analytics.total_requests),
        hint: `${formatCompactNumber(
          overview?.platform_usage_analytics.unique_api_requests,
        )} unique requests`,
        icon: "mdi:api",
      },
      {
        label: "Failure Rate",
        value: formatPercent(overview?.platform_usage_analytics.failure_rate, 2),
        hint: overview?.platform_usage_analytics.tracking_enabled
          ? "Session summary tracking enabled"
          : "Tracking disabled or sparse",
        icon: "mdi:alert-circle-outline",
        tone:
          toSafeNumber(overview?.platform_usage_analytics.failure_rate) > 5
            ? "danger"
            : "warning",
      },
    ],
    [overview, userActivity],
  );

  const userTablePages = getTotalPages(recentUsersState.pagination);
  const paymentsTablePages = getTotalPages(recentPaymentsState.pagination);
  const messagesTablePages = getTotalPages(recentMessagesState.pagination);

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[28px] border border-default-200 bg-[linear-gradient(135deg,rgba(3,105,161,0.10),rgba(245,158,11,0.10),rgba(255,255,255,0.7))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Chip
              className="border border-white/60 bg-white/70 font-mono text-[11px] uppercase tracking-[0.22em] text-default-700"
              radius="full"
              variant="flat"
            >
              Admin Analytics
            </Chip>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Session-summary analytics dashboard
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-default-600">
              Built against the current <span className="font-mono">/admin/analytics</span>{" "}
              API. Every section handles aggregated, sparse, and zero-value datasets without
              collapsing charts or tables.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <SegmentedFilter
              label="Days"
              options={DAY_OPTIONS.map((value) => ({ label: `${value}D`, value }))}
              value={days}
              onChange={setDays}
              isDisabled={coreState.overview.isLoading}
            />
            <SegmentedFilter
              label="Minutes"
              options={MINUTE_OPTIONS.map((value) => ({ label: `${value}m`, value }))}
              value={minutes}
              onChange={setMinutes}
              isDisabled={coreState.performance.isLoading}
            />
            <SegmentedFilter
              label="Top N"
              options={TOP_LIMIT_OPTIONS.map((value) => ({ label: String(value), value }))}
              value={topLimit}
              onChange={setTopLimit}
              isDisabled={coreState.topPages.isLoading}
            />
            <SegmentedFilter
              label="Feed Limit"
              options={ACTIVITY_LIMIT_OPTIONS.map((value) => ({
                label: String(value),
                value,
              }))}
              value={activityLimit}
              onChange={setActivityLimit}
              isDisabled={coreState.activityFeed.isLoading}
            />
            <div className="flex items-end">
              <Button
                color="primary"
                radius="full"
                onPress={loadCoreDashboard}
                startContent={<Icon icon="solar:refresh-bold" width="18" />}
              >
                Refresh Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {coreState.overview.isLoading && !overview
          ? Array.from({ length: 8 }).map((_, index) => (
              <DashboardPanel
                key={`kpi-loading-${index + 1}`}
                title="Loading"
                className="min-h-[140px]"
              >
                <LoadingBlock lines={4} />
              </DashboardPanel>
            ))
          : kpiCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                hint={card.hint}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Users Growth"
          subtitle={`Daily user growth for the last ${days} days`}
          action={
            <Chip variant="flat" radius="full">
              {coreState.usersGrowth.data.length} points
            </Chip>
          }
        >
          {coreState.usersGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.usersGrowth.error ? (
            <ErrorState message={coreState.usersGrowth.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(coreState.usersGrowth.data.map((item) => item.users)) ? (
            <EmptyState
              title="No user growth data"
              description="The selected window has no recorded user growth yet."
            />
          ) : (
            <AnalyticsLineChart
              labels={usersGrowthLabels}
              series={[
                {
                  label: "Users",
                  values: coreState.usersGrowth.data.map((item) => item.users),
                  color: "#0f766e",
                  fill: true,
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Revenue Growth"
          subtitle="Revenue and payments by date"
          action={
            <Chip variant="flat" radius="full">
              {formatCurrency(overview?.payment_analytics.revenue_7d)} 7D revenue
            </Chip>
          }
        >
          {coreState.revenueGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.revenueGrowth.error ? (
            <ErrorState message={coreState.revenueGrowth.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(
              coreState.revenueGrowth.data.flatMap((item) => [item.revenue, item.payments]),
            ) ? (
            <EmptyState
              title="No revenue data"
              description="Payment analytics are empty for the selected period."
            />
          ) : (
            <AnalyticsLineChart
              labels={revenueGrowthLabels}
              dualAxis
              series={[
                {
                  label: "Revenue",
                  values: coreState.revenueGrowth.data.map((item) => item.revenue),
                  color: "#2563eb",
                  fill: true,
                },
                {
                  label: "Payments",
                  values: coreState.revenueGrowth.data.map((item) => item.payments),
                  color: "#d97706",
                  yAxisID: "y1",
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Messages Growth"
          subtitle="Contact message volume across the selected range"
        >
          {coreState.messagesGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.messagesGrowth.error ? (
            <ErrorState message={coreState.messagesGrowth.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(coreState.messagesGrowth.data.map((item) => item.messages)) ? (
            <EmptyState
              title="No message growth data"
              description="No support message activity has been recorded for this filter."
            />
          ) : (
            <AnalyticsLineChart
              labels={messagesGrowthLabels}
              series={[
                {
                  label: "Messages",
                  values: coreState.messagesGrowth.data.map((item) => item.messages),
                  color: "#db2777",
                  fill: true,
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="API Usage Stats"
          subtitle="Overview platform usage analytics"
          action={
            <Chip variant="flat" radius="full">
              {overview?.platform_usage_analytics.tracking_enabled ? "Tracking On" : "Tracking Off"}
            </Chip>
          }
        >
          {coreState.overview.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.overview.error ? (
            <ErrorState message={coreState.overview.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(
              overview?.platform_usage_analytics.api_usage_stats.flatMap((item) => [
                item.requests,
                item.unique_api_requests,
                item.errors,
              ]) ?? [],
            ) ? (
            <EmptyState
              title="No platform usage data"
              description="API usage tracking is disabled or the selected range has no request summaries."
            />
          ) : (
            <AnalyticsLineChart
              labels={apiUsageLabels}
              dualAxis
              series={[
                {
                  label: "Requests",
                  values:
                    overview?.platform_usage_analytics.api_usage_stats.map(
                      (item) => item.requests,
                    ) ?? [],
                  color: "#0891b2",
                  fill: true,
                },
                {
                  label: "Errors",
                  values:
                    overview?.platform_usage_analytics.api_usage_stats.map(
                      (item) => item.errors,
                    ) ?? [],
                  color: "#dc2626",
                  yAxisID: "y1",
                },
              ]}
            />
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <DashboardPanel
          title="Page Views"
          subtitle="Aggregated page-view metrics and most viewed pages"
          action={
            <Chip variant="flat" radius="full">
              {formatNumber(pageViews?.unique_page_views)} unique views
            </Chip>
          }
        >
          {coreState.pageViews.isLoading ? (
            <LoadingBlock lines={10} />
          ) : coreState.pageViews.error ? (
            <ErrorState message={coreState.pageViews.error} onRetry={loadCoreDashboard} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard
                  label="Total Page Views"
                  value={formatCompactNumber(pageViews?.total_page_views)}
                  hint={`${formatNumber(pageViews?.page_views_today)} today`}
                  icon="mdi:file-eye-outline"
                />
                <MetricCard
                  label="Unique Page Views"
                  value={formatCompactNumber(pageViews?.unique_page_views)}
                  hint={`${formatNumber(pageViews?.page_views_7d)} in 7 days`}
                  icon="mdi:account-eye-outline"
                />
                <MetricCard
                  label="Page Views Today"
                  value={formatNumber(pageViews?.page_views_today)}
                  hint={`Last ${days} days`}
                  icon="mdi:calendar-today-outline"
                />
                <MetricCard
                  label="Page Views 7D"
                  value={formatNumber(pageViews?.page_views_7d)}
                  hint={`Top ${topLimit} pages`}
                  icon="mdi:chart-line"
                />
              </div>

              {!hasPositiveValues((pageViews?.most_viewed_pages ?? []).map((item) => item.views)) ? (
                <EmptyState
                  title="No page-view distribution"
                  description="Most-viewed pages will appear here when aggregated page views are available."
                />
              ) : (
                <AnalyticsBarChart
                  horizontal
                  labels={(pageViews?.most_viewed_pages ?? []).map((item) => item.page)}
                  series={[
                    {
                      label: "Views",
                      values: (pageViews?.most_viewed_pages ?? []).map((item) => item.views),
                      color: "#0f766e",
                    },
                  ]}
                />
              )}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Top Pages"
          subtitle="Top pages endpoint rendered as a horizontal bar chart"
        >
          {coreState.topPages.isLoading ? (
            <LoadingBlock lines={10} />
          ) : coreState.topPages.error ? (
            <ErrorState message={coreState.topPages.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(coreState.topPages.data.map((item) => item.views)) ? (
            <EmptyState
              title="No top page data"
              description="The backend returned no ranked pages for the selected filters."
            />
          ) : (
            <AnalyticsBarChart
              horizontal
              labels={coreState.topPages.data.map((item) => item.page)}
              series={[
                {
                  label: "Views",
                  values: coreState.topPages.data.map((item) => item.views),
                  color: "#2563eb",
                },
              ]}
            />
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardPanel
          title="Traffic Sources"
          subtitle="Traffic source distribution"
          action={
            <Chip variant="flat" radius="full">
              {sourceItems.length} sources
            </Chip>
          }
        >
          {coreState.trafficSources.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.trafficSources.error ? (
            <ErrorState message={coreState.trafficSources.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(sourceItems.map((item) => item.count)) ? (
            <EmptyState
              title="No traffic source data"
              description="Traffic sources will populate here when session summaries include attribution."
            />
          ) : (
            <AnalyticsDoughnutChart
              labels={sourceItems.map((item) => prettifyFeatureName(item.source))}
              values={sourceItems.map((item) => item.count)}
              colors={buildChartPalette(sourceItems.length)}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Feature Usage"
          subtitle="Most used product features across the selected range"
        >
          {coreState.featureUsage.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.featureUsage.error ? (
            <ErrorState message={coreState.featureUsage.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues(featureUsageItems.map((item) => item.usage)) ? (
            <EmptyState
              title="No feature usage data"
              description="Feature counters are currently empty for this period."
            />
          ) : (
            <AnalyticsBarChart
              horizontal
              labels={featureUsageItems.map((item) => item.feature)}
              series={[
                {
                  label: "Usage",
                  values: featureUsageItems.map((item) => item.usage),
                  color: "#d97706",
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Performance Endpoints"
          subtitle="Top endpoints by requests in the selected minutes window"
          action={
            <Chip variant="flat" radius="full">
              {minutes} minute window
            </Chip>
          }
        >
          {coreState.performance.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.performance.error ? (
            <ErrorState message={coreState.performance.error} onRetry={loadCoreDashboard} />
          ) : !hasPositiveValues((performance?.top_endpoints ?? []).map((item) => item.requests)) ? (
            <EmptyState
              title="No performance endpoint data"
              description="Endpoint performance will render here when recent request summaries are available."
            />
          ) : (
            <AnalyticsBarChart
              horizontal
              labels={(performance?.top_endpoints ?? []).map((item) => item.endpoint)}
              series={[
                {
                  label: "Requests",
                  values: (performance?.top_endpoints ?? []).map((item) => item.requests),
                  color: "#7c3aed",
                },
                {
                  label: "Errors",
                  values: (performance?.top_endpoints ?? []).map((item) => item.errors),
                  color: "#dc2626",
                },
              ]}
            />
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <DashboardPanel
          title="Sessions"
          subtitle="Session analytics cards from the sessions summary endpoint"
        >
          {coreState.sessions.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.sessions.error ? (
            <ErrorState message={coreState.sessions.error} onRetry={loadCoreDashboard} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Sessions"
                value={formatCompactNumber(sessions?.total_sessions)}
                icon="mdi:monitor-dashboard"
              />
              <MetricCard
                label="Avg Session Time"
                value={sessions?.avg_session_time || formatDurationFromSeconds(0)}
                hint={`${formatDurationFromSeconds(sessions?.avg_session_time_seconds)} raw`}
                icon="mdi:timer-outline"
              />
              <MetricCard
                label="Pages / Session"
                value={toSafeNumber(sessions?.pages_per_session).toFixed(2)}
                icon="mdi:file-document-multiple-outline"
              />
              <MetricCard
                label="Bounce Rate"
                value={formatPercent(sessions?.bounce_rate)}
                icon="mdi:arrow-u-left-top"
              />
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Live Analytics"
          subtitle="Current live-user session snapshot"
        >
          {coreState.liveUsers.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.liveUsers.error ? (
            <ErrorState message={coreState.liveUsers.error} onRetry={loadCoreDashboard} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MetricCard
                label="Active Users Now"
                value={formatNumber(liveUsers?.active_users_now)}
                icon="mdi:account-group-outline"
              />
              <MetricCard
                label="Active Sessions"
                value={formatNumber(liveUsers?.active_sessions)}
                icon="mdi:monitor-cellphone"
              />
              <MetricCard
                label="Logged In Users"
                value={formatNumber(liveUsers?.logged_in_users_now)}
                icon="mdi:account-check-outline"
              />
              <MetricCard
                label="Guest Users"
                value={formatNumber(liveUsers?.guest_users_now)}
                icon="mdi:account-outline"
              />
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <DashboardPanel
          title="Devices, Browsers, and OS"
          subtitle="Session-summary breakdown from the devices endpoint"
        >
          {coreState.devices.isLoading ? (
            <LoadingBlock lines={9} />
          ) : coreState.devices.error ? (
            <ErrorState message={coreState.devices.error} onRetry={loadCoreDashboard} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Total Users"
                  value={formatCompactNumber(devices?.summary.total_users)}
                  icon="mdi:account-group-outline"
                />
                <MetricCard
                  label="Logged In"
                  value={formatCompactNumber(devices?.summary.logged_in_users)}
                  icon="mdi:account-check-outline"
                />
                <MetricCard
                  label="Guests"
                  value={formatCompactNumber(devices?.summary.guest_users)}
                  icon="mdi:account-outline"
                />
                <MetricCard
                  label="Total Sessions"
                  value={formatCompactNumber(devices?.summary.total_sessions)}
                  icon="mdi:monitor-dashboard"
                />
                <MetricCard
                  label="Avg Sessions / User"
                  value={toSafeNumber(devices?.summary.avg_sessions_per_user).toFixed(2)}
                  icon="mdi:chart-bell-curve-cumulative"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {!hasPositiveValues((devices?.devices ?? []).map((item) => item.users)) ? (
                  <EmptyState
                    title="No device distribution"
                    description="Device segmentation will appear when users and sessions are tracked."
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    labels={(devices?.devices ?? []).map((item) =>
                      prettifyFeatureName(item.device),
                    )}
                    values={(devices?.devices ?? []).map((item) => item.users)}
                    colors={buildChartPalette((devices?.devices ?? []).length)}
                  />
                )}

                {!hasPositiveValues((devices?.browsers ?? []).map((item) => item.users)) ? (
                  <EmptyState
                    title="No browser breakdown"
                    description="Browser analytics are empty for the selected range."
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    labels={(devices?.browsers ?? []).map((item) =>
                      prettifyFeatureName(item.browser),
                    )}
                    values={(devices?.browsers ?? []).map((item) => item.users)}
                    colors={buildChartPalette((devices?.browsers ?? []).length)}
                  />
                )}

                {!hasPositiveValues((devices?.os ?? []).map((item) => item.users)) ? (
                  <EmptyState
                    title="No OS breakdown"
                    description="Operating system analytics are empty for the selected range."
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    labels={(devices?.os ?? []).map((item) => prettifyFeatureName(item.os))}
                    values={(devices?.os ?? []).map((item) => item.users)}
                    colors={buildChartPalette((devices?.os ?? []).length)}
                  />
                )}
              </div>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Audience Activity"
          subtitle="Daily, weekly, and monthly active users"
        >
          {coreState.userActivity.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.userActivity.error ? (
            <ErrorState message={coreState.userActivity.error} onRetry={loadCoreDashboard} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="DAU"
                value={formatCompactNumber(userActivity?.dau)}
                hint="Daily active users"
                icon="mdi:calendar-today-outline"
              />
              <MetricCard
                label="WAU"
                value={formatCompactNumber(userActivity?.wau)}
                hint="Weekly active users"
                icon="mdi:calendar-week-outline"
              />
              <MetricCard
                label="MAU"
                value={formatCompactNumber(userActivity?.mau)}
                hint="Monthly active users"
                icon="mdi:calendar-month-outline"
              />
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardPanel title="Countries" subtitle="Top countries by aggregated location count">
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: countryRows,
            emptyTitle: "No country data",
            emptyDescription: "Country-level location aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table aria-label="Countries table" removeWrapper>
                <TableHeader>
                  <TableColumn>Country</TableColumn>
                  <TableColumn>Count</TableColumn>
                </TableHeader>
                <TableBody items={countryRows}>
                  {(item) => (
                    <TableRow key={item.label}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>{formatNumber(item.count)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ),
          })}
        </DashboardPanel>

        <DashboardPanel title="Regions" subtitle="Top regions by aggregated location count">
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: regionRows,
            emptyTitle: "No region data",
            emptyDescription: "Region-level aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table aria-label="Regions table" removeWrapper>
                <TableHeader>
                  <TableColumn>Region</TableColumn>
                  <TableColumn>Count</TableColumn>
                </TableHeader>
                <TableBody items={regionRows}>
                  {(item) => (
                    <TableRow key={item.label}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>{formatNumber(item.count)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ),
          })}
        </DashboardPanel>

        <DashboardPanel title="Cities" subtitle="Top cities by aggregated location count">
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: cityRows,
            emptyTitle: "No city data",
            emptyDescription: "City-level aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table aria-label="Cities table" removeWrapper>
                <TableHeader>
                  <TableColumn>City</TableColumn>
                  <TableColumn>Count</TableColumn>
                </TableHeader>
                <TableBody items={cityRows}>
                  {(item) => (
                    <TableRow key={item.label}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>{formatNumber(item.count)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ),
          })}
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Activity Feed"
        subtitle="Latest analytics events from the activity feed endpoint"
        action={
          <Chip variant="flat" radius="full">
            {activityFeed?.limit ?? activityLimit} rows
          </Chip>
        }
      >
        {renderTableFrame({
          isLoading: coreState.activityFeed.isLoading,
          error: coreState.activityFeed.error,
          items: activityFeed?.items ?? [],
          emptyTitle: "No activity feed items",
          emptyDescription: "No recent feed items were returned for the current limit.",
          onRetry: loadCoreDashboard,
          children: (
            <Table aria-label="Activity feed table" removeWrapper>
              <TableHeader>
                <TableColumn>Event</TableColumn>
                <TableColumn>Page / Endpoint</TableColumn>
                <TableColumn>Context</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody items={activityFeed?.items ?? []}>
                {(item: ActivityFeedItem) => (
                  <TableRow key={item.analytics_event_id}>
                    <TableCell>{prettifyFeatureName(item.event_type)}</TableCell>
                    <TableCell>{item.page || item.endpoint || "-"}</TableCell>
                    <TableCell>
                      {[
                        item.device,
                        item.browser,
                        item.os,
                        item.source,
                        item.status_code ? String(item.status_code) : null,
                      ]
                        .filter(Boolean)
                        .join(" | ") || "-"}
                    </TableCell>
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ),
        })}
      </DashboardPanel>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardPanel
          title="Recent Users"
          subtitle="Paginated recent users list"
          action={
            <Chip variant="flat" radius="full">
              {formatNumber(recentUsersState.pagination.total)} total
            </Chip>
          }
        >
          {renderTableFrame({
            isLoading: recentUsersState.isLoading,
            error: recentUsersState.error,
            items: recentUsersState.items,
            emptyTitle: "No recent users",
            emptyDescription: "The backend returned no recent users for the current page.",
            onRetry: () => loadRecentUsers(recentUsersPage),
            children: (
              <div className="space-y-4">
                <Table aria-label="Recent users table" removeWrapper>
                  <TableHeader>
                    <TableColumn>User</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Plan</TableColumn>
                    <TableColumn>Created</TableColumn>
                  </TableHeader>
                  <TableBody items={recentUsersState.items}>
                    {(item: RecentUser) => (
                      <TableRow key={item.user_id}>
                        <TableCell>{String(item.name ?? `User #${item.user_id}`)}</TableCell>
                        <TableCell>{String(item.email ?? "-")}</TableCell>
                        <TableCell>{item.is_paid ? "Paid" : "Free"}</TableCell>
                        <TableCell>{formatDateTime(item.created_at)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-default-500">
                    Page {recentUsersState.pagination.page} of {userTablePages}
                  </p>
                  <Pagination
                    color="primary"
                    page={recentUsersPage}
                    total={userTablePages}
                    showControls
                    onChange={setRecentUsersPage}
                  />
                </div>
              </div>
            ),
          })}
        </DashboardPanel>

        <DashboardPanel
          title="Recent Payments"
          subtitle="Paginated recent payments list"
          action={
            <Chip variant="flat" radius="full">
              {formatNumber(recentPaymentsState.pagination.total)} total
            </Chip>
          }
        >
          {renderTableFrame({
            isLoading: recentPaymentsState.isLoading,
            error: recentPaymentsState.error,
            items: recentPaymentsState.items,
            emptyTitle: "No recent payments",
            emptyDescription: "The backend returned no recent payments for the current page.",
            onRetry: () => loadRecentPayments(recentPaymentsPage),
            children: (
              <div className="space-y-4">
                <Table aria-label="Recent payments table" removeWrapper>
                  <TableHeader>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Status</TableColumn>
                  </TableHeader>
                  <TableBody items={recentPaymentsState.items}>
                    {(item: RecentPayment) => (
                      <TableRow key={item.payment_id}>
                        <TableCell>{item.name || `User #${item.user_id}`}</TableCell>
                        <TableCell>{item.email || "-"}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{prettifyFeatureName(item.status)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-default-500">
                    Page {recentPaymentsState.pagination.page} of {paymentsTablePages}
                  </p>
                  <Pagination
                    color="primary"
                    page={recentPaymentsPage}
                    total={paymentsTablePages}
                    showControls
                    onChange={setRecentPaymentsPage}
                  />
                </div>
              </div>
            ),
          })}
        </DashboardPanel>

        <DashboardPanel
          title="Recent Messages"
          subtitle="Paginated recent support messages"
          action={
            <Chip variant="flat" radius="full">
              {formatNumber(recentMessagesState.pagination.total)} total
            </Chip>
          }
        >
          {renderTableFrame({
            isLoading: recentMessagesState.isLoading,
            error: recentMessagesState.error,
            items: recentMessagesState.items,
            emptyTitle: "No recent messages",
            emptyDescription: "The backend returned no recent support messages for the current page.",
            onRetry: () => loadRecentMessages(recentMessagesPage),
            children: (
              <div className="space-y-4">
                <Table aria-label="Recent messages table" removeWrapper>
                  <TableHeader>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Subject</TableColumn>
                    <TableColumn>Created</TableColumn>
                  </TableHeader>
                  <TableBody items={recentMessagesState.items}>
                    {(item: RecentMessage) => (
                      <TableRow key={item.contact_message_id}>
                        <TableCell>{item.name || "-"}</TableCell>
                        <TableCell>{item.email || "-"}</TableCell>
                        <TableCell>{item.subject || "-"}</TableCell>
                        <TableCell>{formatDateTime(item.created_at)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-default-500">
                    Page {recentMessagesState.pagination.page} of {messagesTablePages}
                  </p>
                  <Pagination
                    color="primary"
                    page={recentMessagesPage}
                    total={messagesTablePages}
                    showControls
                    onChange={setRecentMessagesPage}
                  />
                </div>
              </div>
            ),
          })}
        </DashboardPanel>
      </section>
    </div>
  );
}

export default DashboardHome;
