import type { UpdateUserPayload, User } from "@/types/user.types";

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
import { useAsyncList } from "@react-stately/data";

import UserDetailsModal from "@/components/UserDetailsModal";
import {
  deleteUserById,
  getUserById,
  getUsers,
  getUsersErrorMessage,
  updateUserById,
} from "@/api/users.api";

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

function Users() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const hasMountedRef = useRef(false);

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

  const usersList = useAsyncList<User>({
    async load() {
      setError("");

      try {
        const result = await getUsers(page, limit);
        const nextUsers = result.users ?? [];
        const serverTotalPages =
          result.pagination?.total_pages ??
          result.pagination?.totalPages ??
          result.totalPages ??
          1;

        setTotalPages(Math.max(serverTotalPages, 1));

        return { items: nextUsers };
      } catch (err) {
        setError(getUsersErrorMessage(err));
        setTotalPages(1);

        return { items: [] };
      }
    },
  });

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;

      return;
    }

    usersList.reload();
  }, [page, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
      await usersList.reload();

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

      if (usersList.items.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        usersList.reload();
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

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="text-sm text-default-500">Page {page}</p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="min-h-[300px]">
            <Table removeWrapper aria-label="Users table">
              <TableHeader>
                <TableColumn>User</TableColumn>
                <TableColumn>Email</TableColumn>
                <TableColumn>Mobile</TableColumn>
                <TableColumn>Paid</TableColumn>
                <TableColumn>Created</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>

              <TableBody
                emptyContent="No users found"
                isLoading={usersList.isLoading}
                items={usersList.items}
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

                      <TableCell>{user.email ?? "-"}</TableCell>
                      <TableCell>{user.mobile ?? "-"}</TableCell>

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

                      <TableCell>{formatDate(user.created_at)}</TableCell>

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

          <div className="flex w-full items-end justify-between gap-4">
            <Select
              disallowEmptySelection
              className="w-28"
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
              isDisabled={usersList.isLoading}
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
