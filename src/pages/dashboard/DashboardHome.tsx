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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getAnalyticsErrorMessage,
  getAnalyticsOverview,
  getMessagesGrowth,
  getRecentMessages,
  getRecentPayments,
  getRecentUsers,
  getRevenueGrowth,
  getUsersGrowth,
} from "@/api/analytics.api";
import { useAuth } from "@/context/AuthContext";
import type {
  AnalyticsOverview,
  DayRange,
  MessagesGrowthPoint,
  RecentMessage,
  RecentPayment,
  RecentUser,
  RevenueGrowthPoint,
  UsersGrowthPoint,
} from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

const DAY_OPTIONS: DayRange[] = [7, 30, 90];
const DEFAULT_LIMIT = 10;

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

function buildPath(values: number[], maxValue: number): string {
  if (!values.length) {
    return "";
  }

  const width = 100;
  const height = 100;
  const leftPadding = 6;
  const rightPadding = 4;
  const topPadding = 8;
  const bottomPadding = 10;
  const usableWidth = width - leftPadding - rightPadding;
  const usableHeight = height - topPadding - bottomPadding;
  const safeMax = Math.max(1, maxValue);

  if (values.length === 1) {
    const onlyY = topPadding + usableHeight - (values[0] / safeMax) * usableHeight;

    return `M ${leftPadding} ${onlyY} L ${width - rightPadding} ${onlyY}`;
  }

  const step = usableWidth / (values.length - 1);

  return values
    .map((value, index) => {
      const x = leftPadding + step * index;
      const y = topPadding + usableHeight - (value / safeMax) * usableHeight;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function GrowthChart({
  data,
  isCurrency = false,
}: {
  data: ChartRow[];
  isCurrency?: boolean;
}) {
  if (!data.length) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-default-500">
        No data available
      </div>
    );
  }

  const primaryValues = data.map((point) => point.value);
  const hasSecondary = data.some((point) => typeof point.secondaryValue === "number");
  const secondaryValues = hasSecondary
    ? data.map((point) => point.secondaryValue ?? 0)
    : [];
  const maxValue = Math.max(1, ...primaryValues, ...secondaryValues);
  const primaryPath = buildPath(primaryValues, maxValue);
  const secondaryPath = hasSecondary ? buildPath(secondaryValues, maxValue) : "";
  const firstLabel = data[0]?.label ?? "-";
  const lastLabel = data[data.length - 1]?.label ?? "-";
  const latestValue = data[data.length - 1]?.value ?? 0;

  return (
    <div className="w-full">
      <svg className="h-52 w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line
          x1="6"
          x2="96"
          y1="90"
          y2="90"
          stroke="hsl(var(--heroui-default-300))"
          strokeWidth="0.5"
        />
        <line
          x1="6"
          x2="96"
          y1="64"
          y2="64"
          stroke="hsl(var(--heroui-default-200))"
          strokeWidth="0.4"
        />
        <line
          x1="6"
          x2="96"
          y1="38"
          y2="38"
          stroke="hsl(var(--heroui-default-200))"
          strokeWidth="0.4"
        />
        <line
          x1="6"
          x2="96"
          y1="12"
          y2="12"
          stroke="hsl(var(--heroui-default-200))"
          strokeWidth="0.4"
        />
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke="hsl(var(--heroui-warning))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <path
          d={primaryPath}
          fill="none"
          stroke="hsl(var(--heroui-primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

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

  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentPaymentsPage, setRecentPaymentsPage] = useState(1);
  const [recentMessagesPage, setRecentMessagesPage] = useState(1);

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

  const analyticsRequestRef = useRef(0);
  const usersRequestRef = useRef(0);
  const paymentsRequestRef = useRef(0);
  const messagesRequestRef = useRef(0);

  const loadAnalytics = useCallback(async (selectedDays: DayRange) => {
    const requestId = ++analyticsRequestRef.current;

    setOverviewLoading(true);
    setUsersGrowthLoading(true);
    setRevenueGrowthLoading(true);
    setMessagesGrowthLoading(true);

    setOverviewError("");
    setUsersGrowthError("");
    setRevenueGrowthError("");
    setMessagesGrowthError("");

    const [overviewResult, usersGrowthResult, revenueGrowthResult, messagesGrowthResult] =
      await Promise.allSettled([
        getAnalyticsOverview(selectedDays),
        getUsersGrowth(selectedDays),
        getRevenueGrowth(selectedDays),
        getMessagesGrowth(selectedDays),
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

  const usersTotalPages = getTotalPages(recentUsersState.pagination);
  const paymentsTotalPages = getTotalPages(recentPaymentsState.pagination);
  const messagesTotalPages = getTotalPages(recentMessagesState.pagination);

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
      </div>

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
                <GrowthChart data={revenueChartRows} isCurrency />
                {revenueChartRows.some((item) => typeof item.secondaryValue === "number") && (
                  <p className="text-xs text-default-500">
                    Blue line: revenue, yellow line: payments.
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
