import {
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getUsers, getUsersErrorMessage } from "@/api/users.api";
import type { User } from "@/types/user.types";

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getUserRowKey(user: User): string {
  return (
    user.id ??
    user._id ??
    `${user.email ?? "unknown"}-${user.created_at ?? ""}-${user.mobile ?? ""}`
  );
}

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [hasNext, setHasNext] = useState<boolean>(false);
  const limit = 10;

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getUsers(page, limit);

        if (!isMounted) {
          return;
        }

        setUsers(result.users);

        if (typeof result.totalPages === "number") {
          setHasNext(page < result.totalPages);
        } else if (typeof result.total === "number") {
          setHasNext(page * limit < result.total);
        } else {
          setHasNext(result.users.length === limit);
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(getUsersErrorMessage(requestError));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const emptyContent = useMemo<ReactNode>(() => {
    if (isLoading) {
      return <Spinner size="sm" />;
    }

    if (error) {
      return error;
    }

    return "No users found";
  }, [error, isLoading]);

  return (
    <Card>
      <CardBody className="gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-default-500">Page {page}</p>
        </div>

        <Table aria-label="Users table" removeWrapper>
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Mobile</TableColumn>
            <TableColumn>is_paid</TableColumn>
            <TableColumn>created_at</TableColumn>
          </TableHeader>
          <TableBody emptyContent={emptyContent} isLoading={isLoading} items={users}>
            {(user: User) => (
              <TableRow key={getUserRowKey(user)}>
                <TableCell>{user.name ?? "-"}</TableCell>
                <TableCell>{user.email ?? "-"}</TableCell>
                <TableCell>{user.mobile ?? "-"}</TableCell>
                <TableCell>
                  <Chip color={user.is_paid ? "success" : "default"} size="sm" variant="flat">
                    {user.is_paid ? "Yes" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-end gap-2">
          <Button isDisabled={page === 1 || isLoading} variant="flat" onPress={() => setPage((prev) => prev - 1)}>
            Prev
          </Button>
          <Button isDisabled={!hasNext || isLoading} color="primary" variant="flat" onPress={() => setPage((prev) => prev + 1)}>
            Next
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default Users;
