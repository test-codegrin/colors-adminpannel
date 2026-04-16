import type { ActivityFeedItem } from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

import {
  addToast,
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
  useDisclosure,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import {
  exportActivityFeedCsv,
  getActivityFeedPage,
  getAnalyticsErrorMessage,
} from "@/api/analytics.api";

const DEFAULT_PAGE_SIZE = 10;
const ALL_EVENT_TYPES_KEY = "all";
const EXPORT_SCOPE_ALL = "all";
const EXPORT_SCOPE_SELECTED = "selected";

interface ActivityFeedFilterOption {
  value: string;
  label: string;
  count: number;
}

type ExportScope = typeof EXPORT_SCOPE_ALL | typeof EXPORT_SCOPE_SELECTED;

function prettifyFeatureName(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string { 
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseExportFilename(
  contentDisposition: string | null | undefined,
): string | null {
  if (!contentDisposition) return null;

  const utf8FilenameMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  );

  if (utf8FilenameMatch?.[1]) {
    return decodeURIComponent(utf8FilenameMatch[1].trim());
  }

  const plainFilenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  if (plainFilenameMatch?.[1]) {
    return plainFilenameMatch[1].trim();
  }

  return null;
}

function downloadCsvBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function buildFallbackExportFilename(eventType: string | null): string {
  if (!eventType) {
    return "activity-feed-all_events.csv";
  }

  return `activity-feed-${eventType}.csv`;
}

export default function ActivityFeedPage() {
  const {
    isOpen: isExportModalOpen,
    onOpen: openExportModal,
    onOpenChange: onExportModalOpenChange,
    onClose: closeExportModal,
  } = useDisclosure();
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [pagination, setPagination] = useState<PaginationPayload>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total_pages: 1,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [eventType, setEventType] = useState(ALL_EVENT_TYPES_KEY);
  const [eventTypeOptions, setEventTypeOptions] = useState<
    ActivityFeedFilterOption[]
  >([]);
  const [exportScope, setExportScope] = useState<ExportScope>(EXPORT_SCOPE_ALL);
  const [exportEventType, setExportEventType] = useState(ALL_EVENT_TYPES_KEY);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage: number) => {
      const requestId = ++requestRef.current;
      const appliedEventType =
        eventType === ALL_EVENT_TYPES_KEY ? null : eventType;

      setIsLoading(true);
      setError("");
      try {
        const result = await getActivityFeedPage(
          targetPage,
          limit,
          appliedEventType,
        );

        if (requestId !== requestRef.current) return;
        setItems(result.items);
        setPagination(result.pagination);
        setEventTypeOptions(result.filterOptions);
        setEventType(result.filters.event_type ?? ALL_EVENT_TYPES_KEY);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(getAnalyticsErrorMessage(err));
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [eventType, limit],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const totalPages = Math.max(
    1,
    pagination.total_pages ?? pagination.totalPages ?? 1,
  );
  const eventTypeSelectOptions = [
    {
      value: ALL_EVENT_TYPES_KEY,
      label: "All event types",
      count: 0,
    },
    ...eventTypeOptions,
  ];
  const shouldRequireSelectedEventType = exportScope === EXPORT_SCOPE_SELECTED;
  const isExportDisabled =
    isExporting ||
    (shouldRequireSelectedEventType &&
      exportEventType === ALL_EVENT_TYPES_KEY);

  const handleOpenExportModal = () => {
    setExportScope(EXPORT_SCOPE_ALL);
    setExportEventType(eventType);
    openExportModal();
  };

  const handleExport = async () => {
    const selectedEventType =
      exportEventType === ALL_EVENT_TYPES_KEY ? null : exportEventType;
    const shouldExportSelected = exportScope === EXPORT_SCOPE_SELECTED;

    if (shouldExportSelected && !selectedEventType) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await exportActivityFeedCsv(
        shouldExportSelected ? selectedEventType : null,
      );
      const contentDisposition = response.headers["content-disposition"];
      const filename =
        parseExportFilename(contentDisposition) ??
        buildFallbackExportFilename(
          shouldExportSelected ? selectedEventType : null,
        );
      const csvBlob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      downloadCsvBlob(csvBlob, filename);
      closeExportModal();

      addToast({
        title: "Export Started",
        description: "Activity feed CSV download started.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });
    } catch (err) {
      addToast({
        title: "Export Failed",
        description: getAnalyticsErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6 p-4 sm:p-6">

        {/* ✅ Header Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              Activity Feed
            </h2>
            <p className="text-sm text-default-500">
              Latest analytics events from the activity feed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Chip radius="full" variant="flat">
              {pagination.total} total
            </Chip>

            <Button
              isDisabled={isExporting}
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && (
                  <Icon icon="solar:refresh-bold" width="16" />
                )
              }
              variant="flat"
              onPress={() => loadPage(page)}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
          <Select
            className="w-full sm:w-72"
            isDisabled={isExporting}
            items={eventTypeSelectOptions}
            label="Event Type"
            selectedKeys={[eventType]}
            size="sm"
            onChange={(event) => {
              const nextEventType = event.target.value;

              if (nextEventType !== eventType) {
                setEventType(nextEventType);
                setPage(1);
              }
            }}
          >
            {(option) => (
              <SelectItem key={option.value}>
                {option.value === ALL_EVENT_TYPES_KEY
                  ? option.label
                  : `${prettifyFeatureName(option.label)} (${option.count})`}
              </SelectItem>
            )}
          </Select>

          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium">Export CSV</p>
            <Button
              className="w-full sm:w-auto"
              color="primary"
              isDisabled={isExporting}
              isLoading={isExporting}
              size="sm"
              variant="flat"
              onPress={handleOpenExportModal}
            >
              Open Export
            </Button>
          </div>
        </div>

        {/* ✅ Table Scroll Fix */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <Table
            removeWrapper
            aria-label="Activity feed table"
            className="min-w-[800px]"
          >
            <TableHeader>
              <TableColumn>Event</TableColumn>
              <TableColumn>Page / Endpoint</TableColumn>
              <TableColumn>Context</TableColumn>
              <TableColumn>Created</TableColumn>
            </TableHeader>

            <TableBody
              emptyContent={error ? " " : "No activity feed items"}
              isLoading={isLoading}
              items={items}
              loadingContent={<Spinner label="Loading..." />}
            >
              {(item: ActivityFeedItem) => (
                <TableRow key={item.analytics_event_id}>

                  {/* Event */}
                  <TableCell className="whitespace-nowrap">
                    {prettifyFeatureName(item.event_type)}
                  </TableCell>

                  {/* Page / Endpoint */}
                  <TableCell className="break-words">
                    {item.page || item.endpoint || "-"}
                  </TableCell>

                  {/* Context */}
                  <TableCell className="max-w-[250px] break-words">
                    {[
                      item.device,
                      item.browser,
                      item.os,
                      item.source,
                      item.status_code
                        ? String(item.status_code)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" | ") || "-"}
                  </TableCell>

                  {/* Created */}
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ✅ Pagination Responsive */}
        {!isLoading && !error && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

            {/* Left Side */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
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

              <p className="text-xs text-default-500 sm:pb-2 text-left sm:text-left">
                Page {pagination.page} of {totalPages}
              </p>
            </div>

            {/* Pagination */}
            <div className="flex justify-center sm:justify-end">
              <Pagination
                showControls
                boundaries={1}
                color="primary"
                page={page}
                siblings={0}
                total={totalPages}
                onChange={setPage}
              />
            </div>
          </div>
        )}

        </CardBody>
      </Card>
      <Modal
        backdrop="blur"
        hideCloseButton={isExporting}
        isDismissable={!isExporting}
        isOpen={isExportModalOpen}
        size="md"
        onOpenChange={onExportModalOpenChange}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>Export Activity Feed CSV</span>
            <span className="text-xs font-normal text-default-500">
              Choose export scope and download the CSV file.
            </span>
          </ModalHeader>
          <ModalBody className="pb-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Step 1: Select scope</p>
                <Select
                  disallowEmptySelection
                  isDisabled={isExporting}
                  selectedKeys={[exportScope]}
                  size="sm"
                  onChange={(event) => {
                    setExportScope(event.target.value as ExportScope);
                  }}
                >
                  <SelectItem key={EXPORT_SCOPE_ALL}>All events</SelectItem>
                  <SelectItem key={EXPORT_SCOPE_SELECTED}>
                    Selected event type
                  </SelectItem>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Step 2: Event type</p>
                <Select
                  className="w-full"
                  isDisabled={
                    isExporting || exportScope !== EXPORT_SCOPE_SELECTED
                  }
                  items={eventTypeSelectOptions}
                  selectedKeys={[exportEventType]}
                  size="sm"
                  onChange={(event) => {
                    setExportEventType(event.target.value);
                  }}
                >
                  {(option) => (
                    <SelectItem key={option.value}>
                      {option.value === ALL_EVENT_TYPES_KEY
                        ? option.label
                        : `${prettifyFeatureName(option.label)} (${option.count})`}
                    </SelectItem>
                  )}
                </Select>
                {exportScope === EXPORT_SCOPE_SELECTED &&
                  exportEventType === ALL_EVENT_TYPES_KEY && (
                    <p className="text-xs text-danger">
                      Select an event type to export.
                    </p>
                  )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={isExporting}
              variant="flat"
              onPress={closeExportModal}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={isExportDisabled}
              isLoading={isExporting}
              onPress={handleExport}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
