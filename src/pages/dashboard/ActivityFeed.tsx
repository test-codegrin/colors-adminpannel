import type { ActivityFeedItem } from "@/types/analytics.types";
import type { PaginationPayload } from "@/types/pagination.types";

import {
  Button,
  Card,
  CardBody,
  Chip,
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
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import { getAnalyticsErrorMessage } from "@/api/analytics.api";
import api from "@/lib/axios";

const DEFAULT_PAGE_SIZE = 10;
const ALL_EVENT_TYPES_KEY = "all";

interface ActivityFeedFilterOption {
  value: string;
  label: string;
  count: number;
}

async function fetchActivityFeedPage(
  page: number,
  limit: number,
  eventType: string | null,
): Promise<{
  items: ActivityFeedItem[];
  pagination: PaginationPayload;
  filterOptions: ActivityFeedFilterOption[];
  filters: {
    event_type: string | null;
  };
}> {
  const response = await api.get("/admin/analytics/activity-feed", {
    params: { page, limit, event_type: eventType ?? undefined },
  });
  const payload = response.data;
  const data = payload?.data ?? payload;

  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? {
      total: 0,
      page,
      limit,
      total_pages: 1,
      totalPages: 1,
    },
    filterOptions: data?.filter_options?.event_type ?? [],
    filters: {
      event_type: data?.filters?.event_type ?? null,
    },
  };
}

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

export default function ActivityFeedPage() {
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
  const [isLoading, setIsLoading] = useState(false);
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
        const result = await fetchActivityFeedPage(
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

  return (
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

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Select
            className="w-full sm:w-72"
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
  );
}
