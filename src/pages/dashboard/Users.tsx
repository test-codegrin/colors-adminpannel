import type {
  UpdateUserPayload,
  User,
  UserPaymentStatusFilter,
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
import UsersFilters from "@/components/users/UsersFilters";
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
  startDate: "",
  endDate: "",
};

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
  startDate: string,
  endDate: string,
): string {
  return [search, paymentStatus, startDate, endDate].join("|");
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
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] =
    useState<UsersFiltersFormValues>(INITIAL_USERS_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);
  const previousFiltersKeyRef = useRef(
    getUserFiltersKey(
      INITIAL_USERS_FILTERS.search,
      INITIAL_USERS_FILTERS.paymentStatus,
      INITIAL_USERS_FILTERS.startDate,
      INITIAL_USERS_FILTERS.endDate,
    ),
  );
  const previousUsersResetAtRef = useRef<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange,
    onClose: closeDeleteModal,
  } = useDisclosure();

  const debouncedSearch = useDebounce(filters.search.trim(), 400);
  const paidFilterValue = getPaidFilterValue(filters.paymentStatus);
  const startDateFilter = filters.startDate || undefined;
  const endDateFilter = filters.endDate || undefined;
  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.paymentStatus !== "all" ||
      filters.startDate ||
      filters.endDate,
  );
  const activeFilterCount = [
    filters.search.trim(),
    filters.paymentStatus !== "all" ? filters.paymentStatus : "",
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
        const result = await getUsers({
          page,
          limit,
          search: debouncedSearch || undefined,
          is_paid: paidFilterValue,
          start_date: startDateFilter,
          end_date: endDateFilter,
          signal: controller.signal,
        });

        if (!isActive) {
          return;
        }

        const nextTotalPages = Math.max(result.totalPages, 1);

        setTotalUsers(result.total);
        setTotalPages(nextTotalPages);

        if (page > nextTotalPages) {
          setPage(nextTotalPages);

          return;
        }

        setUsers(result.users);
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
    filters.startDate,
    hasInvalidDateRange,
    limit,
    page,
    paidFilterValue,
    reloadToken,
    startDateFilter,
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

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Users</h2>
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
              onSearchChange={(value) => handleFilterChange("search", value)}
              onStartDateChange={(value) =>
                handleFilterChange("startDate", value)
              }
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="min-h-[300px]">
            <Table
              aria-label="Users table"
              classNames={{
                base: "min-h-[320px]",
                wrapper:
                  "overflow-x-auto border border-default-200 shadow-none p-0",
                table: "min-w-[980px]",
                th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
                td: "py-4 align-middle",
                emptyWrapper: "py-14 text-default-500",
              }}
            >
              <TableHeader>
                <TableColumn className="min-w-[240px]">User</TableColumn>
                <TableColumn className="min-w-[260px]">Email</TableColumn>
                <TableColumn className="min-w-[180px]">
                  Mobile Number
                </TableColumn>
                <TableColumn className="min-w-[120px]">Paid</TableColumn>
                <TableColumn className="min-w-[200px]">Created</TableColumn>
                <TableColumn className="min-w-[120px]">Action</TableColumn>
              </TableHeader>

              <TableBody
                emptyContent={
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
                }
                isLoading={isLoading}
                items={users}
                loadingContent={<Spinner label="Loading users..." />}
              >
                {(user: User) => {
                  const userId = getUserId(user);

                  return (
                    <TableRow key={String(userId ?? user.email ?? user.name)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            className="bg-primary text-white font-semibold"
                            name={getInitials(user.name)}
                            radius="full"
                            size="sm"
                            src={user.picture ?? ""}
                          />
                          <span>{user.name}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="block max-w-[260px] truncate text-foreground">
                          {user.email ?? "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="block min-w-[150px] whitespace-nowrap font-medium tracking-[0.02em] text-foreground">
                          {user.mobile ?? "-"}
                        </span>
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
                        <span className="whitespace-nowrap text-default-700">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            isIconOnly
                            isDisabled={!userId}
                            size="sm"
                            startContent={
                              <Icon height={16} icon="mdi:eye" width={16} />
                            }
                            variant="flat"
                            onPress={() => {
                              if (userId) {
                                handleViewUser(userId);
                              }
                            }}
                          />

                          <Button
                            isIconOnly
                            color="danger"
                            isDisabled={!userId || deletingUserId !== null}
                            isLoading={deletingUserId === userId}
                            size="sm"
                            startContent={
                              deletingUserId !== userId ? (
                                <Icon
                                  height={16}
                                  icon="mdi:delete-outline"
                                  width={16}
                                />
                              ) : undefined
                            }
                            variant="flat"
                            onPress={() => {
                              if (userId) {
                                handleOpenDeleteModal(userId, user.name);
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>
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

      <Modal
        backdrop="blur"
        hideCloseButton={deletingUserId !== null}
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

