"use client";

import type {
  CaseStudy,
  CaseStudyPayload,
  CaseStudyStatus,
} from "@/types/caseStudies.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";

import {
  createCaseStudy,
  deleteCaseStudyById,
  getCaseStudies,
  getCaseStudiesErrorMessage,
  getCaseStudyById,
  updateCaseStudyById,
  updateCaseStudyStatus,
} from "@/api/caseStudies.api";

/* ---------- Dynamic row types ---------- */
interface ProcessRow { title: string; description: string;[key: string]: string }
interface ResultRow { title: string; value: string;[key: string]: string }
interface ComparisonRow { title: string; before: string; after: string;[key: string]: string }

/* ---------- Form state ---------- */
interface FormState {
  client: string;
  industry: string;
  title: string;
  summary: string;
  palette: string;
  paletteNames: string;
  tags: string;
  readTime: string;
  date: string;
  featured: boolean;
  sortOrder: string;
  status: "0" | "1";
  overviewParagraphs: string;
  processRows: ProcessRow[];
  resultRows: ResultRow[];
  comparisonRows: ComparisonRow[];
  projectInfoClient: string;
  projectInfoTimeline: string;
  projectInfoServices: string;
  team: string;
}

interface FormErrors {
  client: string;
  industry: string;
  title: string;
  summary: string;
  palette: string;
  readTime: string;
  date: string;
  overviewParagraphs: string;
  processRows: string;
}

const defaultForm: FormState = {
  client: "",
  industry: "",
  title: "",
  summary: "",
  palette: "",
  paletteNames: "",
  tags: "",
  readTime: "",
  date: "",
  featured: false,
  sortOrder: "",
  status: "1",
  overviewParagraphs: "",
  processRows: [{ title: "", description: "" }],
  resultRows: [{ title: "", value: "" }],
  comparisonRows: [{ title: "", before: "", after: "" }],
  projectInfoClient: "",
  projectInfoTimeline: "",
  projectInfoServices: "",
  team: "",
};

const defaultErrors: FormErrors = {
  client: "",
  industry: "",
  title: "",
  summary: "",
  palette: "",
  readTime: "",
  date: "",
  overviewParagraphs: "",
  processRows: "",
};

/* ---------- Utilities ---------- */
function getInitials(name?: string, fallback = "CS"): string {
  if (!name) return fallback;
  return (
    name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() ||
    fallback
  );
}

function isValidHex(v: string): boolean {
  return /^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/i.test(v);
}

