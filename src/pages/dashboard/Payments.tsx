"use client";

import {
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
import { useEffect, useMemo, useState } from "react";
import { useAsyncList } from "@react-stately/data";
import {
  getAllPayments,
  getPaymentsErrorMessage,
} from "@/api/payments.api";
import type { Payment } from "@/types/payment.types";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

/* ---------- Component ---------- */

export default function PaymentsTable() {
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const paymentsList = useAsyncList<Payment>({
    async load() {
      setError("");

      try {
        const result = await getAllPayments(1, rowsPerPage);

        return { items: result.payments ?? [] };
      } catch (err) {
        setError(getPaymentsErrorMessage(err));

        return { items: [] };
      }
    },
  });

  /* ---------- Pagination Logic ---------- */

  const totalPages = Math.ceil(paymentsList.items.length / rowsPerPage);

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 1) setPage(1);
      return;
    }

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return paymentsList.items.slice(start, end);
  }, [page, paymentsList.items]);

  return (
    <Card shadow="md">
      <CardBody className="gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payments</h2>
            <p className="text-sm text-default-500">Page {page}</p>
          </div>
        <div className="min-h-[300px]">

          {error && <p className="text-danger text-sm">{error}</p>}

          <Table aria-label="Payments table" removeWrapper>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Amount</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Created</TableColumn>
            </TableHeader>

            <TableBody
              isLoading={paymentsList.isLoading}
              items={paginatedPayments}
              loadingContent={<Spinner label="Loading payments..." />}
              emptyContent="No payments found"
            >
              {(payment: Payment) => (
                <TableRow key={String(payment.payment_id)}>
                  <TableCell>{payment.payment_id}</TableCell>
                  <TableCell>{payment.name}</TableCell>
                  <TableCell>{payment.email}</TableCell>
                  <TableCell>₹{payment.amount}</TableCell>

                  <TableCell className="flex items-center justify-center w-20">
                    <Chip
                      color={
                        payment.status === "paid"
                          ? "success"
                          : payment.status === "pending"
                          ? "warning"
                          : "danger"
                      }
                      variant="flat"
                      size="sm"
                    >
                      {payment.status}
                    </Chip>
                  </TableCell>

                  <TableCell>
                    {formatDate(payment.created_at)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ---------- Pagination Bottom Right ---------- */}

        {totalPages > 1 && (
          <div className="flex justify-end gap-10 w-full">
            <Pagination
              total={totalPages}
              page={page}
              onChange={setPage}
              isDisabled={paymentsList.isLoading}
              showControls
              color="primary"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
