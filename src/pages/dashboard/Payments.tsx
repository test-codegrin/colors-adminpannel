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
} from "@/api/payments.api";
import type { Payment } from "@/types/payment.types";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

/* ---------- PDF Receipt Generator ---------- */

async function openPaymentPDF(payment: Payment): Promise<void> {
  // Dynamically import jsPDF to avoid SSR issues
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Background ──────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // ── Header bar ──────────────────────────────────────────────────
  doc.setFillColor(34, 197, 94); // green-500
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Payment Receipt", 40, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Official Payment Confirmation", 40, 65);

  // Receipt badge (top-right)
  doc.setFillColor(255, 255, 255, 0.2);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - 140, 20, 110, 50, 6, 6, "D");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECEIPT NO.", pageWidth - 130, 38);
  doc.setFontSize(14);
  doc.text(`#${String(payment.payment_id).padStart(6, "0")}`, pageWidth - 130, 57);

  // ── Status stamp ────────────────────────────────────────────────
  const stampY = 115;
  const stampColor =
    payment.status === "paid"
      ? [22, 163, 74]   // green-600
      : payment.status === "pending"
      ? [234, 179, 8]   // yellow-500
      : [220, 38, 38];  // red-600

  doc.setFillColor(stampColor[0], stampColor[1], stampColor[2]);
  doc.roundedRect(pageWidth - 120, stampY - 16, 90, 28, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(payment.status.toUpperCase(), pageWidth - 106, stampY + 4);

  // ── Section: Payer Details ───────────────────────────────────────
  const sectionLabelX = 40;
  const labelX = 50;
  const valueX = 220;
  let y = 130;

  // Section header
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAYER DETAILS", sectionLabelX, y);
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(sectionLabelX, y, pageWidth - 40, y);
  y += 20;

  const payerRows: [string, string][] = [
    ["Full Name", payment.name ?? "-"],
    ["Email Address", payment.email ?? "-"],
    ["Payment ID", String(payment.payment_id)],
  ];

  for (const [label, val] of payerRows) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(label, labelX, y);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(val, valueX, y);
    y += 26;
  }

  y += 16;

  // ── Section: Transaction Details ────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TRANSACTION DETAILS", sectionLabelX, y);
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(sectionLabelX, y, pageWidth - 40, y);
  y += 20;

  const txnRows: [string, string][] = [
    ["Amount Paid", `INR ${Number(payment.amount).toLocaleString("en-IN")}`],
    ["Status", payment.status],
    ["Date & Time", formatDate(payment.created_at)],
  ];

  for (const [label, val] of txnRows) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(label, labelX, y);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(val, valueX, y);
    y += 26;
  }

  // ── Amount highlight box ─────────────────────────────────────────
  y += 20;
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.setLineWidth(1);
  doc.roundedRect(40, y, pageWidth - 80, 60, 8, 8, "FD");

  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Total Amount", 65, y + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(
    `INR ${Number(payment.amount).toLocaleString("en-IN")}`,
    65,
    y + 48
  );

  if (payment.status === "paid") {
    doc.setFillColor(22, 163, 74);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.roundedRect(pageWidth - 160, y + 16, 100, 28, 6, 6, "F");
    doc.text("PAYMENT CONFIRMED", pageWidth - 155, y + 34);
  }

  // ── Footer ───────────────────────────────────────────────────────
  const footerY = pageHeight - 60;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, footerY, pageWidth - 40, footerY);

  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "This is an electronically generated receipt and does not require a signature.",
    pageWidth / 2,
    footerY + 18,
    { align: "center" }
  );
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    footerY + 34,
    { align: "center" }
  );

  // ── Open in new tab ─────────────────────────────────────────────
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl as unknown as string, "_blank");
}

/* ---------- PDF Icon ---------- */

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
      <polyline points="9 9 10 9" />
    </svg>
  );
}

/* ---------- Component ---------- */

export default function PaymentsTable() {
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loadingPdf, setLoadingPdf] = useState<number | null>(null);
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
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return paymentsList.items.slice(start, start + rowsPerPage);
  }, [page, paymentsList.items]);

  /* ---------- PDF Handler ---------- */

  const handleOpenPdf = async (payment: Payment) => {
    setLoadingPdf(payment.payment_id);
    try {
      await openPaymentPDF(payment);
    } finally {
      setLoadingPdf(null);
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

                  {/* ── PDF Button ── */}
                  <TableCell>
                    <Tooltip content="Open PDF Receipt" placement="left">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        aria-label="Open PDF receipt"
                        isLoading={loadingPdf === payment.payment_id}
                        onPress={() => handleOpenPdf(payment)}
                        className="text-danger-600"
                      >
                        {loadingPdf !== payment.payment_id && <PdfIcon />}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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