function parseDelimited(v: string): string[] {
  return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

function parseLines(v: string): string[] {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

function formatDateTime(v?: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function getStatusLabel(s: CaseStudyStatus) {
  return s === 1 ? "Published" : "Draft";
}
function getStatusColor(s: CaseStudyStatus): "success" | "warning" {
  return s === 1 ? "success" : "warning";
}

function caseStudyToForm(cs: CaseStudy): FormState {
  const processRows: ProcessRow[] =
    cs.process.steps.length > 0
      ? cs.process.steps.map((s) => ({ title: s.title, description: s.description }))
      : [{ title: "", description: "" }];

  const resultRows: ResultRow[] =
    cs.results?.stats && cs.results.stats.length > 0
      ? cs.results.stats.map((s) => ({ title: s.label, value: s.value }))
      : [{ title: "", value: "" }];

  const comparisonRows: ComparisonRow[] =
    cs.results?.comparisons && cs.results.comparisons.length > 0
      ? cs.results.comparisons.map((c) => ({
        title: c.label,
        before: String(c.before),
        after: String(c.after),
      }))
      : [{ title: "", before: "", after: "" }];

  return {
    client: cs.client ?? "",
    industry: cs.industry ?? "",
    title: cs.title ?? "",
    summary: cs.summary ?? "",
    palette: cs.palette.join(", "),
    paletteNames: cs.paletteNames.join(", "),
    tags: cs.tags.join(", "),
    readTime: (cs.readTime ?? "").replace(/[^0-9]/g, ""),
    date: cs.date ?? "",
    featured: Boolean(cs.featured),
    sortOrder: cs.sortOrder != null ? String(cs.sortOrder) : "",
    status: cs.status === 1 ? "1" : "0",
    overviewParagraphs: cs.overview.paragraphs.join("\n"),
    processRows,
    resultRows,
    comparisonRows,
    projectInfoClient: cs.projectInfo.client ?? "",
    projectInfoTimeline: cs.projectInfo.timeline ?? "",
    projectInfoServices: (cs.projectInfo.services ?? []).join(", "),
    team: (cs.team || [])
      .map((m) => (m.role ? `${m.name || ""} :: ${m.role}` : (m.name || "")))
      .join("\n"),
  };
}

/* ---------- Section label ---------- */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-default-500">
        {label}
      </p>
      <div className="h-px flex-1 bg-default-200" />
    </div>
  );
}

/* ---------- Generic dynamic rows section ---------- */
function DynamicSection<T extends Record<string, string>>({
  label,
  rows,
  fields,
  onAdd,
  onRemove,
  onChange,
  error,
  hideAddButton = false,
}: {
  label: string;
  rows: T[];
  fields: { key: keyof T; label: string; placeholder?: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (i: number, key: keyof T, val: string) => void;
  error?: string;
  hideAddButton?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>

        {!hideAddButton && (
          <Button
            isIconOnly
            color="primary"
            radius="full"
            size="sm"
            variant="flat"
            onPress={onAdd}
          >
            <Icon icon="mdi:plus" width={18} />
          </Button>
        )}
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="relative flex flex-col gap-2 rounded-xl bg-default-50/60 p-3 sm:flex-row sm:items-start"
          >
            {fields.map((f) => (
              <Input
                key={String(f.key)}
                className="flex-1"
                label={f.label}
                placeholder={f.placeholder ?? ""}
                size="sm"
                value={row[f.key] as string}
                variant="bordered"
                onValueChange={(val) => onChange(i, f.key, val)}
              />
            ))}

            {rows.length > 1 && (
              <Button
                isIconOnly
                className="shrink-0 self-center"
                color="danger"
                radius="full"
                size="sm"
                variant="light"
                onPress={() => onRemove(i)}
              >
                <Icon icon="mdi:close" width={16} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function CaseStudies() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  const [selectedCaseStudy, setSelectedCaseStudy] = useState<CaseStudy | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [formErrors, setFormErrors] = useState<FormErrors>(defaultErrors);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [, setStatusUpdatingId] = useState<number | null>(null);

  const {
    isOpen: isViewOpen,
    onOpen: onViewOpen,
    onOpenChange: onViewChange,
  } = useDisclosure();
  const {
    isOpen: isFormOpen,
    onOpen: onFormOpen,
    onClose: onFormClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteChange,
    onClose: onDeleteClose,
  } = useDisclosure();

  const triggerReload = () => setReloadToken((p) => p + 1);
  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormErrors(defaultErrors);
  };

  /* ---- Load list ---- */
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    getCaseStudies({ page, per_page: limit })
      .then((res) => {
        if (!active) return;
        setCaseStudies(res.data);
        setTotalCount(res.total);
        setTotalPages(Math.max(res.total_pages, 1));
      })
      .catch((err) => {
        if (!active) return;
        setError(getCaseStudiesErrorMessage(err));
        setCaseStudies([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, limit, reloadToken]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* ---- Field helpers ---- */
  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (key in defaultErrors)
      setFormErrors((p) => ({ ...p, [key]: "" }));
  };

  /* Process rows */
  const addProcess = () =>
    setForm((p) => ({ ...p, processRows: [...p.processRows, { title: "", description: "" }] }));
  const removeProcess = (i: number) =>
    setForm((p) => ({ ...p, processRows: p.processRows.filter((_, idx) => idx !== i) }));
  const changeProcess = (i: number, key: keyof ProcessRow, val: string) =>
    setForm((p) => {
      const rows = [...p.processRows];
      rows[i] = { ...rows[i], [key]: val };
      return { ...p, processRows: rows };
    });

  /* Result rows */
  const addResult = () =>
    setForm((p) => ({ ...p, resultRows: [...p.resultRows, { title: "", value: "" }] }));
  const removeResult = (i: number) =>
    setForm((p) => ({ ...p, resultRows: p.resultRows.filter((_, idx) => idx !== i) }));
  const changeResult = (i: number, key: keyof ResultRow, val: string) =>
    setForm((p) => {
      const rows = [...p.resultRows];
      rows[i] = { ...rows[i], [key]: val };
      return { ...p, resultRows: rows };
    });

  /* Comparison rows */
  const addComparison = () =>
    setForm((p) => ({ ...p, comparisonRows: [...p.comparisonRows, { title: "", before: "", after: "" }] }));
  const removeComparison = (i: number) =>
    setForm((p) => ({ ...p, comparisonRows: p.comparisonRows.filter((_, idx) => idx !== i) }));
  const changeComparison = (i: number, key: keyof ComparisonRow, val: string) =>
    setForm((p) => {
      const rows = [...p.comparisonRows];
      rows[i] = { ...rows[i], [key]: val };
      return { ...p, comparisonRows: rows };
    });

  /* ---- Open modals ---- */
  const openCreate = () => {
    resetForm();
    onFormOpen();
  };

  const openView = async (id: number) => {
    setSelectedCaseStudy(null);
    setIsViewLoading(true);
    onViewOpen();
    try {
      setSelectedCaseStudy(await getCaseStudyById(id));
    } catch (e) {
      addToast({ color: "danger", description: getCaseStudiesErrorMessage(e), radius: "full", timeout: 3000, title: "Load Failed" });
    } finally {
      setIsViewLoading(false);
    }
  };

  const openEdit = async (id: number) => {
    resetForm();
    setEditingId(id);
    setIsFormLoading(true);
    onFormOpen();
    try {
      setForm(caseStudyToForm(await getCaseStudyById(id)));
    } catch (e) {
      addToast({ color: "danger", description: getCaseStudiesErrorMessage(e), radius: "full", timeout: 3000, title: "Load Failed" });
      onFormClose();
      resetForm();
    } finally {
      setIsFormLoading(false);
    }
  };

  /* ---- Build & validate payload ---- */
  const buildPayload = (): CaseStudyPayload | null => {
    const errs: FormErrors = { ...defaultErrors };

    const client = form.client.trim();
    const industry = form.industry.trim();
    const title = form.title.trim();
    const summary = form.summary.trim();
    const readTime = form.readTime.trim();
    const date = form.date.trim();
    const overviewParagraphs = parseLines(form.overviewParagraphs);
    const palette = Array.from(
      new Set(parseDelimited(form.palette).map((c) => c.toUpperCase())),
    );

    /* Validation — only up to process section */
    if (!client) errs.client = "Client name is required.";
    if (!industry) errs.industry = "Industry is required.";
    if (!title) errs.title = "Title is required.";
    if (!summary) errs.summary = "Summary is required.";
    if (!readTime) errs.readTime = "Read time is required.";
    if (!date) errs.date = "Date is required.";
    if (palette.length === 0) {
      errs.palette = "Add at least one hex color.";
    } else if (palette.some((c) => !isValidHex(c))) {
      errs.palette = "All palette colors must be valid hex values like #0F172A.";
    }
    if (overviewParagraphs.length === 0) {
      errs.overviewParagraphs = "Add at least one overview paragraph.";
    }

    const validProcessRows = form.processRows.filter(
      (r) => r.title.trim() || r.description.trim(),
    );
    if (validProcessRows.length === 0) {
      errs.processRows = "Add at least one process step.";
    }

    setFormErrors(errs);
    const firstError = Object.values(errs).find(Boolean);
    if (firstError) {
      addToast({ color: "danger", description: firstError, radius: "full", timeout: 3000, title: "Validation Error" });
      return null;
    }

    /* Optional sections — no validation */
    const paletteNamesRaw = parseDelimited(form.paletteNames);
    const paletteNames = palette.map((hex, i) => paletteNamesRaw[i] || hex);
    const tags = parseDelimited(form.tags);
    const services = parseDelimited(form.projectInfoServices);

    const resultStats = form.resultRows
      .filter((r) => r.title.trim() || r.value.trim())
      .map((r) => ({ label: r.title.trim(), value: r.value.trim() }));

    const comparisons = form.comparisonRows
      .filter((r) => r.title.trim())
      .map((r) => ({
        label: r.title.trim(),
        before: Number(r.before) || 0,
        after: Number(r.after) || 0,
      }));

    const hasResults = resultStats.length > 0 || comparisons.length > 0;

    const teamMembers = parseLines(form.team)
      .map((line) => {
        const parts = line.split(/::|:|-/).map((p) => p.trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const role = parts.slice(1).join(" ");
          return { name, role };
        }
        return { name: line.trim(), role: "" };
      })
      .filter((m) => m.name) as { name: string; role: string }[];

    return {
      client,
      date,
      featured: form.featured,
      industry,
      overview: { paragraphs: overviewParagraphs },
      palette,
      paletteNames,
      palette_names: paletteNames,
      process: {
        steps: validProcessRows.map((r) => ({
          title: r.title.trim(),
          description: r.description.trim(),
        })),
      },
      projectInfo: {
        client: form.projectInfoClient.trim() || client,
        timeline: form.projectInfoTimeline.trim() || undefined,
        services,
      },
      project_info: {
        client: form.projectInfoClient.trim() || client,
        timeline: form.projectInfoTimeline.trim() || undefined,
        services,
      },
      publishedAt: null,
      published_at: null,
      readTime: readTime ? `${readTime} min` : "",
      read_time: readTime ? `${readTime} min` : "",
      results: hasResults ? { stats: resultStats, comparisons } : undefined,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      sort_order: form.sortOrder ? Number(form.sortOrder) : undefined,
      status: form.status === "1" ? 1 : 0,
      summary,
      tags,
      team: teamMembers,
      team_members: teamMembers,
      title,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await updateCaseStudyById(editingId, payload);
        addToast({ color: "success", description: res.message ?? "Case study updated.", radius: "full", timeout: 3000, title: "Updated" });

        // Update the specific item in state
        if (res.caseStudy || res.data) {
          const updatedCaseStudy = (res.caseStudy || res.data)!;
          setCaseStudies((prev) =>
            prev.map((cs) => cs.id === editingId ? updatedCaseStudy : cs)
          );
        } else {
          triggerReload();
        }
      } else {
        const res = await createCaseStudy(payload);
        addToast({ color: "success", description: res.message ?? "Case study created.", radius: "full", timeout: 3000, title: "Created" });

        // Add new item to state
        if (res.caseStudy || res.data) {
          const newCaseStudy = (res.caseStudy || res.data)!;
          setCaseStudies((prev) => [newCaseStudy, ...prev]);
          setTotalCount((prev) => prev + 1);
        } else {
          triggerReload();
        }
      }
      onFormClose();
      resetForm();
    } catch (e) {
      addToast({ color: "danger", description: getCaseStudiesErrorMessage(e), radius: "full", timeout: 3000, title: editingId ? "Update Failed" : "Create Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      const res = await deleteCaseStudyById(pendingDelete.id);
      addToast({ color: "success", description: res.message ?? "Deleted.", radius: "full", timeout: 3000, title: "Deleted" });

      // Remove from state instead of reloading
      setCaseStudies((prev) => prev.filter((cs) => cs.id !== pendingDelete.id));
      setTotalCount((prev) => prev - 1);

      // Handle pagination
      if (caseStudies.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (e) {
      addToast({ color: "danger", description: getCaseStudiesErrorMessage(e), radius: "full", timeout: 3000, title: "Delete Failed" });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
      onDeleteClose();
    }
  };

  const handleStatusChange = useCallback(async (cs: CaseStudy) => {
    const csId = Number(cs.id);
    const originalStatus = cs.status;
    const nextStatus: CaseStudyStatus = originalStatus === 1 ? 0 : 1;

    setStatusUpdatingId(csId);

    // Optimistic update
    setCaseStudies((prev) =>
      prev.map((item) =>
        Number(item.id) === csId ? { ...item, status: nextStatus } : item,
      ),
    );

    try {
      const res = await updateCaseStudyStatus(csId, nextStatus);

      addToast({
        title: nextStatus === 1 ? "Case Study Published" : "Moved To Draft",
        description: res.message ?? (nextStatus === 1 ? "Case study published successfully." : "Case study moved back to draft."),
        color: "success",
        radius: "full",
        timeout: 3000,
      });
    } catch (err) {
      // Rollback on error
      setCaseStudies((prev) =>
        prev.map((item) =>
          Number(item.id) === csId ? { ...item, status: originalStatus } : item,
        ),
      );

      addToast({
        title: "Status Update Failed",
        description: getCaseStudiesErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setStatusUpdatingId(null);
    }
  }, [addToast, setCaseStudies]);

  const publishedCount = caseStudies.filter((c) => c.status === 1).length;
  const draftCount = caseStudies.filter((c) => c.status === 0).length;
  const featuredCount = caseStudies.filter((c) => c.featured).length;

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <>
      {/* ---- Main card ---- */}
      <Card shadow="md">
        <CardBody className="gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Case Studies</h2>
                <Chip color="secondary" size="sm" variant="flat">{featuredCount} featured</Chip>
                <Chip color="success" size="sm" variant="flat">{publishedCount} published</Chip>
                <Chip color="warning" size="sm" variant="flat">{draftCount} draft</Chip>
              </div>
              <p className="text-sm text-default-500">
                {totalCount.toLocaleString()} case studies total
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                isLoading={isLoading}
                startContent={!isLoading ? <Icon icon="solar:refresh-bold" width={18} /> : undefined}
                variant="flat"
                onPress={triggerReload}
              >
                Refresh
              </Button>
              <Button
                color="primary"
                startContent={<Icon icon="mdi:plus" width={18} />}
                onPress={openCreate}
              >
                Add Case Study
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {/* Desktop table */}
          <div className="hidden xl:block">
            <Table
              aria-label="Case studies table"
              classNames={{
                base: "min-h-[320px]",
                wrapper: "overflow-x-auto border border-default-200 shadow-none p-0",
                th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
                td: "py-4 align-top",
              }}
            >
              <TableHeader>
                <TableColumn className="w-[26%]">Case Study</TableColumn>
                <TableColumn className="w-[12%]">Industry</TableColumn>
                <TableColumn className="w-[18%]">Palette</TableColumn>
                <TableColumn className="w-[14%]">Client</TableColumn>
                <TableColumn className="w-[12%]">Tags</TableColumn>
                <TableColumn className="w-[10%]">Status</TableColumn>
                <TableColumn className="w-[10%] text-right">Actions</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <p className="py-10 text-sm text-default-500">No case studies found.</p>
                }
                isLoading={isLoading}
                items={caseStudies}
                loadingContent={<Spinner label="Loading..." />}
              >
                {(cs: CaseStudy) => (
                  <TableRow
                    key={String(cs.id)}
                    className="cursor-pointer transition-colors hover:bg-default-50"
                    onClick={() => void openView(cs.id)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-foreground">{cs.title || "-"}</p>
                          <span className="text-xs text-default-400">#{cs.id}</span>
                          {cs.featured ? (
                            <Chip color="secondary" size="sm" variant="flat">Featured</Chip>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-sm text-default-500">{cs.summary || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">{cs.industry || "-"}</Chip>
                    </TableCell>
                    <TableCell>
                      {cs.palette.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {cs.palette.slice(0, 5).map((c) => (
                            <span
                              key={c}
                              className="h-6 w-6 rounded-full border border-default-200 shadow-sm"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-default-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="shrink-0 bg-primary font-semibold text-white"
                          name={getInitials(cs.client)}
                          radius="full"
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">{cs.client || "-"}</p>
                          <p className="text-xs text-default-400">{cs.readTime || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {cs.tags.slice(0, 2).map((t) => (
                          <Chip key={t} size="sm" variant="flat">{t}</Chip>
                        ))}
                        {cs.tags.length > 2 ? (
                          <Tooltip content={cs.tags.join(", ")}>
                            <Chip size="sm" variant="flat">+{cs.tags.length - 2}</Chip>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Chip color={getStatusColor(cs.status)} size="sm" variant="flat">
                          {getStatusLabel(cs.status)}
                        </Chip>
                        <p className="text-[10px] text-default-400">
                          {cs.publishedAt ? formatDateTime(cs.publishedAt) : "Not published"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* ✅ Edit button (same रहेगा) */}
                        <Button
                          isIconOnly
                          color="secondary"
                          size="sm"
                          variant="flat"
                          startContent={
                            <Icon
                              key={`edit-${cs.id}`}
                              height={16}
                              icon="mdi:pencil-outline"
                              width={16}
                            />
                          }
                          onPress={() => void openEdit(cs.id)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* 🔥 NEW TOGGLE + DELETE */}
                        <div className="flex items-center gap-2">
                          <Button
                            isIconOnly
                            color={cs.status === 1 ? "warning" : "success"}
                            size="sm"
                            variant="flat"
                            startContent={
                              <Icon
                                key={`status-${cs.id}-${cs.status}`}
                                height={16}
                                icon={
                                  cs.status === 1
                                    ? "mdi:file-document-edit-outline"
                                    : "mdi:publish"
                                }
                                width={16}
                              />
                            }
                            onPress={() => void handleStatusChange(cs)}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="flat"
                            startContent={
                              deletingId !== cs.id && (
                                <Icon
                                  key={`del-${cs.id}`}
                                  height={16}
                                  icon="mdi:delete-outline"
                                  width={16}
                                />
                              )
                            }
                            onPress={() => {
                              setPendingDelete({
                                id: cs.id,
                                title: cs.title || "this case study",
                              });
                              onDeleteOpen();
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:hidden">
            {isLoading ? (
              <div className="col-span-2 flex min-h-[200px] items-center justify-center">
                <Spinner label="Loading..." />
              </div>
            ) : caseStudies.length === 0 ? (
              <p className="col-span-2 py-10 text-center text-sm text-default-500">
                No case studies found.
              </p>
            ) : (
              caseStudies.map((cs) => (
                <div
                  key={cs.id}
                  className="cursor-pointer space-y-3 rounded-2xl border border-default-200 bg-content1 p-4 transition-colors hover:bg-default-50"
                  role="button"
                  tabIndex={0}
                  onClick={() => void openView(cs.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") void openView(cs.id); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{cs.title || "-"}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-default-500">{cs.summary || "-"}</p>
                    </div>
                    <Chip className="shrink-0" color={getStatusColor(cs.status)} size="sm" variant="flat">
                      {getStatusLabel(cs.status)}
                    </Chip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="shrink-0 bg-primary font-semibold text-white" name={getInitials(cs.client)} radius="full" size="sm" />
                    <div>
                      <p className="text-xs font-medium">{cs.client || "-"}</p>
                      <p className="text-xs text-default-400">{cs.industry || "-"}</p>
                    </div>
                  </div>
                  {cs.palette.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cs.palette.slice(0, 6).map((c) => (
                        <span key={c} className="h-5 w-5 rounded-full border border-default-200" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  ) : null}
                  <div
                    className="flex items-center justify-between border-t border-default-100 pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-default-400">
                      {formatDateTime(cs.updatedAt || cs.createdAt)}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        isIconOnly
                        color="secondary"
                        size="sm"
                        variant="flat"
                        startContent={
                          <Icon height={15} icon="mdi:pencil-outline" width={15} />
                        }
                        onPress={() => void openEdit(cs.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex items-center gap-1.5">
                        <Button
                          isIconOnly
                          color={cs.status === 1 ? "warning" : "success"}
                          size="sm"
                          variant="flat"
                          startContent={
                            <Icon
                              key={`status-${cs.id}-${cs.status}`}
                              height={15}
                              icon={
                                cs.status === 1
                                  ? "mdi:file-document-edit-outline"
                                  : "mdi:publish"
                              }
                              width={15}
                            />
                          }
                          onPress={() => void handleStatusChange(cs)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <Button
                          isIconOnly
                          color="danger"
                          isDisabled={deletingId === cs.id}
                          isLoading={deletingId === cs.id}
                          size="sm"
                          variant="flat"
                          startContent={
                            deletingId !== cs.id && (
                              <Icon
                                height={15}
                                icon="mdi:delete-outline"
                                width={15}
                              />
                            )
                          }
                          onPress={() => {
                            setPendingDelete({
                              id: cs.id,
                              title: cs.title || "this case study",
                            });
                            onDeleteOpen();
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              disallowEmptySelection
              className="w-full sm:w-28"
              label="Limit"
              selectedKeys={[String(limit)]}
              size="sm"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n !== limit) { setLimit(n); setPage(1); }
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

      {/* ================================================================
          VIEW MODAL
      ================================================================ */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isDismissable={false}
        isOpen={isViewOpen}
        scrollBehavior="inside"
        size="3xl"
        onOpenChange={onViewChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Case Study Details</h3>
                <Button isIconOnly radius="full" variant="light" onPress={onClose}>
                  <Icon className="h-5 w-5" icon="mdi:close" />
                </Button>
              </ModalHeader>
              <ModalBody className="py-5">
                {isViewLoading ? (
                  <div className="flex justify-center py-8"><Spinner label="Loading..." /></div>
                ) : selectedCaseStudy ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold">{selectedCaseStudy.title}</h4>
                      {selectedCaseStudy.featured ? (
                        <Chip color="secondary" size="sm" variant="flat">Featured</Chip>
                      ) : null}
                      <Chip color={getStatusColor(selectedCaseStudy.status)} size="sm" variant="flat">
                        {getStatusLabel(selectedCaseStudy.status)}
                      </Chip>
                    </div>

                    <p className="text-sm text-default-600">{selectedCaseStudy.summary}</p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Client", value: selectedCaseStudy.client },
                        { label: "Industry", value: selectedCaseStudy.industry },
                        { label: "Read Time", value: selectedCaseStudy.readTime },
                        { label: "Date", value: selectedCaseStudy.date },
                        { label: "Timeline", value: selectedCaseStudy.projectInfo.timeline ?? "-" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-default-200 bg-default-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-default-400">{label}</p>
                          <p className="mt-0.5 text-sm font-medium text-foreground">{value || "-"}</p>
                        </div>
                      ))}
                    </div>

                    {selectedCaseStudy.palette.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Palette</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCaseStudy.palette.map((c, i) => (
                            <div key={c} className="flex items-center gap-1.5">
                              <span className="h-7 w-7 rounded-full border border-default-200 shadow-sm" style={{ backgroundColor: c }} />
                              <span className="text-xs text-default-600">{selectedCaseStudy.paletteNames[i] ?? c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedCaseStudy.overview.paragraphs.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Overview</p>
                        <div className="space-y-1">
                          {selectedCaseStudy.overview.paragraphs.map((p, i) => (
                            <p key={i} className="text-sm text-default-600">{p}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedCaseStudy.process.steps.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Process</p>
                        <div className="space-y-2">
                          {selectedCaseStudy.process.steps.map((s, i) => (
                            <div key={i} className="rounded-xl border border-default-200 bg-default-50 px-3 py-2">
                              <p className="text-sm font-semibold">{s.title}</p>
                              <p className="text-sm text-default-500">{s.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedCaseStudy.results ? (
                      <div className="space-y-3">
                        {(selectedCaseStudy.results.stats ?? []).length > 0 ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Results</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {selectedCaseStudy.results.stats.map((s, i) => (
                                <div key={i} className="rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-center">
                                  <p className="text-lg font-bold text-primary">{s.value}</p>
                                  <p className="text-xs text-default-500">{s.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {(selectedCaseStudy.results.comparisons ?? []).length > 0 ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Comparisons</p>
                            <div className="space-y-2">
                              {selectedCaseStudy.results.comparisons.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 px-3 py-2">
                                  <p className="flex-1 text-sm font-medium">{c.label}</p>
                                  <span className="text-xs text-default-400">Before: {c.before}</span>
                                  <span className="text-xs text-success">After: {c.after}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedCaseStudy.tags.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-500">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCaseStudy.tags.map((t) => (
                            <Chip key={t} size="sm" variant="flat">{t}</Chip>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-default-400">No data found.</p>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ================================================================
          FORM MODAL — ADD / EDIT
      ================================================================ */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isDismissable={false}
        isOpen={isFormOpen}
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={(open) => { if (!open) { onFormClose(); resetForm(); } }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {editingId ? "Edit Case Study" : "Add Case Study"}
                </h3>
                <Button isIconOnly radius="full" variant="light" onPress={onClose}>
                  <Icon className="h-5 w-5" icon="mdi:close" />
                </Button>
              </ModalHeader>

              <ModalBody className="py-5">
                {isFormLoading ? (
                  <div className="flex justify-center py-8"><Spinner label="Loading..." /></div>
                ) : (
                  <div className="space-y-4">

                    {/* ---- Basic Info ---- */}
                    <SectionLabel label="Basic Info" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        isRequired
                        errorMessage={formErrors.client}
                        isInvalid={!!formErrors.client}
                        label="Client"
                        placeholder="e.g. Lumina"
                        size="sm"
                        value={form.client}
                        variant="bordered"
                        onValueChange={(v) => setField("client", v)}
                      />
                      <Input
                        isRequired
                        errorMessage={formErrors.industry}
                        isInvalid={!!formErrors.industry}
                        label="Industry"
                        placeholder="e.g. Branding & Design"
                        size="sm"
                        value={form.industry}
                        variant="bordered"
                        onValueChange={(v) => setField("industry", v)}
                      />
                    </div>
                    <Input
                      isRequired
                      errorMessage={formErrors.title}
                      isInvalid={!!formErrors.title}
                      label="Title"
                      placeholder="Case study title"
                      size="sm"
                      value={form.title}
                      variant="bordered"
                      onValueChange={(v) => setField("title", v)}
                    />
                    <Textarea
                      isRequired
                      errorMessage={formErrors.summary}
                      isInvalid={!!formErrors.summary}
                      label="Summary"
                      minRows={2}
                      placeholder="Short description..."
                      size="sm"
                      value={form.summary}
                      variant="bordered"
                      onValueChange={(v) => setField("summary", v)}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        isRequired
                        errorMessage={formErrors.readTime}
                        isInvalid={!!formErrors.readTime}
                        label="Read Time (Time in Minutes)"
                        placeholder="e.g. 12"
                        size="sm"
                        value={form.readTime}
                        variant="bordered"
                        onValueChange={(v) => setField("readTime", v)}
                      />
                      <Input
                        isRequired
                        errorMessage={formErrors.date}
                        isInvalid={!!formErrors.date}
                        label="Date"
                        placeholder="e.g. Feb 2026"
                        size="sm"
                        value={form.date}
                        variant="bordered"
                        onValueChange={(v) => setField("date", v)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        label="Sort Order"
                        placeholder="e.g. 1"
                        size="sm"
                        type="number"
                        value={form.sortOrder}
                        variant="bordered"
                        onValueChange={(v) => setField("sortOrder", v)}
                      />
                      <Select
                        disallowEmptySelection
                        label="Status"
                        selectedKeys={[form.status]}
                        size="sm"
                        variant="bordered"
                        onChange={(e) => setField("status", e.target.value as "0" | "1")}
                      >
                        <SelectItem key="0">Draft</SelectItem>
                        <SelectItem key="1">Published</SelectItem>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-default-200 px-4 py-3">
                      <Switch
                        isSelected={form.featured}
                        size="sm"
                        onValueChange={(v) => setField("featured", v)}
                      />
                      <p className="text-sm text-default-600">Mark as Featured</p>
                    </div>

                    {/* ---- Palette ---- */}
                    <SectionLabel label="Palette" />
                    <Input
                      isRequired
                      errorMessage={formErrors.palette}
                      isInvalid={!!formErrors.palette}
                      label="Hex Colors"
                      placeholder="#0F172A, #38BDF8, ..."
                      size="sm"
                      value={form.palette}
                      variant="bordered"
                      onValueChange={(v) => setField("palette", v)}
                    />
                    {form.palette && (
                      <div className="space-y-3 rounded-2xl border border-default-200 bg-default-50/50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-default-500">
                          Palette Preview
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {parseDelimited(form.palette).map((c, i) => (
                            <div
                              key={`${c}-${i}`}
                              className="flex items-center gap-2 rounded-full border border-default-200 bg-content1 px-3 py-1.5 shadow-sm transition-all hover:border-primary/50"
                            >
                              <div
                                className="h-4 w-4 shrink-0 rounded-full border border-default-200 shadow-inner"
                                style={{ backgroundColor: isValidHex(c) ? c : "transparent" }}
                              />
                              <span className="font-mono text-xs font-semibold leading-none text-default-700">
                                {isValidHex(c) ? c.toUpperCase() : c}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Input
                      label="Palette Names (optional)"
                      placeholder="Midnight, Sky Blue, ..."
                      size="sm"
                      value={form.paletteNames}
                      variant="bordered"
                      onValueChange={(v) => setField("paletteNames", v)}
                    />

                    {/* ---- Tags ---- */}
                    <SectionLabel label="Tags" />
                    <Input
                      label="Tags"
                      placeholder="branding, design system, ..."
                      size="sm"
                      value={form.tags}
                      variant="bordered"
                      onValueChange={(v) => setField("tags", v)}
                    />

                    {/* ---- Overview ---- */}
                    <SectionLabel label="Overview" />
                    <Textarea
                      isRequired
                      errorMessage={formErrors.overviewParagraphs}
                      isInvalid={!!formErrors.overviewParagraphs}
                      label="Overview Paragraphs"
                      minRows={3}
                      placeholder="One paragraph per line..."
                      size="sm"
                      value={form.overviewParagraphs}
                      variant="bordered"
                      onValueChange={(v) => setField("overviewParagraphs", v)}
                    />

                    {/* ---- Process (dynamic) ---- */}
                    <SectionLabel label="Process" />
                    <DynamicSection<ProcessRow>
                      error={formErrors.processRows}
                      fields={[
                        { key: "title", label: "Process Title", placeholder: "e.g. Audit Existing Design" },
                        { key: "description", label: "Process Description", placeholder: "e.g. Analyzed 14 colors..." },
                      ]}
                      label="Process Steps"
                      rows={form.processRows}
                      onAdd={addProcess}
                      onChange={changeProcess}
                      onRemove={removeProcess}
                    />

                    {/* ---- Results (dynamic) ---- */}
                    <SectionLabel label="Results (Optional)" />
                    <DynamicSection<ResultRow>
                      fields={[
                        { key: "title", label: "Result Title", placeholder: "e.g. Brand Recognition" },
                        { key: "value", label: "Result Value", placeholder: "e.g. 300%" },
                      ]}
                      label="Result Items"
                      rows={form.resultRows}
                      onAdd={addResult}
                      onChange={changeResult}
                      onRemove={removeResult}
                    />

                    {/* ---- Comparisons (dynamic) ---- */}
                    <SectionLabel label="Comparisons (Optional)" />
                      <DynamicSection<ComparisonRow>
                        fields={[
                          { key: "label", label: "Label", placeholder: "e.g. Before" },
                          { key: "value", label: "Value", placeholder: "e.g. Old design" },
                        ]}
                        label="Comparison Items"
                        rows={form.comparisonRows}
                        onAdd={addComparison}
                        onChange={changeComparison}
                        onRemove={removeComparison}
                        hideAddButton
                      />

                    {/* ---- Project Info ---- */}
                    <SectionLabel label="Project Info (Optional)" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        label="Client (override)"
                        placeholder={form.client || "Client name"}
                        size="sm"
                        value={form.projectInfoClient}
                        variant="bordered"
                        onValueChange={(v) => setField("projectInfoClient", v)}
                      />
                      <Input
                        label="Timeline"
                        placeholder="e.g. 3 months"
                        size="sm"
                        value={form.projectInfoTimeline}
                        variant="bordered"
                        onValueChange={(v) => setField("projectInfoTimeline", v)}
                      />
                    </div>
                    <Input
                      label="Services"
                      placeholder="Branding, UI/UX, ..."
                      size="sm"
                      value={form.projectInfoServices}
                      variant="bordered"
                      onValueChange={(v) => setField("projectInfoServices", v)}
                    />

                    {/* ---- Team ---- */}
                    <SectionLabel label="Team (Optional)" />
                    <Textarea
                      label="Team Members"
                      minRows={2}
                      placeholder={"John Doe :: Creative Director\nJane Smith :: UI Designer"}
                      size="sm"
                      value={form.team}
                      variant="bordered"
                      onValueChange={(v) => setField("team", v)}
                    />
                  </div>
                )}
              </ModalBody>

              <ModalFooter>
                <Button isDisabled={isSubmitting} variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" isLoading={isSubmitting} onPress={handleSave}>
                  {editingId ? "Save Changes" : "Create Case Study"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ================================================================
          DELETE CONFIRM MODAL
      ================================================================ */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isDismissable={false}
        isOpen={isDeleteOpen}
        size="sm"
        onOpenChange={onDeleteChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-danger" icon="mdi:alert-circle-outline" />
                <span>Delete Case Study</span>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{pendingDelete?.title}</span>? This cannot be
                  undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button isDisabled={deletingId !== null} variant="flat" onPress={onDeleteClose}>
                  Cancel
                </Button>
                <Button color="danger" isLoading={deletingId !== null} onPress={handleDelete}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
