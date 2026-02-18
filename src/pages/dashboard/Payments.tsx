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
  Button,
  Tooltip,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useAsyncList } from "@react-stately/data";
import {
  getAllPayments,
  getPaymentsErrorMessage,
  getPaymentReceipt,
} from "@/api/payments.api";
import type { Payment } from "@/types/payment.types";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

/* ---------- Receipt Icon ---------- */

function ReceiptIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  );
}

/* ---------- Component ---------- */

export default function PaymentsTable() {
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loadingReceipt, setLoadingReceipt] = useState<number | null>(null);
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

  /* ---------- Stripe Receipt Handler ---------- */

  const openStripeReceipt = async (payment: Payment) => {
    if (payment.receipt_url) {
      window.open(payment.receipt_url, "_blank");
      return;
    }

    setLoadingReceipt(payment.payment_id);
    try {
      const { receipt_url } = await getPaymentReceipt(payment.payment_id);
      
      if (receipt_url) {
        window.open(receipt_url, "_blank");
      } else {
        alert("Receipt not available for this payment");
      }
    } catch (err) {
      console.error("Failed to get receipt:", err);
      alert("Unable to retrieve receipt. Please try again.");
    } finally {
      setLoadingReceipt(null);
    }
  };

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
              <TableColumn>Receipt</TableColumn>
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

                  <TableCell>{formatDate(payment.created_at)}</TableCell>

                  {/* ── Receipt Button ── */}
                  <TableCell>
                    <Tooltip 
                      content={
                        payment.status === "paid" 
                          ? "View Stripe Receipt" 
                          : "Receipt only available for paid transactions"
                      } 
                      placement="left"
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="primary"
                        aria-label="View receipt"
                        onPress={() => openStripeReceipt(payment)}
                        isDisabled={payment.status !== "paid"}
                        isLoading={loadingReceipt === payment.payment_id}
                      >
                        {loadingReceipt !== payment.payment_id && <ReceiptIcon />}
                      </Button>
                    </Tooltip>
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