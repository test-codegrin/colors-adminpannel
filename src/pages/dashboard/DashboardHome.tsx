import {
  Button,
  Card,
  CardBody,
  Chip,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { useAuth } from "@/context/AuthContext";
import type {
  ActivityFeedItem,
  AnalyticsOverview,
  DayRange,
  DeviceBreakdownItem,
  FeatureUsageItem,
  LiveUsersData,
  LocationBreakdownItem,
  MessagesGrowthPoint,
  PageViewsPoint,
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

const DAY_OPTIONS: DayRange[] = [7, 30, 90];
const DEFAULT_LIMIT = 10;
const CHART_PRIMARY_COLOR = "#006FEE";
const CHART_SECONDARY_COLOR = "#f5a524";
const CHART_GRID_COLOR = "#e4e4e7";
const CHART_TICK_COLOR = "#71717a";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const initialPagination: PaginationPayload = {
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  total_pages: 1,
  totalPages: 1,
};

interface PaginatedSectionState<T> {
  items: T[];
  pagination: PaginationPayload;
  isLoading: boolean;
  error: string;
}

interface ChartRow {
  label: string;
  value: number;
  secondaryValue?: number;
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
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

function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "-";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

function formatChartLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function toSafeNumber(value: unknown, fallback = 0): number {
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

function getValueByKeys(
  source: Record<string, unknown>,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function getTotalPages(pagination: PaginationPayload): number {
  return Math.max(1, pagination.total_pages ?? pagination.totalPages ?? 1);
}

function createPaginatedState<T>(): PaginatedSectionState<T> {
  return {
    items: [],
    pagination: { ...initialPagination },
    isLoading: true,
    error: "",
  };
}

function GrowthChart({
  data,
  isCurrency = false,
  secondaryScale = "shared",
}: {
  data: ChartRow[];
  isCurrency?: boolean;
  secondaryScale?: "shared" | "independent";
}) {
  if (!data.length) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-default-500">
        No data available
      </div>
    );
  }

  const labels = data.map((point) => point.label);
  const primaryValues = data.map((point) => point.value);
  const hasSecondary = data.some((point) => typeof point.secondaryValue === "number");
  const secondaryValues = hasSecondary
    ? data.map((point) => point.secondaryValue ?? 0)
    : [];
  const chartData = useMemo<ChartData<"line">>(() => {
    const datasets: ChartData<"line">["datasets"] = [
      {
        label: isCurrency ? "Revenue" : "Value",
        data: primaryValues,
        borderColor: CHART_PRIMARY_COLOR,
        backgroundColor: CHART_PRIMARY_COLOR,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 4,
      },
    ];

    if (hasSecondary) {
      datasets.push({
        label: "Payments",
        data: secondaryValues,
        borderColor: CHART_SECONDARY_COLOR,
        backgroundColor: CHART_SECONDARY_COLOR,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 3.5,
        yAxisID: secondaryScale === "independent" ? "y1" : "y",
      });
    }

    return { labels, datasets };
  }, [hasSecondary, isCurrency, labels, primaryValues, secondaryScale, secondaryValues]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const scales: NonNullable<ChartOptions<"line">["scales"]> = {
      x: {
        grid: { display: false },
        ticks: { color: CHART_TICK_COLOR, maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: true,
        grid: { color: CHART_GRID_COLOR },
        ticks: { color: CHART_TICK_COLOR },
      },
    };

    if (hasSecondary && secondaryScale === "independent") {
      scales.y1 = {
        beginAtZero: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: CHART_TICK_COLOR },
      };
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      normalized: true,
      plugins: {
        legend: {
          display: hasSecondary,
          labels: { color: CHART_TICK_COLOR },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales,
    };
  }, [hasSecondary, secondaryScale]);

  const firstLabel = data[0]?.label ?? "-";
  const lastLabel = data[data.length - 1]?.label ?? "-";
  const latestValue = data[data.length - 1]?.value ?? 0;

  return (
    <div className="w-full">
      <div className="h-52 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-default-500">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>

      <p className="mt-2 text-sm text-default-600">
        Latest:{" "}
        <span className="font-medium text-foreground">
          {isCurrency
            ? currencyFormatter.format(latestValue)
            : numberFormatter.format(latestValue)}
        </span>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  isLoading,
  isCurrency = false,
}: {
  label: string;
  value: number;
  isLoading: boolean;
  isCurrency?: boolean;
}) {
  return (
    <Card shadow="sm">
      <CardBody className="gap-1">
        <p className="text-xs uppercase tracking-wide text-default-500">{label}</p>
        {isLoading ? (
          <div className="h-8 flex items-center">
            <Spinner size="sm" />
          </div>
        ) : (
          <p className="text-2xl font-semibold">
            {isCurrency ? currencyFormatter.format(value) : numberFormatter.format(value)}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function DashboardHome() {
  const { admin } = useAuth();
  const [days, setDays] = useState<DayRange>(30);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [usersGrowth, setUsersGrowth] = useState<UsersGrowthPoint[]>([]);
  const [usersGrowthLoading, setUsersGrowthLoading] = useState(true);
  const [usersGrowthError, setUsersGrowthError] = useState("");

  const [revenueGrowth, setRevenueGrowth] = useState<RevenueGrowthPoint[]>([]);
  const [revenueGrowthLoading, setRevenueGrowthLoading] = useState(true);
  const [revenueGrowthError, setRevenueGrowthError] = useState("");

  const [messagesGrowth, setMessagesGrowth] = useState<MessagesGrowthPoint[]>([]);
  const [messagesGrowthLoading, setMessagesGrowthLoading] = useState(true);
  const [messagesGrowthError, setMessagesGrowthError] = useState("");
  const [pageViews, setPageViews] = useState<PageViewsPoint[]>([]);
  const [pageViewsLoading, setPageViewsLoading] = useState(true);
  const [pageViewsError, setPageViewsError] = useState("");
  const [sessions, setSessions] = useState<SessionsPoint[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topPagesLoading, setTopPagesLoading] = useState(true);
  const [topPagesError, setTopPagesError] = useState("");
  const [devices, setDevices] = useState<DeviceBreakdownItem[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageItem[]>([]);
  const [featureUsageLoading, setFeatureUsageLoading] = useState(true);
  const [featureUsageError, setFeatureUsageError] = useState("");

  const [locations, setLocations] = useState<LocationBreakdownItem[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");
  const [trafficSources, setTrafficSources] = useState<TrafficSourceItem[]>([]);
  const [trafficSourcesLoading, setTrafficSourcesLoading] = useState(true);
  const [trafficSourcesError, setTrafficSourcesError] = useState("");

  const [liveUsersData, setLiveUsersData] = useState<LiveUsersData | null>(null);
  const [liveUsersLoading, setLiveUsersLoading] = useState(true);
  const [liveUsersError, setLiveUsersError] = useState("");
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState("");

  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentPaymentsPage, setRecentPaymentsPage] = useState(1);
  const [recentMessagesPage, setRecentMessagesPage] = useState(1);
  const [userActivityPage, setUserActivityPage] = useState(1);
  const [activityFeedPage, setActivityFeedPage] = useState(1);

  const [recentUsersState, setRecentUsersState] =
    useState<PaginatedSectionState<RecentUser>>(() =>
      createPaginatedState<RecentUser>(),
    );
  const [recentPaymentsState, setRecentPaymentsState] =
    useState<PaginatedSectionState<RecentPayment>>(() =>
      createPaginatedState<RecentPayment>(),
    );
  const [recentMessagesState, setRecentMessagesState] =
    useState<PaginatedSectionState<RecentMessage>>(() =>
      createPaginatedState<RecentMessage>(),
    );
  const [userActivityState, setUserActivityState] =
    useState<PaginatedSectionState<UserActivityItem>>(() =>
      createPaginatedState<UserActivityItem>(),
    );
  const [activityFeedState, setActivityFeedState] =
    useState<PaginatedSectionState<ActivityFeedItem>>(() =>
      createPaginatedState<ActivityFeedItem>(),
    );

  const analyticsRequestRef = useRef(0);
  const usersRequestRef = useRef(0);
  const paymentsRequestRef = useRef(0);
  const messagesRequestRef = useRef(0);
  const userActivityRequestRef = useRef(0);
  const activityFeedRequestRef = useRef(0);

  const loadAnalytics = useCallback(async (selectedDays: DayRange) => {
    const requestId = ++analyticsRequestRef.current;

    setOverviewLoading(true);
    setUsersGrowthLoading(true);
    setRevenueGrowthLoading(true);
    setMessagesGrowthLoading(true);
    setPageViewsLoading(true);
    setSessionsLoading(true);
    setTopPagesLoading(true);
    setDevicesLoading(true);
    setFeatureUsageLoading(true);
    setLocationsLoading(true);
    setTrafficSourcesLoading(true);
    setLiveUsersLoading(true);
    setPerformanceLoading(true);

    setOverviewError("");
    setUsersGrowthError("");
    setRevenueGrowthError("");
    setMessagesGrowthError("");
    setPageViewsError("");
    setSessionsError("");
    setTopPagesError("");
    setDevicesError("");
    setFeatureUsageError("");
    setLocationsError("");
    setTrafficSourcesError("");
    setLiveUsersError("");
    setPerformanceError("");

    const [
      overviewResult,
      usersGrowthResult,
      revenueGrowthResult,
      messagesGrowthResult,
      pageViewsResult,
      sessionsResult,
      topPagesResult,
      devicesResult,
      featureUsageResult,
      locationsResult,
      trafficSourcesResult,
      liveUsersResult,
      performanceResult,
    ] = await Promise.allSettled([
      getAnalyticsOverview(selectedDays),
      getUsersGrowth(selectedDays),
      getRevenueGrowth(selectedDays),
      getMessagesGrowth(selectedDays),
      getPageViews(selectedDays),
      getSessions(selectedDays),
      getTopPages(selectedDays, 10),
      getDevices(selectedDays),
      getFeatureUsage(selectedDays),
      getLocations(selectedDays, 10),
      getTrafficSources(selectedDays),
      getLiveUsers(),
      getPerformance(60),
    ]);

    if (requestId !== analyticsRequestRef.current) {
      return;
    }

    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value);
    } else {
      setOverview(null);
      setOverviewError(getAnalyticsErrorMessage(overviewResult.reason));
    }
    setOverviewLoading(false);

    if (usersGrowthResult.status === "fulfilled") {
      setUsersGrowth(usersGrowthResult.value);
    } else {
      setUsersGrowth([]);
      setUsersGrowthError(getAnalyticsErrorMessage(usersGrowthResult.reason));
    }
    setUsersGrowthLoading(false);

    if (revenueGrowthResult.status === "fulfilled") {
      setRevenueGrowth(revenueGrowthResult.value);
    } else {
      setRevenueGrowth([]);
      setRevenueGrowthError(getAnalyticsErrorMessage(revenueGrowthResult.reason));
    }
    setRevenueGrowthLoading(false);

    if (messagesGrowthResult.status === "fulfilled") {
      setMessagesGrowth(messagesGrowthResult.value);
    } else {
      setMessagesGrowth([]);
      setMessagesGrowthError(getAnalyticsErrorMessage(messagesGrowthResult.reason));
    }
    setMessagesGrowthLoading(false);

    if (pageViewsResult.status === "fulfilled") {
      setPageViews(pageViewsResult.value);
    } else {
      setPageViews([]);
      setPageViewsError(getAnalyticsErrorMessage(pageViewsResult.reason));
    }
    setPageViewsLoading(false);

    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
    } else {
      setSessions([]);
      setSessionsError(getAnalyticsErrorMessage(sessionsResult.reason));
    }
    setSessionsLoading(false);

    if (topPagesResult.status === "fulfilled") {
      setTopPages(topPagesResult.value);
    } else {
      setTopPages([]);
      setTopPagesError(getAnalyticsErrorMessage(topPagesResult.reason));
    }
    setTopPagesLoading(false);

    if (devicesResult.status === "fulfilled") {
      setDevices(devicesResult.value);
    } else {
      setDevices([]);
      setDevicesError(getAnalyticsErrorMessage(devicesResult.reason));
    }
    setDevicesLoading(false);

    if (featureUsageResult.status === "fulfilled") {
      setFeatureUsage(featureUsageResult.value);
    } else {
      setFeatureUsage([]);
      setFeatureUsageError(getAnalyticsErrorMessage(featureUsageResult.reason));
    }
    setFeatureUsageLoading(false);

    if (locationsResult.status === "fulfilled") {
      setLocations(locationsResult.value);
    } else {
      setLocations([]);
      setLocationsError(getAnalyticsErrorMessage(locationsResult.reason));
    }
    setLocationsLoading(false);

    if (trafficSourcesResult.status === "fulfilled") {
      setTrafficSources(trafficSourcesResult.value);
    } else {
      setTrafficSources([]);
      setTrafficSourcesError(getAnalyticsErrorMessage(trafficSourcesResult.reason));
    }
    setTrafficSourcesLoading(false);

    if (liveUsersResult.status === "fulfilled") {
      setLiveUsersData(liveUsersResult.value);
    } else {
      setLiveUsersData(null);
      setLiveUsersError(getAnalyticsErrorMessage(liveUsersResult.reason));
    }
    setLiveUsersLoading(false);

    if (performanceResult.status === "fulfilled") {
      setPerformanceData(performanceResult.value);
    } else {
      setPerformanceData(null);
      setPerformanceError(getAnalyticsErrorMessage(performanceResult.reason));
    }
    setPerformanceLoading(false);
  }, []);

  const loadRecentUsers = useCallback(async (page: number) => {
    const requestId = ++usersRequestRef.current;

    setRecentUsersState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentUsers(page, DEFAULT_LIMIT);

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

      setRecentUsersState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      }));
    }
  }, []);

  const loadRecentPayments = useCallback(async (page: number) => {
    const requestId = ++paymentsRequestRef.current;

    setRecentPaymentsState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentPayments(page, DEFAULT_LIMIT);

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

      setRecentPaymentsState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      }));
    }
  }, []);

  const loadRecentMessages = useCallback(async (page: number) => {
    const requestId = ++messagesRequestRef.current;

    setRecentMessagesState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getRecentMessages(page, DEFAULT_LIMIT);

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

      setRecentMessagesState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      }));
    }
  }, []);

  const loadUserActivity = useCallback(async (page: number) => {
    const requestId = ++userActivityRequestRef.current;

    setUserActivityState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getUserActivity(page, DEFAULT_LIMIT);

      if (requestId !== userActivityRequestRef.current) {
        return;
      }

      setUserActivityState({
        items: response.items,
        pagination: response.pagination,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (requestId !== userActivityRequestRef.current) {
        return;
      }

      setUserActivityState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      }));
    }
  }, []);

  const loadActivityFeed = useCallback(async (page: number) => {
    const requestId = ++activityFeedRequestRef.current;

    setActivityFeedState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      const response = await getActivityFeed(page, DEFAULT_LIMIT);

      if (requestId !== activityFeedRequestRef.current) {
        return;
      }

      setActivityFeedState({
        items: response.items,
        pagination: response.pagination,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (requestId !== activityFeedRequestRef.current) {
        return;
      }

      setActivityFeedState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: getAnalyticsErrorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    loadAnalytics(days);
  }, [days, loadAnalytics]);

  useEffect(() => {
    loadRecentUsers(recentUsersPage);
  }, [recentUsersPage, loadRecentUsers]);

  useEffect(() => {
    loadRecentPayments(recentPaymentsPage);
  }, [recentPaymentsPage, loadRecentPayments]);

  useEffect(() => {
    loadRecentMessages(recentMessagesPage);
  }, [recentMessagesPage, loadRecentMessages]);

  useEffect(() => {
    loadUserActivity(userActivityPage);
  }, [userActivityPage, loadUserActivity]);

  useEffect(() => {
    loadActivityFeed(activityFeedPage);
  }, [activityFeedPage, loadActivityFeed]);

  const usersTotalPages = getTotalPages(recentUsersState.pagination);
  const paymentsTotalPages = getTotalPages(recentPaymentsState.pagination);
  const messagesTotalPages = getTotalPages(recentMessagesState.pagination);
  const userActivityTotalPages = getTotalPages(userActivityState.pagination);
  const activityFeedTotalPages = getTotalPages(activityFeedState.pagination);

  useEffect(() => {
    if (recentUsersPage > usersTotalPages) {
      setRecentUsersPage(usersTotalPages);
    }
  }, [recentUsersPage, usersTotalPages]);

  useEffect(() => {
    if (recentPaymentsPage > paymentsTotalPages) {
      setRecentPaymentsPage(paymentsTotalPages);
    }
  }, [recentPaymentsPage, paymentsTotalPages]);

  useEffect(() => {
    if (recentMessagesPage > messagesTotalPages) {
      setRecentMessagesPage(messagesTotalPages);
    }
  }, [recentMessagesPage, messagesTotalPages]);

  useEffect(() => {
    if (userActivityPage > userActivityTotalPages) {
      setUserActivityPage(userActivityTotalPages);
    }
  }, [userActivityPage, userActivityTotalPages]);

  useEffect(() => {
    if (activityFeedPage > activityFeedTotalPages) {
      setActivityFeedPage(activityFeedTotalPages);
    }
  }, [activityFeedPage, activityFeedTotalPages]);

  const usersChartRows = useMemo<ChartRow[]>(
    () =>
      usersGrowth.map((point) => ({
        label: formatChartLabel(point.date),
        value: toSafeNumber(point.users),
      })),
    [usersGrowth],
  );

  const revenueChartRows = useMemo<ChartRow[]>(
    () =>
      revenueGrowth.map((point) => ({
        label: formatChartLabel(point.date),
        value: toSafeNumber(point.revenue),
        secondaryValue:
          typeof point.payments === "number" ? toSafeNumber(point.payments) : undefined,
      })),
    [revenueGrowth],
  );

  const messagesChartRows = useMemo<ChartRow[]>(
    () =>
      messagesGrowth.map((point) => ({
        label: formatChartLabel(point.date),
        value: toSafeNumber(point.messages),
      })),
    [messagesGrowth],
  );

  const pageViewsChartRows = useMemo<ChartRow[]>(
    () =>
      pageViews.map((point) => ({
        label: formatChartLabel(point.date),
        value: toSafeNumber(point.views),
        secondaryValue:
          typeof point.unique_visitors === "number"
            ? toSafeNumber(point.unique_visitors)
            : undefined,
      })),
    [pageViews],
  );

  const sessionsChartRows = useMemo<ChartRow[]>(
    () =>
      sessions.map((point) => ({
        label: formatChartLabel(point.date),
        value: toSafeNumber(point.sessions),
      })),
    [sessions],
  );

  const unreadAnalytics = overview?.contact_support_analytics;
  const showUnreadWidget = unreadAnalytics?.unread_messages_supported !== false;
  const unreadMessages = toSafeNumber(
    unreadAnalytics?.unread_messages ?? unreadAnalytics?.unread_messages_count,
  );

  const stats = [
    { label: "Total Users", value: toSafeNumber(overview?.total_users) },
    { label: "New Users Today", value: toSafeNumber(overview?.new_users_today) },
    { label: "New Users 7D", value: toSafeNumber(overview?.new_users_7d) },
    { label: "Active Users", value: toSafeNumber(overview?.active_users) },
    { label: "Total Payments", value: toSafeNumber(overview?.total_payments) },
    { label: "Paid Users", value: toSafeNumber(overview?.paid_users) },
    {
      label: "Total Revenue",
      value: toSafeNumber(overview?.total_revenue),
      isCurrency: true,
    },
    {
      label: "Revenue 7D",
      value: toSafeNumber(overview?.revenue_7d),
      isCurrency: true,
    },
    {
      label: "Revenue 30D",
      value: toSafeNumber(overview?.revenue_30d),
      isCurrency: true,
    },
    { label: "Total Messages", value: toSafeNumber(overview?.total_messages) },
    { label: "Messages Today", value: toSafeNumber(overview?.messages_today) },
    { label: "Messages 7D", value: toSafeNumber(overview?.messages_7d) },
  ];

  const latestSessionAvgDuration =
    sessions.length > 0 ? sessions[sessions.length - 1]?.avg_duration : undefined;

  const performanceMetrics = [
    {
      label: "Avg Response Time (ms)",
      value: toSafeNumber(
        performanceData?.avg_response_time_ms ?? performanceData?.avg_response_time,
      ),
    },
    { label: "Error Rate (%)", value: toSafeNumber(performanceData?.error_rate) },
    {
      label: "Requests / Minute",
      value: toSafeNumber(performanceData?.requests_per_minute),
    },
    {
      label: "Total Requests",
      value: toSafeNumber(performanceData?.total_requests),
    },
  ];

  return (
    <div className="space-y-6">
      <Card shadow="sm">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="text-default-600">
              {admin?.name ?? admin?.email ?? "Administrator"}
            </p>
            <p className="text-sm text-default-500">
              Overview and growth analytics for the selected range.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Range</span>
            {DAY_OPTIONS.map((option) => (
              <Button
                key={option}
                color={days === option ? "primary" : "default"}
                size="sm"
                variant={days === option ? "solid" : "flat"}
                onPress={() => setDays(option)}
              >
                {option}D
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {overviewError && <p className="text-danger text-sm">{overviewError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            isCurrency={Boolean(stat.isCurrency)}
            isLoading={overviewLoading}
            label={stat.label}
            value={stat.value}
          />
        ))}

        {showUnreadWidget && (
          <StatCard
            isLoading={overviewLoading}
            label="Unread Messages"
            value={unreadMessages}
          />
        )}

        <StatCard
          isLoading={liveUsersLoading}
          label="Live Users"
          value={toSafeNumber(liveUsersData?.live_users)}
        />
      </div>

      {liveUsersError && <p className="text-danger text-sm">{liveUsersError}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Users Growth</h3>
              <Chip size="sm" variant="flat">
                Last {days} days
              </Chip>
            </div>
            {usersGrowthError && <p className="text-danger text-sm">{usersGrowthError}</p>}
            {usersGrowthLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading users growth..." />
              </div>
            ) : (
              <GrowthChart data={usersChartRows} />
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Revenue Growth</h3>
              <Chip size="sm" variant="flat">
                Last {days} days
              </Chip>
            </div>
            {revenueGrowthError && <p className="text-danger text-sm">{revenueGrowthError}</p>}
            {revenueGrowthLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading revenue growth..." />
              </div>
            ) : (
              <>
                <GrowthChart
                  data={revenueChartRows}
                  isCurrency
                  secondaryScale="independent"
                />
                {revenueChartRows.some((item) => typeof item.secondaryValue === "number") && (
                  <p className="text-xs text-default-500">
                    Blue line: revenue, yellow line: payments (scaled independently).
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Messages Growth</h3>
              <Chip size="sm" variant="flat">
                Last {days} days
              </Chip>
            </div>
            {messagesGrowthError && <p className="text-danger text-sm">{messagesGrowthError}</p>}
            {messagesGrowthLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading messages growth..." />
              </div>
            ) : (
              <GrowthChart data={messagesChartRows} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Page Views</h3>
              <Chip size="sm" variant="flat">
                Last {days} days
              </Chip>
            </div>
            {pageViewsError && <p className="text-danger text-sm">{pageViewsError}</p>}
            {pageViewsLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading page views..." />
              </div>
            ) : (
              <>
                <GrowthChart data={pageViewsChartRows} />
                {pageViewsChartRows.some(
                  (item) => typeof item.secondaryValue === "number",
                ) && (
                  <p className="text-xs text-default-500">
                    Blue line: page views, yellow line: unique visitors.
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Sessions</h3>
              <Chip size="sm" variant="flat">
                Last {days} days
              </Chip>
            </div>
            {sessionsError && <p className="text-danger text-sm">{sessionsError}</p>}
            {sessionsLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading sessions..." />
              </div>
            ) : (
              <>
                <GrowthChart data={sessionsChartRows} />
                <p className="text-xs text-default-500">
                  Latest average session duration: {formatDuration(latestSessionAvgDuration)}
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Top Pages</h3>
            </div>
            {topPagesError && <p className="text-danger text-sm">{topPagesError}</p>}
            <Table aria-label="Top pages table" removeWrapper>
              <TableHeader>
                <TableColumn>Page</TableColumn>
                <TableColumn>Views</TableColumn>
                <TableColumn>Unique</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={topPagesLoading}
                items={topPages}
                loadingContent={<Spinner label="Loading top pages..." />}
                emptyContent="No data available"
              >
                {(item: TopPage) => (
                  <TableRow key={item.page}>
                    <TableCell>{item.page}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.views))}</TableCell>
                    <TableCell>
                      {numberFormatter.format(toSafeNumber(item.unique_visitors))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Devices</h3>
            </div>
            {devicesError && <p className="text-danger text-sm">{devicesError}</p>}
            <Table aria-label="Device breakdown table" removeWrapper>
              <TableHeader>
                <TableColumn>Device</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Logged In</TableColumn>
                <TableColumn>Guest</TableColumn>
                <TableColumn>Sessions</TableColumn>
                <TableColumn>Sessions/User</TableColumn>
                <TableColumn>Share</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={devicesLoading}
                items={devices}
                loadingContent={<Spinner label="Loading devices..." />}
                emptyContent="No data available"
              >
                {(item: DeviceBreakdownItem) => (
                  <TableRow key={item.device}>
                    <TableCell>{item.device}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.users))}</TableCell>
                    <TableCell>
                      {numberFormatter.format(toSafeNumber(item.logged_in_users))}
                    </TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.guest_users))}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.sessions))}</TableCell>
                    <TableCell>
                      {typeof item.sessions_per_user === "number"
                        ? toSafeNumber(item.sessions_per_user).toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {typeof item.percentage === "number"
                        ? `${toSafeNumber(item.percentage).toFixed(2)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Feature Usage</h3>
            </div>
            {featureUsageError && <p className="text-danger text-sm">{featureUsageError}</p>}
            <Table aria-label="Feature usage table" removeWrapper>
              <TableHeader>
                <TableColumn>Feature</TableColumn>
                <TableColumn>Usage</TableColumn>
                <TableColumn>Share</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={featureUsageLoading}
                items={featureUsage}
                loadingContent={<Spinner label="Loading feature usage..." />}
                emptyContent="No data available"
              >
                {(item: FeatureUsageItem) => (
                  <TableRow key={item.feature}>
                    <TableCell>{item.feature}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.usage))}</TableCell>
                    <TableCell>
                      {typeof item.percentage === "number"
                        ? `${toSafeNumber(item.percentage).toFixed(2)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <h3 className="text-base font-semibold">Locations</h3>
            {locationsError && <p className="text-danger text-sm">{locationsError}</p>}
            <Table aria-label="Locations table" removeWrapper>
              <TableHeader>
                <TableColumn>Location</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Share</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={locationsLoading}
                items={locations}
                loadingContent={<Spinner label="Loading locations..." />}
                emptyContent="No data available"
              >
                {(item: LocationBreakdownItem) => (
                  <TableRow key={item.location}>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.users))}</TableCell>
                    <TableCell>
                      {typeof item.percentage === "number"
                        ? `${toSafeNumber(item.percentage).toFixed(2)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <h3 className="text-base font-semibold">Traffic Sources</h3>
            {trafficSourcesError && (
              <p className="text-danger text-sm">{trafficSourcesError}</p>
            )}
            <Table aria-label="Traffic sources table" removeWrapper>
              <TableHeader>
                <TableColumn>Source</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Visits</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={trafficSourcesLoading}
                items={trafficSources}
                loadingContent={<Spinner label="Loading traffic sources..." />}
                emptyContent="No data available"
              >
                {(item: TrafficSourceItem) => (
                  <TableRow key={item.source}>
                    <TableCell>{item.source}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.users))}</TableCell>
                    <TableCell>{numberFormatter.format(toSafeNumber(item.visits))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <h3 className="text-base font-semibold">Performance</h3>
            {performanceError && <p className="text-danger text-sm">{performanceError}</p>}
            {performanceLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Spinner label="Loading performance..." />
              </div>
            ) : (
              <div className="space-y-2">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-sm">
                    <span className="text-default-600">{metric.label}</span>
                    <span className="font-medium text-foreground">
                      {numberFormatter.format(toSafeNumber(metric.value))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">User Activity</h3>
              <p className="text-xs text-default-500">
                Total: {numberFormatter.format(userActivityState.pagination.total)}
              </p>
            </div>

            {userActivityState.error && (
              <p className="text-danger text-sm">{userActivityState.error}</p>
            )}

            <Table aria-label="User activity table" removeWrapper>
              <TableHeader>
                <TableColumn>User</TableColumn>
                <TableColumn>Action</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={userActivityState.isLoading}
                items={userActivityState.items}
                loadingContent={<Spinner label="Loading user activity..." />}
                emptyContent="No data available"
              >
                {(activity: UserActivityItem) => {
                  const row = activity as unknown as Record<string, unknown>;
                  const name = getValueByKeys(row, ["name", "user_name", "userName"]) ?? "-";
                  const action =
                    getValueByKeys(row, ["action", "activity", "event", "title"]) ?? "-";
                  const createdAt = getValueByKeys(row, ["created_at", "createdAt"]);
                  const key = getValueByKeys(row, ["id", "activity_id", "activityId"]);

                  return (
                    <TableRow key={String(key ?? `${name}-${action}`)}>
                      <TableCell>{String(name)}</TableCell>
                      <TableCell>{String(action)}</TableCell>
                      <TableCell>
                        {formatDateTime(typeof createdAt === "string" ? createdAt : undefined)}
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-default-500">
                Page {userActivityPage} of {userActivityTotalPages} | Limit{" "}
                {userActivityState.pagination.limit}
              </p>
              <Pagination
                color="primary"
                isDisabled={userActivityState.isLoading}
                page={userActivityPage}
                showControls
                total={userActivityTotalPages}
                onChange={setUserActivityPage}
              />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Activity Feed</h3>
              <p className="text-xs text-default-500">
                Total: {numberFormatter.format(activityFeedState.pagination.total)}
              </p>
            </div>

            {activityFeedState.error && (
              <p className="text-danger text-sm">{activityFeedState.error}</p>
            )}

            <Table aria-label="Activity feed table" removeWrapper>
              <TableHeader>
                <TableColumn>Type</TableColumn>
                <TableColumn>Message</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={activityFeedState.isLoading}
                items={activityFeedState.items}
                loadingContent={<Spinner label="Loading activity feed..." />}
                emptyContent="No data available"
              >
                {(feed: ActivityFeedItem) => {
                  const row = feed as unknown as Record<string, unknown>;
                  const type =
                    getValueByKeys(row, [
                      "type",
                      "event_type",
                      "eventType",
                      "category",
                      "event",
                    ]) ?? "-";
                  const message =
                    getValueByKeys(row, [
                      "message",
                      "title",
                      "description",
                      "action",
                      "endpoint",
                      "page",
                      "source",
                    ]) ?? "-";
                  const createdAt = getValueByKeys(row, ["created_at", "createdAt"]);
                  const key = getValueByKeys(row, [
                    "id",
                    "analytics_event_id",
                    "analyticsEventId",
                    "activity_id",
                    "activityId",
                  ]);

                  return (
                    <TableRow key={String(key ?? `${type}-${message}`)}>
                      <TableCell>{String(type)}</TableCell>
                      <TableCell>{String(message)}</TableCell>
                      <TableCell>
                        {formatDateTime(typeof createdAt === "string" ? createdAt : undefined)}
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-default-500">
                Page {activityFeedPage} of {activityFeedTotalPages} | Limit{" "}
                {activityFeedState.pagination.limit}
              </p>
              <Pagination
                color="primary"
                isDisabled={activityFeedState.isLoading}
                page={activityFeedPage}
                showControls
                total={activityFeedTotalPages}
                onChange={setActivityFeedPage}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Users</h3>
              <p className="text-xs text-default-500">
                Total: {numberFormatter.format(recentUsersState.pagination.total)}
              </p>
            </div>

            {recentUsersState.error && (
              <p className="text-danger text-sm">{recentUsersState.error}</p>
            )}

            <Table aria-label="Recent users table" removeWrapper>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Email</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={recentUsersState.isLoading}
                items={recentUsersState.items}
                loadingContent={<Spinner label="Loading recent users..." />}
                emptyContent="No data available"
              >
                {(user: RecentUser) => {
                  const row = user as unknown as Record<string, unknown>;
                  const userId =
                    getValueByKeys(row, ["user_id", "userId", "id", "_id"]) ?? "-";
                  const name = getValueByKeys(row, ["name", "full_name", "fullName"]) ?? "-";
                  const email = getValueByKeys(row, ["email"]) ?? "-";
                  const createdAt = getValueByKeys(row, ["created_at", "createdAt"]);

                  return (
                    <TableRow key={String(userId ?? email ?? name)}>
                      <TableCell>{String(userId)}</TableCell>
                      <TableCell>{String(name)}</TableCell>
                      <TableCell>{String(email)}</TableCell>
                      <TableCell>{formatDateTime(typeof createdAt === "string" ? createdAt : undefined)}</TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-default-500">
                Page {recentUsersPage} of {usersTotalPages} | Limit{" "}
                {recentUsersState.pagination.limit}
              </p>
              <Pagination
                color="primary"
                isDisabled={recentUsersState.isLoading}
                page={recentUsersPage}
                showControls
                total={usersTotalPages}
                onChange={setRecentUsersPage}
              />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Payments</h3>
              <p className="text-xs text-default-500">
                Total: {numberFormatter.format(recentPaymentsState.pagination.total)}
              </p>
            </div>

            {recentPaymentsState.error && (
              <p className="text-danger text-sm">{recentPaymentsState.error}</p>
            )}

            <Table aria-label="Recent payments table" removeWrapper>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={recentPaymentsState.isLoading}
                items={recentPaymentsState.items}
                loadingContent={<Spinner label="Loading recent payments..." />}
                emptyContent="No data available"
              >
                {(payment: RecentPayment) => {
                  const row = payment as unknown as Record<string, unknown>;
                  const paymentId =
                    getValueByKeys(row, ["payment_id", "paymentId", "id"]) ?? "-";
                  const name = getValueByKeys(row, ["name", "user_name", "userName"]) ?? "-";
                  const amount = toSafeNumber(
                    getValueByKeys(row, ["amount", "total_amount", "totalAmount"]),
                  );
                  const statusRaw = getValueByKeys(row, ["status", "payment_status", "paymentStatus"]);
                  const status =
                    typeof statusRaw === "string" ? statusRaw.toLowerCase() : "unknown";

                  return (
                    <TableRow key={String(paymentId)}>
                      <TableCell>{String(paymentId)}</TableCell>
                      <TableCell>{String(name)}</TableCell>
                      <TableCell>{currencyFormatter.format(amount)}</TableCell>
                      <TableCell>
                        <Chip
                          color={
                            status === "paid"
                              ? "success"
                              : status === "pending"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                          variant="flat"
                        >
                          {status}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-default-500">
                Page {recentPaymentsPage} of {paymentsTotalPages} | Limit{" "}
                {recentPaymentsState.pagination.limit}
              </p>
              <Pagination
                color="primary"
                isDisabled={recentPaymentsState.isLoading}
                page={recentPaymentsPage}
                showControls
                total={paymentsTotalPages}
                onChange={setRecentPaymentsPage}
              />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Messages</h3>
              <p className="text-xs text-default-500">
                Total: {numberFormatter.format(recentMessagesState.pagination.total)}
              </p>
            </div>

            {recentMessagesState.error && (
              <p className="text-danger text-sm">{recentMessagesState.error}</p>
            )}

            <Table aria-label="Recent messages table" removeWrapper>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Subject</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={recentMessagesState.isLoading}
                items={recentMessagesState.items}
                loadingContent={<Spinner label="Loading recent messages..." />}
                emptyContent="No data available"
              >
                {(message: RecentMessage) => {
                  const row = message as unknown as Record<string, unknown>;
                  const messageId =
                    getValueByKeys(row, [
                      "contact_message_id",
                      "contactMessageId",
                      "message_id",
                      "messageId",
                      "id",
                    ]) ?? "-";
                  const name = getValueByKeys(row, ["name", "full_name", "fullName"]) ?? "-";
                  const subject = getValueByKeys(row, ["subject", "title"]) ?? "-";
                  const createdAt = getValueByKeys(row, ["created_at", "createdAt"]);

                  return (
                    <TableRow key={String(messageId)}>
                      <TableCell>{String(messageId)}</TableCell>
                      <TableCell>{String(name)}</TableCell>
                      <TableCell>{String(subject)}</TableCell>
                      <TableCell>{formatDateTime(typeof createdAt === "string" ? createdAt : undefined)}</TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-default-500">
                Page {recentMessagesPage} of {messagesTotalPages} | Limit{" "}
                {recentMessagesState.pagination.limit}
              </p>
              <Pagination
                color="primary"
                isDisabled={recentMessagesState.isLoading}
                page={recentMessagesPage}
                showControls
                total={messagesTotalPages}
                onChange={setRecentMessagesPage}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default DashboardHome;
