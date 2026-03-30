import type {
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getAnalyticsErrorMessage,
  getAnalyticsLiveUsers,
  getAnalyticsOverview,
  getDevices,
  getFeatureUsage,
  getLocations,
  getMessagesGrowth,
  getPageViews,
  getPerformance,
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

const DAY_OPTIONS: DayRange[] = [7, 30, 90, 180, 365];
const MINUTE_OPTIONS: MinutesRange[] = [15, 30, 60, 180, 360, 1440];
const TOP_LIMIT_OPTIONS = [5, 10, 20];
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

function buildFeatureUsageItems(
  data: FeatureUsageData | null,
): FeatureUsageItem[] {
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

function buildSourceItems(
  data: TrafficSourcesData | null,
): { source: string; count: number }[] {
  if (!data) {
    return [];
  }

  if (data.top_sources.length) {
    return [...data.top_sources].sort(
      (first, second) => second.count - first.count,
    );
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
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return children;
}

function DashboardHome() {
  const [days, setDays] = useState<DayRange>(30);
  const [minutes, setMinutes] = useState<MinutesRange>(60);
  const [topLimit, setTopLimit] = useState<number>(10);
  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentPaymentsPage, setRecentPaymentsPage] = useState(1);


  const [coreState, setCoreState] = useState<DashboardCoreState>(() =>
    createCoreState(),
  );
  const [recentUsersState, setRecentUsersState] = useState<
    PaginatedSectionState<RecentUser>
  >(createPaginatedSectionState);
  const [recentPaymentsState, setRecentPaymentsState] = useState<
    PaginatedSectionState<RecentPayment>
  >(createPaginatedSectionState);
  

  const coreRequestRef = useRef(0);
  const usersRequestRef = useRef(0);
  const paymentsRequestRef = useRef(0);
  const loadCoreDashboard = useCallback(async () => {
    const requestId = ++coreRequestRef.current;

    setCoreState((previous) => ({
      overview: { ...previous.overview, isLoading: true, error: "" },
      usersGrowth: { ...previous.usersGrowth, isLoading: true, error: "" },
      revenueGrowth: { ...previous.revenueGrowth, isLoading: true, error: "" },
      messagesGrowth: {
        ...previous.messagesGrowth,
        isLoading: true,
        error: "",
      },
      pageViews: { ...previous.pageViews, isLoading: true, error: "" },
      topPages: { ...previous.topPages, isLoading: true, error: "" },
      devices: { ...previous.devices, isLoading: true, error: "" },
      liveUsers: { ...previous.liveUsers, isLoading: true, error: "" },
      featureUsage: { ...previous.featureUsage, isLoading: true, error: "" },
      userActivity: { ...previous.userActivity, isLoading: true, error: "" },
      sessions: { ...previous.sessions, isLoading: true, error: "" },
      locations: { ...previous.locations, isLoading: true, error: "" },
      trafficSources: {
        ...previous.trafficSources,
        isLoading: true,
        error: "",
      },
      performance: { ...previous.performance, isLoading: true, error: "" },
    }));

    const results = await Promise.allSettled([
      getAnalyticsOverview(days),
      getUsersGrowth(days),
      getRevenueGrowth(days),
      getMessagesGrowth(days),
      getPageViews(days, topLimit),
      getTopPages(days, topLimit),
      getDevices(days),
      getAnalyticsLiveUsers(),
      getFeatureUsage(days),
      getUserActivity(),
      getSessions(days),
      getLocations(days, topLimit),
      getTrafficSources(days, topLimit),
      getPerformance(minutes),
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
    });
  }, [days, minutes, topLimit]);

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

  useEffect(() => {
    loadCoreDashboard();
  }, [loadCoreDashboard]);

  useEffect(() => {
    loadRecentUsers(recentUsersPage);
  }, [loadRecentUsers, recentUsersPage]);

  useEffect(() => {
    loadRecentPayments(recentPaymentsPage);
  }, [loadRecentPayments, recentPaymentsPage]);

  const overview = coreState.overview.data;
  const pageViews = coreState.pageViews.data;
  const devices = coreState.devices.data;
  const liveUsers = coreState.liveUsers.data;
  const userActivity = coreState.userActivity.data;
  const sessions = coreState.sessions.data;
  const locations = coreState.locations.data;
  const trafficSources = coreState.trafficSources.data;
  const performance = coreState.performance.data;

  const featureUsageItems = useMemo(
    () => buildFeatureUsageItems(coreState.featureUsage.data),
    [coreState.featureUsage.data],
  );
  const sourceItems = useMemo(
    () => buildSourceItems(trafficSources),
    [trafficSources],
  );
  const countryRows = useMemo(
    () => buildLocationRows(locations?.countries, "country"),
    [locations],
  );
  const regionRows = useMemo(
    () => buildLocationRows(locations?.regions, "region"),
    [locations],
  );
  const cityRows = useMemo(
    () => buildLocationRows(locations?.cities, "city"),
    [locations],
  );

  const usersGrowthLabels = useMemo(
    () => coreState.usersGrowth.data.map((item) => formatDateLabel(item.date)),
    [coreState.usersGrowth.data],
  );
  const revenueGrowthLabels = useMemo(
    () =>
      coreState.revenueGrowth.data.map((item) => formatDateLabel(item.date)),
    [coreState.revenueGrowth.data],
  );
  const messagesGrowthLabels = useMemo(
    () =>
      coreState.messagesGrowth.data.map((item) => formatDateLabel(item.date)),
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
        value: formatCompactNumber(
          overview?.contact_support_analytics.total_messages,
        ),
        hint: overview?.contact_support_analytics.unread_messages_supported
          ? `${formatNumber(overview?.contact_support_analytics.unread_messages)} unread`
          : "Unread tracking unavailable",
        icon: "mdi:message-outline",
      },
      {
        label: "Total Requests",
        value: formatCompactNumber(
          overview?.platform_usage_analytics.total_requests,
        ),
        hint: `${formatCompactNumber(
          overview?.platform_usage_analytics.unique_api_requests,
        )} unique requests`,
        icon: "mdi:api",
      },
      {
        label: "Failure Rate",
        value: formatPercent(
          overview?.platform_usage_analytics.failure_rate,
          2,
        ),
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
              Built against the current{" "}
              <span className="font-mono">/admin/analytics</span> API. Every
              section handles aggregated, sparse, and zero-value datasets
              without collapsing charts or tables.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <SegmentedFilter
              isDisabled={coreState.overview.isLoading}
              label="Days"
              options={DAY_OPTIONS.map((value) => ({
                label: `${value}D`,
                value,
              }))}
              value={days}
              onChange={setDays}
            />
            <SegmentedFilter
              isDisabled={coreState.performance.isLoading}
              label="Minutes"
              options={MINUTE_OPTIONS.map((value) => ({
                label: `${value}m`,
                value,
              }))}
              value={minutes}
              onChange={setMinutes}
            />
            <SegmentedFilter
              isDisabled={coreState.topPages.isLoading}
              label="Top N"
              options={TOP_LIMIT_OPTIONS.map((value) => ({
                label: String(value),
                value,
              }))}
              value={topLimit}
              onChange={setTopLimit}
            />
            <div className="flex items-end">
              <Button
                color="primary"
                radius="full"
                startContent={<Icon icon="solar:refresh-bold" width="18" />}
                onPress={loadCoreDashboard}
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
                className="min-h-[140px]"
                title="Loading"
              >
                <LoadingBlock lines={4} />
              </DashboardPanel>
            ))
          : kpiCards.map((card) => (
              <MetricCard
                key={card.label}
                hint={card.hint}
                icon={card.icon}
                label={card.label}
                tone={card.tone}
                value={card.value}
              />
            ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          action={
            <Chip radius="full" variant="flat">
              {coreState.usersGrowth.data.length} points
            </Chip>
          }
          subtitle={`Daily user growth for the last ${days} days`}
          title="Users Growth"
        >
          {coreState.usersGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.usersGrowth.error ? (
            <ErrorState
              message={coreState.usersGrowth.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              coreState.usersGrowth.data.map((item) => item.users),
            ) ? (
            <EmptyState
              description="The selected window has no recorded user growth yet."
              title="No user growth data"
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
          action={
            <Chip radius="full" variant="flat">
              {formatCurrency(overview?.payment_analytics.revenue_7d)} 7D
              revenue
            </Chip>
          }
          subtitle="Revenue and payments by date"
          title="Revenue Growth"
        >
          {coreState.revenueGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.revenueGrowth.error ? (
            <ErrorState
              message={coreState.revenueGrowth.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              coreState.revenueGrowth.data.flatMap((item) => [
                item.revenue,
                item.payments,
              ]),
            ) ? (
            <EmptyState
              description="Payment analytics are empty for the selected period."
              title="No revenue data"
            />
          ) : (
            <AnalyticsLineChart
              dualAxis
              labels={revenueGrowthLabels}
              series={[
                {
                  label: "Revenue",
                  values: coreState.revenueGrowth.data.map(
                    (item) => item.revenue,
                  ),
                  color: "#2563eb",
                  fill: true,
                },
                {
                  label: "Payments",
                  values: coreState.revenueGrowth.data.map(
                    (item) => item.payments,
                  ),
                  color: "#d97706",
                  yAxisID: "y1",
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          subtitle="Contact message volume across the selected range"
          title="Messages Growth"
        >
          {coreState.messagesGrowth.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.messagesGrowth.error ? (
            <ErrorState
              message={coreState.messagesGrowth.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              coreState.messagesGrowth.data.map((item) => item.messages),
            ) ? (
            <EmptyState
              description="No support message activity has been recorded for this filter."
              title="No message growth data"
            />
          ) : (
            <AnalyticsLineChart
              labels={messagesGrowthLabels}
              series={[
                {
                  label: "Messages",
                  values: coreState.messagesGrowth.data.map(
                    (item) => item.messages,
                  ),
                  color: "#db2777",
                  fill: true,
                },
              ]}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          action={
            <Chip radius="full" variant="flat">
              {overview?.platform_usage_analytics.tracking_enabled
                ? "Tracking On"
                : "Tracking Off"}
            </Chip>
          }
          subtitle="Overview platform usage analytics"
          title="API Usage Stats"
        >
          {coreState.overview.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.overview.error ? (
            <ErrorState
              message={coreState.overview.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              overview?.platform_usage_analytics.api_usage_stats.flatMap(
                (item) => [
                  item.requests,
                  item.unique_api_requests,
                  item.errors,
                ],
              ) ?? [],
            ) ? (
            <EmptyState
              description="API usage tracking is disabled or the selected range has no request summaries."
              title="No platform usage data"
            />
          ) : (
            <AnalyticsLineChart
              dualAxis
              labels={apiUsageLabels}
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
          action={
            <Chip radius="full" variant="flat">
              {formatNumber(pageViews?.unique_page_views)} unique views
            </Chip>
          }
          subtitle="Aggregated page-view metrics and most viewed pages"
          title="Page Views"
        >
          {coreState.pageViews.isLoading ? (
            <LoadingBlock lines={10} />
          ) : coreState.pageViews.error ? (
            <ErrorState
              message={coreState.pageViews.error}
              onRetry={loadCoreDashboard}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard
                  hint={`${formatNumber(pageViews?.page_views_today)} today`}
                  icon="mdi:file-eye-outline"
                  label="Total Page Views"
                  value={formatCompactNumber(pageViews?.total_page_views)}
                />
                <MetricCard
                  hint={`${formatNumber(pageViews?.page_views_7d)} in 7 days`}
                  icon="mdi:account-eye-outline"
                  label="Unique Page Views"
                  value={formatCompactNumber(pageViews?.unique_page_views)}
                />
                <MetricCard
                  hint={`Last ${days} days`}
                  icon="mdi:calendar-today-outline"
                  label="Page Views Today"
                  value={formatNumber(pageViews?.page_views_today)}
                />
                <MetricCard
                  hint={`Top ${topLimit} pages`}
                  icon="mdi:chart-line"
                  label="Page Views 7D"
                  value={formatNumber(pageViews?.page_views_7d)}
                />
              </div>

              {!hasPositiveValues(
                (pageViews?.most_viewed_pages ?? []).map((item) => item.views),
              ) ? (
                <EmptyState
                  description="Most-viewed pages will appear here when aggregated page views are available."
                  title="No page-view distribution"
                />
              ) : (
                <AnalyticsBarChart
                  horizontal
                  labels={(pageViews?.most_viewed_pages ?? []).map(
                    (item) => item.page,
                  )}
                  series={[
                    {
                      label: "Views",
                      values: (pageViews?.most_viewed_pages ?? []).map(
                        (item) => item.views,
                      ),
                      color: "#0f766e",
                    },
                  ]}
                />
              )}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          subtitle="Top pages endpoint rendered as a horizontal bar chart"
          title="Top Pages"
        >
          {coreState.topPages.isLoading ? (
            <LoadingBlock lines={10} />
          ) : coreState.topPages.error ? (
            <ErrorState
              message={coreState.topPages.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              coreState.topPages.data.map((item) => item.views),
            ) ? (
            <EmptyState
              description="The backend returned no ranked pages for the selected filters."
              title="No top page data"
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
          action={
            <Chip radius="full" variant="flat">
              {sourceItems.length} sources
            </Chip>
          }
          subtitle="Traffic source distribution"
          title="Traffic Sources"
        >
          {coreState.trafficSources.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.trafficSources.error ? (
            <ErrorState
              message={coreState.trafficSources.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(sourceItems.map((item) => item.count)) ? (
            <EmptyState
              description="Traffic sources will populate here when session summaries include attribution."
              title="No traffic source data"
            />
          ) : (
            <AnalyticsDoughnutChart
              colors={buildChartPalette(sourceItems.length)}
              labels={sourceItems.map((item) =>
                prettifyFeatureName(item.source),
              )}
              values={sourceItems.map((item) => item.count)}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          subtitle="Most used product features across the selected range"
          title="Feature Usage"
        >
          {coreState.featureUsage.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.featureUsage.error ? (
            <ErrorState
              message={coreState.featureUsage.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              featureUsageItems.map((item) => item.usage),
            ) ? (
            <EmptyState
              description="Feature counters are currently empty for this period."
              title="No feature usage data"
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
          action={
            <Chip radius="full" variant="flat">
              {minutes} minute window
            </Chip>
          }
          subtitle="Top endpoints by requests in the selected minutes window"
          title="Performance Endpoints"
        >
          {coreState.performance.isLoading ? (
            <LoadingBlock lines={7} />
          ) : coreState.performance.error ? (
            <ErrorState
              message={coreState.performance.error}
              onRetry={loadCoreDashboard}
            />
          ) : !hasPositiveValues(
              (performance?.top_endpoints ?? []).map((item) => item.requests),
            ) ? (
            <EmptyState
              description="Endpoint performance will render here when recent request summaries are available."
              title="No performance endpoint data"
            />
          ) : (
            <AnalyticsBarChart
              horizontal
              labels={(performance?.top_endpoints ?? []).map(
                (item) => item.endpoint,
              )}
              series={[
                {
                  label: "Requests",
                  values: (performance?.top_endpoints ?? []).map(
                    (item) => item.requests,
                  ),
                  color: "#7c3aed",
                },
                {
                  label: "Errors",
                  values: (performance?.top_endpoints ?? []).map(
                    (item) => item.errors,
                  ),
                  color: "#dc2626",
                },
              ]}
            />
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <DashboardPanel
          subtitle="Session analytics cards from the sessions summary endpoint"
          title="Sessions"
        >
          {coreState.sessions.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.sessions.error ? (
            <ErrorState
              message={coreState.sessions.error}
              onRetry={loadCoreDashboard}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon="mdi:monitor-dashboard"
                label="Total Sessions"
                value={formatCompactNumber(sessions?.total_sessions)}
              />
              <MetricCard
                hint={`${formatDurationFromSeconds(sessions?.avg_session_time_seconds)} raw`}
                icon="mdi:timer-outline"
                label="Avg Session Time"
                value={
                  sessions?.avg_session_time || formatDurationFromSeconds(0)
                }
              />
              <MetricCard
                icon="mdi:file-document-multiple-outline"
                label="Pages / Session"
                value={toSafeNumber(sessions?.pages_per_session).toFixed(2)}
              />
              <MetricCard
                icon="mdi:arrow-u-left-top"
                label="Bounce Rate"
                value={formatPercent(sessions?.bounce_rate)}
              />
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          subtitle="Current live-user session snapshot"
          title="Live Analytics"
        >
          {coreState.liveUsers.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.liveUsers.error ? (
            <ErrorState
              message={coreState.liveUsers.error}
              onRetry={loadCoreDashboard}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MetricCard
                icon="mdi:account-group-outline"
                label="Active Users Now"
                value={formatNumber(liveUsers?.active_users_now)}
              />
              <MetricCard
                icon="mdi:monitor-cellphone"
                label="Active Sessions"
                value={formatNumber(liveUsers?.active_sessions)}
              />
              <MetricCard
                icon="mdi:account-check-outline"
                label="Logged In Users"
                value={formatNumber(liveUsers?.logged_in_users_now)}
              />
              <MetricCard
                icon="mdi:account-outline"
                label="Guest Users"
                value={formatNumber(liveUsers?.guest_users_now)}
              />
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <DashboardPanel
          subtitle="Session-summary breakdown from the devices endpoint"
          title="Devices, Browsers, and OS"
        >
          {coreState.devices.isLoading ? (
            <LoadingBlock lines={9} />
          ) : coreState.devices.error ? (
            <ErrorState
              message={coreState.devices.error}
              onRetry={loadCoreDashboard}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  icon="mdi:account-group-outline"
                  label="Total Users"
                  value={formatCompactNumber(devices?.summary.total_users)}
                />
                <MetricCard
                  icon="mdi:account-check-outline"
                  label="Logged In"
                  value={formatCompactNumber(devices?.summary.logged_in_users)}
                />
                <MetricCard
                  icon="mdi:account-outline"
                  label="Guests"
                  value={formatCompactNumber(devices?.summary.guest_users)}
                />
                <MetricCard
                  icon="mdi:monitor-dashboard"
                  label="Total Sessions"
                  value={formatCompactNumber(devices?.summary.total_sessions)}
                />
                <MetricCard
                  icon="mdi:chart-bell-curve-cumulative"
                  label="Avg Sessions / User"
                  value={toSafeNumber(
                    devices?.summary.avg_sessions_per_user,
                  ).toFixed(2)}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {!hasPositiveValues(
                  (devices?.devices ?? []).map((item) => item.users),
                ) ? (
                  <EmptyState
                    description="Device segmentation will appear when users and sessions are tracked."
                    title="No device distribution"
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    colors={buildChartPalette((devices?.devices ?? []).length)}
                    labels={(devices?.devices ?? []).map((item) =>
                      prettifyFeatureName(item.device),
                    )}
                    values={(devices?.devices ?? []).map((item) => item.users)}
                  />
                )}

                {!hasPositiveValues(
                  (devices?.browsers ?? []).map((item) => item.users),
                ) ? (
                  <EmptyState
                    description="Browser analytics are empty for the selected range."
                    title="No browser breakdown"
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    colors={buildChartPalette((devices?.browsers ?? []).length)}
                    labels={(devices?.browsers ?? []).map((item) =>
                      prettifyFeatureName(item.browser),
                    )}
                    values={(devices?.browsers ?? []).map((item) => item.users)}
                  />
                )}

                {!hasPositiveValues(
                  (devices?.os ?? []).map((item) => item.users),
                ) ? (
                  <EmptyState
                    description="Operating system analytics are empty for the selected range."
                    title="No OS breakdown"
                  />
                ) : (
                  <AnalyticsDoughnutChart
                    colors={buildChartPalette((devices?.os ?? []).length)}
                    labels={(devices?.os ?? []).map((item) =>
                      prettifyFeatureName(item.os),
                    )}
                    values={(devices?.os ?? []).map((item) => item.users)}
                  />
                )}
              </div>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          subtitle="Daily, weekly, and monthly active users"
          title="Audience Activity"
        >
          {coreState.userActivity.isLoading ? (
            <LoadingBlock lines={8} />
          ) : coreState.userActivity.error ? (
            <ErrorState
              message={coreState.userActivity.error}
              onRetry={loadCoreDashboard}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                hint="Daily active users"
                icon="mdi:calendar-today-outline"
                label="DAU"
                value={formatCompactNumber(userActivity?.dau)}
              />
              <MetricCard
                hint="Weekly active users"
                icon="mdi:calendar-week-outline"
                label="WAU"
                value={formatCompactNumber(userActivity?.wau)}
              />
              <MetricCard
                hint="Monthly active users"
                icon="mdi:calendar-month-outline"
                label="MAU"
                value={formatCompactNumber(userActivity?.mau)}
              />
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardPanel
          subtitle="Top countries by aggregated location count"
          title="Countries"
        >
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: countryRows,
            emptyTitle: "No country data",
            emptyDescription:
              "Country-level location aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table removeWrapper aria-label="Countries table">
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

        <DashboardPanel
          subtitle="Top regions by aggregated location count"
          title="Regions"
        >
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: regionRows,
            emptyTitle: "No region data",
            emptyDescription:
              "Region-level aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table removeWrapper aria-label="Regions table">
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

        <DashboardPanel
          subtitle="Top cities by aggregated location count"
          title="Cities"
        >
          {renderTableFrame({
            isLoading: coreState.locations.isLoading,
            error: coreState.locations.error,
            items: cityRows,
            emptyTitle: "No city data",
            emptyDescription: "City-level aggregation is empty for this range.",
            onRetry: loadCoreDashboard,
            children: (
              <Table removeWrapper aria-label="Cities table">
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          action={
            <Chip radius="full" variant="flat">
              {formatNumber(recentUsersState.pagination.total)} total
            </Chip>
          }
          subtitle="Paginated recent users list"
          title="Recent Users"
        >
          {renderTableFrame({
            isLoading: recentUsersState.isLoading,
            error: recentUsersState.error,
            items: recentUsersState.items,
            emptyTitle: "No recent users",
            emptyDescription:
              "The backend returned no recent users for the current page.",
            onRetry: () => loadRecentUsers(recentUsersPage),
            children: (
              <div className="space-y-4">
                <Table removeWrapper aria-label="Recent users table">
                  <TableHeader>
                    <TableColumn>User</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Plan</TableColumn>
                    <TableColumn>Created</TableColumn>
                  </TableHeader>
                  <TableBody items={recentUsersState.items}>
                    {(item: RecentUser) => (
                      <TableRow key={item.user_id}>
                        <TableCell>
                          {String(item.name ?? `User #${item.user_id}`)}
                        </TableCell>
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
                    showControls
                    boundaries={1}
                    color="primary"
                    page={recentUsersPage}
                    siblings={0}
                    total={userTablePages}
                    onChange={setRecentUsersPage}
                  />
                </div>
              </div>
            ),
          })}
        </DashboardPanel>

        <DashboardPanel
          action={
            <Chip radius="full" variant="flat">
              {formatNumber(recentPaymentsState.pagination.total)} total
            </Chip>
          }
          subtitle="Paginated recent payments list"
          title="Recent Payments"
        >
          {renderTableFrame({
            isLoading: recentPaymentsState.isLoading,
            error: recentPaymentsState.error,
            items: recentPaymentsState.items,
            emptyTitle: "No recent payments",
            emptyDescription:
              "The backend returned no recent payments for the current page.",
            onRetry: () => loadRecentPayments(recentPaymentsPage),
            children: (
              <div className="space-y-4">
                <Table removeWrapper aria-label="Recent payments table">
                  <TableHeader>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Status</TableColumn>
                  </TableHeader>
                  <TableBody items={recentPaymentsState.items}>
                    {(item: RecentPayment) => (
                      <TableRow key={item.payment_id}>
                        <TableCell>
                          {item.name || `User #${item.user_id}`}
                        </TableCell>
                        <TableCell>{item.email || "-"}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>
                          {prettifyFeatureName(item.status)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-default-500">
                    Page {recentPaymentsState.pagination.page} of{" "}
                    {paymentsTablePages}
                  </p>
                  <Pagination
                    showControls
                    boundaries={1}
                    color="primary"
                    page={recentPaymentsPage}
                    siblings={0}
                    total={paymentsTablePages}
                    onChange={setRecentPaymentsPage}
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
