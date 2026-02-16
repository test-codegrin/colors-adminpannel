"use client";

import {
  Card,
  CardBody,
  Chip,
  Pagination,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  getAllPayments,
  getPaymentsErrorMessage,
} from "@/api/payments.api";
import type { Payment } from "@/types/payment.types";
import Loader from "@/components/Loader";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

/* ---------- Component ---------- */

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    let isMounted = true;

    const fetchPayments = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getAllPayments(page, rowsPerPage);
        if (!isMounted) return;
        setPayments(result.payments);
      } catch (err) {
        if (!isMounted) return;
        setError(getPaymentsErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ---------- Pagination Logic ---------- */

  const totalPages = Math.ceil(payments.length / rowsPerPage);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return payments.slice(start, end);
  }, [page, payments]);

  return (
    <Card shadow="md">
      <CardBody className="gap-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payments</h2>
            <p className="text-sm text-default-500">Page {page}</p>
          </div>
        <div className="relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
              <Loader />
            </div>
          )}

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
              items={paginatedPayments}
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
              showControls
              color="primary"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
