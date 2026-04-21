"use client";

import type { Payment } from "@/types/payment.types";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
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
  Tooltip,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";

import {
  getAllPayments,
  getPaymentsErrorMessage,
  getPaymentReceipt,
} from "@/api/payments.api";

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
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  );
}

/* ---------- Component ---------- */

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingReceipt, setLoadingReceipt] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /* ---------- Load Payments ---------- */

  const loadPayments = async (params: {
    page: number;
    limit: number;
    search: string;
  }) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError("");

    try {
      const result = await getAllPayments({
        page: params.page,
        limit: params.limit,
        search: params.search,
        signal: abortControllerRef.current.signal,
      });

      const serverTotalPages =
        result.pagination?.total_pages ??
        result.pagination?.totalPages ??
        1;

      setTotalPages(Math.max(serverTotalPages, 1));
      setPayments(result.payments ?? []);
    } catch (err) {
      // Ignore cancelled requests
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "ERR_CANCELED"
      ) {
        return;
      }

      const message = getPaymentsErrorMessage(err);

      setError(message);
      setPayments([]);
      setTotalPages(1);
      addToast({
        title: "Load Failed",
        description: message,
        severity: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Initial Load ---------- */

  useEffect(() => {
    void loadPayments({ page, limit, search });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /* ---------- Re-fetch on page / limit change ---------- */

  useEffect(() => {
    void loadPayments({ page, limit, search });
  }, [page, limit]);

  /* ---------- Live search — reset to page 1 ---------- */

  useEffect(() => {
    setPage(1);
    void loadPayments({ page: 1, limit, search });
  }, [search]);

  /* ---------- Keep page in bounds ---------- */

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* ---------- Stripe Receipt Handler ---------- */

  const openStripeReceipt = async (payment: Payment) => {
    if (payment.receipt_url) {
      window.open(payment.receipt_url, "_blank");

      return;
    }

    setLoadingReceipt(payment.payment_id);
    try {
      const { receipt_url } = (await getPaymentReceipt(payment.payment_id)).data;

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
      <CardBody className="gap-6 p-4 sm:p-6">

        {/* ---------- Header ---------- */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Payments</h2>
            <p className="text-sm text-default-500">
              All transactions from `/payments/all`
            </p>
          </div>

          <div className="flex justify-start lg:justify-end">
            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width={16} />
              }
              variant="flat"
              onPress={() => loadPayments({ page, limit, search })}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ---------- Search Bar — live search ---------- */}

        <Input
          isClearable
          className="w-full sm:max-w-sm"
          placeholder="Search by name or email..."
          size="sm"
          startContent={
            <Icon
              className="text-default-400"
              icon="solar:magnifer-linear"
              width={16}
            />
          }
          value={search}
          onClear={() => setSearch("")}
          onValueChange={(value) => setSearch(value)}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {/* ---------- Table ---------- */}

        <div className="w-full overflow-x-auto scrollbar-hide">
          <Table
            aria-label="Payments table"
            className="min-w-[800px]"
            classNames={{
              base: "min-h-[360px]",
              wrapper: "overflow-hidden shadow-none p-0",
              table: "w-full table-auto",
              th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
              td: "py-4 align-middle",
              emptyWrapper: "py-14 text-default-500",
            }}
          >
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
              emptyContent={
                search
                  ? `No results found for "${search}".`
                  : "No payments found."
              }
              isLoading={isLoading}
              items={payments}
              loadingContent={<Spinner label="Loading payments..." />}
            >
              {(payment: Payment) => (
                <TableRow key={String(payment.payment_id)}>
                  <TableCell>{payment.payment_id}</TableCell>
                  <TableCell>{payment.name}</TableCell>
                  <TableCell>{payment.email}</TableCell>
                  <TableCell>₹{payment.amount}</TableCell>

                  <TableCell>
                    <Chip
                      color={
                        payment.status === "paid"
                          ? "success"
                          : payment.status === "pending"
                            ? "warning"
                            : "danger"
                      }
                      size="sm"
                      variant="flat"
                    >
                      {payment.status}
                    </Chip>
                  </TableCell>

                  <TableCell>{formatDate(payment.created_at)}</TableCell>

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
                        aria-label="View receipt"
                        color="primary"
                        isDisabled={payment.status !== "paid"}
                        isLoading={loadingReceipt === payment.payment_id}
                        size="sm"
                        variant="flat"
                        onPress={() => openStripeReceipt(payment)}
                      >
                        {loadingReceipt !== payment.payment_id && (
                          <ReceiptIcon />
                        )}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ---------- Pagination ---------- */}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex justify-start">
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
          </div>

          <div className="flex justify-start sm:justify-end w-full">
            <Pagination
              showControls
              color="primary"
              isDisabled={isLoading}
              page={page}
              total={Math.max(totalPages, 1)}
              onChange={setPage}
            />
          </div>
        </div>

      </CardBody>
    </Card>
  );
}