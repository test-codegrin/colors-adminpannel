import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useState } from "react";
import UserDetailsModal from "@/components/UserDetailsModal";
import { getUsers, getUsersErrorMessage, getUserById } from "@/api/users.api";
import type { User } from "@/types/user.types";
import { Icon } from "@iconify/react";
import Loader from "@/components/Loader";

/* ---------------- Utility ---------------- */

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
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ✅ Proper Paid Checker (FIXED) */
function isUserPaid(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

/* ---------------- Component ---------------- */

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNext, setHasNext] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const limit = 10;

  /* ---------------- Fetch Users ---------------- */

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getUsers(page, limit);
        if (!isMounted) return;

        setUsers(result.users);
        setHasNext(result.users.length === limit);
      } catch (err) {
        if (!isMounted) return;
        setError(getUsersErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [page]);

  /* ---------------- View User ---------------- */

  const handleViewUser = async (userId: number) => {
    setIsUserLoading(true);
    setSelectedUser(null);
    onOpen();

    try {
      const user = await getUserById(userId);
      setSelectedUser(user);
    } finally {
      setIsUserLoading(false);
    }
  };

  return (
    <>
      {/* ================= Users Card ================= */}

      <Card shadow="md">
        <CardBody className="gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="text-sm text-default-500">Page {page}</p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Table Wrapper */}
          <div className="relative min-h-[300px]">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
                <Loader />
              </div>
            )}

            <Table aria-label="Users table" removeWrapper>
              <TableHeader>
                <TableColumn>User</TableColumn>
                <TableColumn>Email</TableColumn>
                <TableColumn>Mobile</TableColumn>
                <TableColumn>Paid</TableColumn>
                <TableColumn>Created</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>

              <TableBody items={users} emptyContent="No users found">
                {(user: User) => (
                  <TableRow key={String(user.user_id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.picture ?? ""}
                          name={getInitials(user.name)}
                          size="sm"
                          radius="full"
                          className="bg-primary text-white font-semibold"
                        />
                        <span>{user.name}</span>
                      </div>
                    </TableCell>

                    <TableCell>{user.email ?? "-"}</TableCell>
                    <TableCell>{user.mobile ?? "-"}</TableCell>

                    {/* ✅ Fixed Paid Column */}
                    <TableCell>
                      <Chip
                        color={isUserPaid(user.is_paid) ? "success" : "danger"}
                        size="sm"
                        variant="flat"
                      >
                        {isUserPaid(user.is_paid) ? "Yes" : "No"}
                      </Chip>
                    </TableCell>

                    <TableCell>{formatDate(user.created_at)}</TableCell>

                    <TableCell>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => handleViewUser(user.user_id as number)}
                        startContent={
                          <Icon icon="mdi:eye" width={16} height={16} />
                        }
                      ></Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end gap-2">
            <Button
              isDisabled={page === 1 || isLoading}
              variant="flat"
              onPress={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>

            <Button
              isDisabled={!hasNext || isLoading}
              color="primary"
              variant="flat"
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ================= Modal ================= */}

      {/* <Modal
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="md"
        hideCloseButton
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <h3 className="text-base font-semibold">User Details</h3>
                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  onPress={onClose}
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </Button>
              </ModalHeader>

              <ModalBody className="py-5">
                {isUserLoading ? (
                  <Progress isIndeterminate size="sm" />
                ) : selectedUser ? (
                  <div className="space-y-4">
                    {/* Avatar *
                    <div className="flex justify-center">
                      <Avatar
                        src={selectedUser.picture || undefined}
                        name={getInitials(selectedUser.name)}
                        isBordered
                        color="primary"
                        radius="full"
                        className="bg-primary w-20 h-20 text-white text-xl font-semibold"
                      />
                    </div>

                    {/* Name *
                    <Input
                      label="Full Name"
                      value={selectedUser.name}
                      variant="flat"
                      isReadOnly
                    />

                    {/* Email *
                    <Input
                      label="Email"
                      value={selectedUser.email}
                      variant="flat"
                      isReadOnly
                    />

                    {/* Mobile *
                    <Input
                      label="Mobile"
                      value={selectedUser.mobile}
                      variant="flat"
                      isReadOnly
                    />

                    {/* Google ID Status *
                    <Input
                      label="Google Account"
                      value={selectedUser.google_id ? "Linked" : "Not Linked"}
                      variant="flat"
                      isReadOnly
                      classNames={{
                        input: selectedUser.google_id
                          ? "text-success font-medium"
                          : "text-danger font-medium",
                      }}
                    />

                    {/* Payment Status *
                    <Input
                      label="Payment Status"
                      value={
                        isUserPaid(selectedUser.is_paid) ? "Paid" : "Unpaid"
                      }
                      variant="flat"
                      isReadOnly
                      classNames={{
                        input: isUserPaid(selectedUser.is_paid)
                          ? "text-success font-medium"
                          : "text-danger font-medium",
                      }}
                    />

                    {/* Created Date 
                    <Input
                      label="Created At"
                      value={formatDate(selectedUser.created_at)}
                      variant="flat"
                      isReadOnly
                    />
                  </div>
                ) : (
                  <div className="text-center text-default-400 py-6">
                    No data found
                  </div>
                )}
              </ModalBody>

              {/* <ModalFooter className="pt-3 justify-end">
                <Button color="danger" variant="flat" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter> *
            </>
          )}
        </ModalContent>
      </Modal> */}

      <UserDetailsModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        selectedUser={selectedUser}
        isUserLoading={isUserLoading}
      />
    </>
  );
}

export default Users;
