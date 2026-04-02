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

async function fetchActivityFeedPage(
  page: number,
  limit: number,
): Promise<{
  items: ActivityFeedItem[];
  pagination: PaginationPayload;
}> {
  const response = await api.get("/admin/analytics/activity-feed", {
    params: { page, limit },
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage: number) => {
      const requestId = ++requestRef.current;

      setIsLoading(true);
      setError("");
      try {
        const result = await fetchActivityFeedPage(targetPage, limit);

        if (requestId !== requestRef.current) return;
        setItems(result.items);
        setPagination(result.pagination);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(getAnalyticsErrorMessage(err));
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const totalPages = Math.max(
    1,
    pagination.total_pages ?? pagination.totalPages ?? 1,
  );

  return (
    <Card shadow="md">
      <CardBody className="gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Activity Feed</h2>
            <p className="text-sm text-default-500">
              Latest analytics events from the activity feed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Chip radius="full" variant="flat">
              {pagination.total} total
            </Chip>
            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width="18" />
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

        {/* Table */}
        <Table removeWrapper aria-label="Activity feed table">
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
                <TableCell>{prettifyFeatureName(item.event_type)}</TableCell>
                <TableCell>{item.page || item.endpoint || "-"}</TableCell>
                <TableCell>
                  {[
                    item.device,
                    item.browser,
                    item.os,
                    item.source,
                    item.status_code ? String(item.status_code) : null,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "-"}
                </TableCell>
                <TableCell>{formatDateTime(item.created_at)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && !error && pagination.total > 0 && (
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
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
              <p className="text-xs text-default-500 sm:pb-2">
                Page {pagination.page} of {totalPages}
              </p>
            </div>
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
        )}
      </CardBody>
    </Card>
  );
}
