import type {
  UpdateUserPayload,
  User,
  UserPaymentStatusFilter,
  UserStatusFilter,
  UsersFiltersFormValues,
} from "@/types/user.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";

import UserDetailsModal from "@/components/UserDetailsModal";
import UserLibraryModal from "@/components/UserLibraryModal";
import UsersFilters from "@/components/users/UsersFilters";
import { getAnalyticsErrorMessage, getLiveUsers } from "@/api/analytics.api";
import {
  deleteUserById,
  getUserById,
  getUsers,
  getUsersErrorMessage,
  isUsersRequestCancelled,
  updateUserById,
} from "@/api/users.api";
import { useDebounce } from "@/hooks/useDebounce";

const INITIAL_USERS_FILTERS: UsersFiltersFormValues = {
  search: "",
  paymentStatus: "all",
  status: "all",
  startDate: "",
  endDate: "",
};
const ONLINE_USERS_POLL_INTERVAL_MS = 30_000;

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getInitials(name?: string): string {
  if (!name) return "U";

  return name
    .trim()
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isUserPaid(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function getUserId(user: User): number | null {
  const source = user as User & {
    user_id?: unknown;
    id?: unknown;
    _id?: unknown;
  };
  const candidate = source.user_id ?? source.id ?? source._id;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string") {
    const parsed = Number(candidate);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getUserFiltersKey(
  search: string,
  paymentStatus: UserPaymentStatusFilter,
  status: UserStatusFilter,
  startDate: string,
  endDate: string,
): string {
  return [search, paymentStatus, status, startDate, endDate].join("|");
}

function getPaidFilterValue(
  paymentStatus: UserPaymentStatusFilter,
): 0 | 1 | undefined {
  if (paymentStatus === "paid") {
    return 1;
  }

  if (paymentStatus === "unpaid") {
    return 0;
  }

  return undefined;
}

function Users() {
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [liveUsersError, setLiveUsersError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<UsersFiltersFormValues>(
    INITIAL_USERS_FILTERS,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const previousFiltersKeyRef = useRef(
    getUserFiltersKey(
      INITIAL_USERS_FILTERS.search,
      INITIAL_USERS_FILTERS.paymentStatus,
      INITIAL_USERS_FILTERS.status,
      INITIAL_USERS_FILTERS.startDate,
      INITIAL_USERS_FILTERS.endDate,
    ),
  );
  const previousUsersResetAtRef = useRef<number | null>(null);
  const hasShownLiveUsersErrorRef = useRef(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [libraryUserId, setLibraryUserId] = useState<number | null>(null);
  const [libraryUser, setLibraryUser] = useState<User | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange,
    onClose: closeDeleteModal,
  } = useDisclosure();
  const {
    isOpen: isLibraryOpen,
    onOpen: openLibrary,
    onOpenChange: onLibraryOpenChange,
  } = useDisclosure();

  const debouncedSearch = useDebounce(filters.search.trim(), 400);
  const paidFilterValue = getPaidFilterValue(filters.paymentStatus);
  const startDateFilter = filters.startDate || undefined;
  const endDateFilter = filters.endDate || undefined;
  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.paymentStatus !== "all" ||
      filters.status !== "all" ||
      filters.startDate ||
      filters.endDate,
  );
  const activeFilterCount = [
    filters.search.trim(),
    filters.paymentStatus !== "all" ? filters.paymentStatus : "",
    filters.status !== "all" ? filters.status : "",
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;
  const hasInvalidDateRange = Boolean(
    startDateFilter && endDateFilter && startDateFilter > endDateFilter,
  );

  useEffect(() => {
    const nextUsersResetAt =
      typeof location.state === "object" &&
      location.state !== null &&
      "usersResetAt" in location.state &&
      typeof (location.state as { usersResetAt?: unknown }).usersResetAt ===
        "number"
        ? (location.state as { usersResetAt: number }).usersResetAt
        : null;

    if (
      nextUsersResetAt === null ||
      previousUsersResetAtRef.current === nextUsersResetAt
    ) {
      return;
    }

    previousUsersResetAtRef.current = nextUsersResetAt;
    previousFiltersKeyRef.current = getUserFiltersKey(
      INITIAL_USERS_FILTERS.search,
      INITIAL_USERS_FILTERS.paymentStatus,
      INITIAL_USERS_FILTERS.status,
      INITIAL_USERS_FILTERS.startDate,
      INITIAL_USERS_FILTERS.endDate,
    );
    setFilters(INITIAL_USERS_FILTERS);
    setPage(1);
  }, [location.state]);

  useEffect(() => {
    const currentFiltersKey = getUserFiltersKey(
      debouncedSearch,
      filters.paymentStatus,
      filters.status,
      filters.startDate,
      filters.endDate,
    );

    if (previousFiltersKeyRef.current !== currentFiltersKey) {
      previousFiltersKeyRef.current = currentFiltersKey;

      if (page !== 1) {
        setPage(1);

        return;
      }
    }

    if (hasInvalidDateRange) {
      setIsLoading(false);
      setError("Start date cannot be after end date.");
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);

      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setError("");

      try {
        if (filters.status === "online") {
          // Fetch all users across pages to find online ones
          const onlineIds = Array.from(onlineUserIds);
          if (onlineIds.length === 0) {
            setUsers([]);
            setTotalUsers(0);
            setTotalPages(1);
            return;
          }
          // Fetch enough pages to cover all users (max limit=100 per backend)
          const firstResult = await getUsers({
            page: 1,
            limit: 100,
            search: debouncedSearch || undefined,
            is_paid: paidFilterValue,
            start_date: startDateFilter,
            end_date: endDateFilter,
            signal: controller.signal,
          });
          if (!isActive) return;
          const totalPagesToFetch = Math.min(firstResult.totalPages, 10);
          const allFetched = [...firstResult.users];
          for (let p = 2; p <= totalPagesToFetch; p++) {
            // eslint-disable-next-line no-await-in-loop
            const r = await getUsers({
              page: p,
              limit: 100,
              search: debouncedSearch || undefined,
              is_paid: paidFilterValue,
              start_date: startDateFilter,
              end_date: endDateFilter,
              signal: controller.signal,
            });
            if (!isActive) return;
            allFetched.push(...r.users);
          }
          const onlineUsers = allFetched.filter((u) => {
            const uid = getUserId(u);
            return uid !== null && onlineUserIds.has(uid);
          });
          setUsers(onlineUsers);
          setTotalUsers(onlineUsers.length);
          setTotalPages(1);
          return;
        }

        const result = await getUsers({
          page,
          limit,
          search: debouncedSearch || undefined,
          is_paid: paidFilterValue,
          start_date: startDateFilter,
          end_date: endDateFilter,
          signal: controller.signal,
        });

        if (!isActive) return;

        const nextTotalPages = Math.max(result.totalPages, 1);
        setTotalUsers(result.total);
        setTotalPages(nextTotalPages);

        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }

        if (filters.status === "offline") {
          setUsers(
            result.users.filter((u) => {
              const uid = getUserId(u);
              return uid === null || !onlineUserIds.has(uid);
            }),
          );
        } else {
          setUsers(result.users);
        }
      } catch (err) {
        if (!isActive || isUsersRequestCancelled(err)) {
          return;
        }

        const message = getUsersErrorMessage(err);

        setError(message);
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
        addToast({
          title: "Load Failed",
          description: message,
          color: "danger",
          radius: "full",
          timeout: 3000,
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    debouncedSearch,
    endDateFilter,
    filters.endDate,
    filters.paymentStatus,
    filters.status,
    filters.startDate,
    hasInvalidDateRange,
    limit,
    page,
    paidFilterValue,
    reloadToken,
    startDateFilter,
    onlineUserIds,
  ]);

  const reloadUsers = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  const handleFilterChange = <K extends keyof UsersFiltersFormValues>(
    key: K,
    value: UsersFiltersFormValues[K],
  ) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_USERS_FILTERS);
    setPage(1);
  };

  const handleViewUser = async (userId: number) => {
    setIsUserLoading(true);
    setIsUpdatingUser(false);
    setSelectedUser(null);
    onOpen();

    try {
      const user = await getUserById(userId);

      setSelectedUser(user);
    } finally {
      setIsUserLoading(false);
    }
  };

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!selectedUser) {
      return;
    }

    const userId = getUserId(selectedUser);

    if (!userId) {
      addToast({
        title: "Update Failed",
        description: "Could not determine user id.",
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
      throw new Error("Missing user id");
    }

    setIsUpdatingUser(true);

    try {
      const result = await updateUserById(userId, payload);

      setSelectedUser(result.user);
      reloadUsers();

      addToast({
        title: "User Updated",
        description: result.message ?? "User updated successfully.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });
    } catch (err) {
      addToast({
        title: "Update Failed",
        description: getUsersErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
      throw err;
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleOpenDeleteModal = (userId: number, name?: string) => {
    setPendingDeleteUser({
      id: userId,
      name: name?.trim() ? name : "this user",
    });
    openDeleteModal();
  };

  const handleOpenLibrary = (user: User, userId: number) => {
    setLibraryUserId(userId);
    setLibraryUser(user);
    openLibrary();
  };

  const handleDeleteUser = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    const userId = pendingDeleteUser.id;

    setDeletingUserId(userId);

    try {
      const result = await deleteUserById(userId);

      addToast({
        title: "User Deleted",
        description: result.message ?? "User deleted successfully.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });

      if (users.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        reloadUsers();
      }
    } catch (err) {
      addToast({
        title: "Delete Failed",
        description: getUsersErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setDeletingUserId(null);
      setPendingDeleteUser(null);
      closeDeleteModal();
    }
  };

  const usersCountLabel =
    totalUsers === 1 ? "1 user" : `${totalUsers.toLocaleString()} users`;
  const onlineUsersLabel =
    onlineUsersCount === 1
      ? "1 user online"
      : `${onlineUsersCount.toLocaleString()} users online`;
  const onlinePresenceChipLabel = liveUsersError
    ? "Presence unavailable"
    : onlineUsersLabel;
  const shouldShowOnlineStrip = !liveUsersError && filters.status !== "offline";
  const visibleOnlineUsers = users.filter((user) => {
    const userId = getUserId(user);

    return userId !== null && onlineUserIds.has(userId);
  });
  const hiddenOnlineUsersCount = Math.max(
    onlineUsersCount - visibleOnlineUsers.length,
    0,
  );
  const emptyUsersContent = (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasActiveFilters
          ? "No users found for the selected filters."
          : "No users found."}
      </p>
      <p className="text-sm text-default-500">
        {hasActiveFilters
          ? "Try clearing one or more filters."
          : "New users will appear here automatically."}
      </p>
    </div>
  );

  useEffect(() => {
    let isActive = true;
    let intervalId: number | undefined;

    const loadLiveUsers = async () => {
      try {
        const result = await getLiveUsers();

        if (!isActive) {
          return;
        }

        const nextUserIds = new Set(result.user_ids ?? []);

        setLiveUsersError("");
        hasShownLiveUsersErrorRef.current = false;
        setOnlineUserIds(nextUserIds);
        setOnlineUsersCount(
          typeof result.total_online_users === "number" &&
            Number.isFinite(result.total_online_users)
            ? result.total_online_users
            : nextUserIds.size,
        );
      } catch (err) {
        if (!isActive) {
          return;
        }

        const message = getAnalyticsErrorMessage(err);

        setOnlineUserIds(new Set());
        setOnlineUsersCount(0);
        setLiveUsersError(message);
        console.error("Failed to load online users", message);

        if (!hasShownLiveUsersErrorRef.current) {
          hasShownLiveUsersErrorRef.current = true;
          addToast({
            title: "Presence Status Unavailable",
            description: message,
            color: "warning",
            radius: "full",
            timeout: 3000,
          });
        }
      }
    };

    void loadLiveUsers();
    intervalId = window.setInterval(() => {
      void loadLiveUsers();
    }, ONLINE_USERS_POLL_INTERVAL_MS);

    return () => {
      isActive = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Users</h2>
                <Chip
                  color={
                    liveUsersError
                      ? "warning"
                      : onlineUsersCount > 0
                        ? "success"
                        : "default"
                  }
                  size="sm"
                  variant="flat"
                >
                  {onlinePresenceChipLabel}
                </Chip>
                <Chip
                  color={hasActiveFilters ? "primary" : "default"}
                  size="sm"
                  variant="flat"
                >
                  {hasActiveFilters
                    ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
                    : "Showing all users"}
                </Chip>
              </div>
              <p className="text-sm text-default-500">{usersCountLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-default-500">
                  Page
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {page} / {Math.max(totalPages, 1)}
                </p>
              </div>
              <div className="rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-default-500">
                  Page Size
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {limit} rows
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-default-200 bg-content1 px-4 py-4 sm:px-5 sm:py-4">
            <UsersFilters
              hasActiveFilters={hasActiveFilters}
              isLoading={isLoading}
              values={filters}
              onClear={handleClearFilters}
              onEndDateChange={(value) => handleFilterChange("endDate", value)}
              onPaymentStatusChange={(value) =>
                handleFilterChange("paymentStatus", value)
              }
              onStatusChange={(value) => handleFilterChange("status", value)}
              onSearchChange={(value) => handleFilterChange("search", value)}
              onStartDateChange={(value) =>
                handleFilterChange("startDate", value)
              }
            />
          </div>

          {shouldShowOnlineStrip ? (
            <div className="rounded-[22px] border border-success/20 bg-success/5 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    <p className="text-sm font-semibold text-foreground">
                      Online now
                    </p>
                    <Chip color="success" size="sm" variant="flat">
                      {onlineUsersLabel}
                    </Chip>
                  </div>
                  <p className="text-sm text-default-600">
                    {visibleOnlineUsers.length > 0
                      ? "Users active in the last 5 minutes."
                      : filters.status === "online"
                        ? "No online users match the current filters."
                        : onlineUsersCount > 0
                          ? "Online users exist, but they are not on the current page yet."
                          : "No users are active right now."}
                  </p>
                </div>

                {visibleOnlineUsers.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {visibleOnlineUsers.slice(0, 6).map((user) => {
                      const userId = getUserId(user);

                      return (
                        <div
                          key={String(userId ?? user.email ?? user.name)}
                          className="flex items-center gap-2 rounded-full border border-success/20 bg-content1 px-2.5 py-1.5 shadow-sm"
                        >
                          <div className="relative shrink-0">
                            <Avatar
                              className="bg-primary text-white font-semibold"
                              name={getInitials(user.name)}
                              radius="full"
                              size="sm"
                              src={user.picture ?? ""}
                            />
                            <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-content1 shadow-sm">
                              <span className="h-2.5 w-2.5 rounded-full bg-success" />
                            </span>
                          </div>
                          <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
                            {user.name ?? "User"}
                          </span>
                        </div>
                      );
                    })}

                    {hiddenOnlineUsersCount > 0 ? (
                      <Chip color="success" size="sm" variant="bordered">
                        +{hiddenOnlineUsersCount} more
                      </Chip>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="min-h-[300px]">
            <div className="grid gap-4 xl:hidden">
              {isLoading ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-default-200 bg-content1">
                  <Spinner label="Loading users..." />
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-[24px] border border-default-200 bg-content1 px-6 py-10">
                  {emptyUsersContent}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {users.map((user) => {
                    const userId = getUserId(user);
                    const isOnline =
                      userId !== null && onlineUserIds.has(userId);

                    return (
                      <Card
                        key={String(userId ?? user.email ?? user.name)}
                        className="border border-default-200 bg-content1 shadow-sm"
                        shadow="sm"
                      >
                        <CardBody className="gap-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative shrink-0">
                                <Avatar
                                  className="bg-primary text-white font-semibold"
                                  name={getInitials(user.name)}
                                  radius="full"
                                  size="md"
                                  src={user.picture ?? ""}
                                />
                                {isOnline ? (
                                  <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-content1 shadow-sm">
                                    <span className="h-3 w-3 rounded-full bg-success" />
                                  </span>
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {user.name ?? "User"}
                                </p>
                                <p className="break-all text-sm text-default-500">
                                  {user.email ?? "-"}
                                </p>
                              </div>
                            </div>

                            <Chip
                              color={isOnline ? "success" : "default"}
                              size="sm"
                              variant={isOnline ? "flat" : "bordered"}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </Chip>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-default-50 px-3 py-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-default-500">
                                Mobile
                              </p>
                              <p className="mt-1 break-words text-sm font-medium text-foreground">
                                {user.mobile ?? "-"}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-default-50 px-3 py-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-default-500">
                                Created
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-default-200 pt-3">
                            <Chip
                              color={
                                isUserPaid(user.is_paid) ? "success" : "danger"
                              }
                              size="sm"
                              variant="flat"
                            >
                              {isUserPaid(user.is_paid) ? "Paid" : "Unpaid"}
                            </Chip>

                            <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-default-200 bg-default-50 p-1">
                              <Button
                                isIconOnly
                                isDisabled={!userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) {
                                    handleViewUser(userId);
                                  }
                                }}
                              >
                                <Icon height={16} icon="mdi:eye" width={16} />
                              </Button>

                              <Button
                                isIconOnly
                                color="secondary"
                                isDisabled={!userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) handleOpenLibrary(user, userId);
                                }}
                              >
                                <Icon
                                  height={16}
                                  icon="mdi:bookshelf"
                                  width={16}
                                />
                              </Button>

                              <Button
                                isIconOnly
                                color="danger"
                                isDisabled={!userId || deletingUserId !== null}
                                isLoading={deletingUserId === userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) {
                                    handleOpenDeleteModal(userId, user.name);
                                  }
                                }}
                              >
                                {deletingUserId !== userId ? (
                                  <Icon
                                    height={16}
                                    icon="mdi:delete-outline"
                                    width={16}
                                  />
                                ) : null}
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden xl:block">
              <Table
                aria-label="Users table"
                classNames={{
                  base: "min-h-[320px]",
                  wrapper:
                    "overflow-hidden border border-default-200 shadow-none p-0",
                  table: "w-full table-auto",
                  th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
                  td: "py-4 align-middle",
                  emptyWrapper: "py-14 text-default-500",
                }}
              >
                <TableHeader>
                  <TableColumn className="w-[20%]">User</TableColumn>
                  <TableColumn className="w-[24%]">Email</TableColumn>
                  <TableColumn className="w-[15%]">Mobile Number</TableColumn>
                  <TableColumn className="w-[10%]">Status</TableColumn>
                  <TableColumn className="w-[8%]">Paid</TableColumn>
                  <TableColumn className="w-[12%]">Created</TableColumn>
                  <TableColumn className="w-[1%] whitespace-nowrap">
                    Action
                  </TableColumn>
                </TableHeader>

                <TableBody
                  emptyContent={emptyUsersContent}
                  isLoading={isLoading}
                  items={users}
                  loadingContent={<Spinner label="Loading users..." />}
                >
                  {(user: User) => {
                    const userId = getUserId(user);
                    const isOnline =
                      userId !== null && onlineUserIds.has(userId);

                    return (
                      <TableRow key={String(userId ?? user.email ?? user.name)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar
                                className="bg-primary text-white font-semibold"
                                name={getInitials(user.name)}
                                radius="full"
                                size="sm"
                                src={user.picture ?? ""}
                              />
                              {isOnline ? (
                                <>
                                  <span className="absolute inset-0 rounded-full ring-2 ring-success/20" />
                                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-content1 shadow-sm">
                                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-medium text-foreground">
                                {user.name}
                              </span>
                              {isOnline ? (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-success">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  Online
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="block break-all text-foreground">
                            {user.email ?? "-"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="block break-words font-medium tracking-[0.02em] text-foreground">
                            {user.mobile ?? "-"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Chip
                            color={isOnline ? "success" : "default"}
                            size="sm"
                            variant={isOnline ? "flat" : "bordered"}
                          >
                            {isOnline ? "Online" : "Offline"}
                          </Chip>
                        </TableCell>

                        <TableCell>
                          <Chip
                            color={
                              isUserPaid(user.is_paid) ? "success" : "danger"
                            }
                            size="sm"
                            variant="flat"
                          >
                            {isUserPaid(user.is_paid) ? "Yes" : "No"}
                          </Chip>
                        </TableCell>

                        <TableCell>
                          <span className="block text-default-700">
                            {formatDate(user.created_at)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-start">
                            <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-default-200 bg-default-50 p-1">
                              <Button
                                isIconOnly
                                isDisabled={!userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) {
                                    handleViewUser(userId);
                                  }
                                }}
                              >
                                <Icon height={16} icon="mdi:eye" width={16} />
                              </Button>

                              <Button
                                isIconOnly
                                color="secondary"
                                isDisabled={!userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) handleOpenLibrary(user, userId);
                                }}
                              >
                                <Icon
                                  height={16}
                                  icon="mdi:bookshelf"
                                  width={16}
                                />
                              </Button>

                              <Button
                                isIconOnly
                                color="danger"
                                isDisabled={!userId || deletingUserId !== null}
                                isLoading={deletingUserId === userId}
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                  if (userId) {
                                    handleOpenDeleteModal(userId, user.name);
                                  }
                                }}
                              >
                                {deletingUserId !== userId ? (
                                  <Icon
                                    height={16}
                                    icon="mdi:delete-outline"
                                    width={16}
                                  />
                                ) : null}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Select
              disallowEmptySelection
              className="w-full sm:w-28"
              label="Limit"
              selectedKeys={[String(limit)]}
              size="sm"
              onChange={(event) => {
                const nextLimit = Number(event.target.value);

                if (nextLimit !== limit) {
                  setLimit(nextLimit);
                  setPage(1);
                }
              }}
            >
              <SelectItem key="10">10</SelectItem>
              <SelectItem key="25">25</SelectItem>
              <SelectItem key="50">50</SelectItem>
            </Select>

            <Pagination
              showControls
              color="primary"
              isDisabled={isLoading}
              page={page}
              total={Math.max(totalPages, 1)}
              onChange={setPage}
            />
          </div>
        </CardBody>
      </Card>

      <UserDetailsModal
        isOpen={isOpen}
        isUpdatingUser={isUpdatingUser}
        isUserLoading={isUserLoading}
        selectedUser={selectedUser}
        onOpenChange={onOpenChange}
        onUpdateUser={handleUpdateUser}
      />

      <UserLibraryModal
        isOpen={isLibraryOpen}
        onOpenChange={onLibraryOpenChange}
        userId={libraryUserId}
        userName={libraryUser?.name}
      />

      <Modal
        isDismissable={deletingUserId === null}
        isOpen={isDeleteModalOpen}
        onOpenChange={onDeleteModalOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            Delete User
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {pendingDeleteUser?.name ?? "this user"}
              </span>
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={deletingUserId !== null}
              variant="flat"
              onPress={closeDeleteModal}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deletingUserId === pendingDeleteUser?.id}
              onPress={handleDeleteUser}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default Users;
