"use client";

import { useEffect, useState } from "react";
import {
    getSupportThreads,
    getSupportErrorMessage,
    type SupportThread,
} from "@/api/chat.api";

import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Skeleton,
    Pagination,
    Button,
    Select,
    SelectItem,
    addToast,
    CardBody,
    Card,
    Tooltip,
} from "@heroui/react";

import { Icon } from "@iconify/react";
import ThreadDetailModal from "@/components/ThreaddetailModal";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────
const columns = [
    { key: "id", label: "ID" },
    { key: "user", label: "NAME" },
    { key: "email", label: "EMAIL" },
    { key: "lastMessage", label: "MESSAGE" },
    { key: "status", label: "STATUS" },
    { key: "unread", label: "UNREAD" },
    { key: "createdAt", label: "CREATED" },
    { key: "actions", label: "ACTIONS" },
];

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────
export default function SupportThreadsPage() {
    const [threads, setThreads] = useState<SupportThread[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(25);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);

    const totalUnread = threads.filter((t) => t.unreadUserMessages > 0).length;

    useEffect(() => {
        fetchThreads(page, limit);
    }, [page, limit]);

    async function fetchThreads(p: number, perPage: number) {
        setLoading(true);
        try {
            const res = await getSupportThreads(p, perPage);
            setThreads(res.data);
            setTotalPages(res.total_pages);
            setTotal(res.total);
        } catch (err) {
            addToast({
                title: "Error",
                description: getSupportErrorMessage(err),
                color: "danger",
            });
        } finally {
            setLoading(false);
        }
    }

    function openModal(thread: SupportThread) {
        setThreads((prev) =>
            prev.map((t) =>
                t.threadId === thread.threadId
                    ? { ...t, unreadUserMessages: 0 }
                    : t
            )
        );
        setSelectedThread({ ...thread, unreadUserMessages: 0 });
        setModalOpen(true);
    }

    function renderCell(thread: SupportThread, columnKey: string) {
        const isUnread = thread.unreadUserMessages > 0;

        switch (columnKey) {
            case "id":
                return (
                    <div className="flex items-center gap-1.5">
                        {isUnread && (
                            <span className="inline-block w-2 h-2 rounded-full bg-warning shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm text-default-500">
                            {thread.threadId}
                        </span>
                    </div>
                );

            case "user":
                return (
                    <span className={`text-xs sm:text-sm ${isUnread ? "font-bold text-foreground" : "font-medium text-default-700"}`}>
                        {thread.user.name}
                    </span>
                );

            case "email":
                return (
                    <div className="text-xs sm:text-sm text-default-500 break-all">
                        {thread.user.email}
                        <div>{thread.user.mobile}</div>
                    </div>
                );

            case "lastMessage":
                return (
                    <div className="max-w-[160px] sm:max-w-[260px]">
                        <p className={`text-xs sm:text-sm truncate ${isUnread ? "font-semibold text-foreground" : "text-default-700"}`}>
                            {thread.lastMessage}
                        </p>
                        <span className="text-[10px] sm:text-xs text-default-400 capitalize">
                            by {thread.lastSenderType}
                        </span>
                    </div>
                );

            case "status":
                return (
                    <Chip
                        size="sm"
                        color={thread.status === 1 ? "success" : "default"}
                        variant="flat"
                        className="text-[10px] sm:text-xs"
                    >
                        {thread.status === 1 ? "Open" : "Closed"}
                    </Chip>
                );

            case "unread":
                return isUnread ? (
                    <Chip
                        size="sm"
                        color="warning"
                        variant="flat"
                        className="text-[10px] sm:text-xs font-semibold"
                        startContent={<Icon icon="mdi:email-outline" width={12} />}
                    >
                        {thread.unreadUserMessages} New
                    </Chip>
                ) : (
                    <Chip
                        size="sm"
                        color="default"
                        variant="flat"
                        className="text-[10px] sm:text-xs text-default-400"
                        startContent={<Icon icon="mdi:email-open-outline" width={12} />}
                    >
                        Read
                    </Chip>
                );

            case "createdAt":
                return (
                    <span className="text-xs sm:text-sm text-default-500 whitespace-nowrap">
                        {formatDate(thread.createdAt)}
                    </span>
                );

            case "actions":
                return (
                    <Tooltip content="View conversation">
                        <Button
                            isIconOnly
                            size="sm"
                            variant={isUnread ? "solid" : "flat"}
                            color="primary"
                            onPress={() => openModal(thread)}
                        >
                            <Icon icon="quill:chat" width={16} />
                        </Button>
                    </Tooltip>
                );

            default:
                return null;
        }
    }

    return (
        <>
            <Card shadow="md">
                <CardBody>
                    <div className="p-3 sm:p-6 space-y-5">

                        {/* HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg sm:text-xl font-semibold">
                                        Support Threads
                                    </h1>
                                    {totalUnread > 0 && (
                                        <Chip
                                            size="sm"
                                            color="warning"
                                            variant="solid"
                                            className="text-[10px] font-bold"
                                        >
                                            {totalUnread} Unread
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-xs text-default-400">
                                    {total} total conversations
                                </p>
                            </div>

                            <Button
                                size="sm"
                                variant="flat"
                                startContent={<Icon icon="mdi:refresh" />}
                                onPress={() => fetchThreads(page, limit)}
                                isLoading={loading}
                            >
                                Refresh
                            </Button>
                        </div>

                        {/* TABLE */}
                        <div className="w-full overflow-x-auto scrollbar-hide rounded-xl">
                            <Table
                                aria-label="Support threads table"
                                removeWrapper
                                className="min-w-[900px]"
                            >
                                <TableHeader columns={columns}>
                                    {(column) => (
                                        <TableColumn className="text-xs sm:text-sm">
                                            {column.label}
                                        </TableColumn>
                                    )}
                                </TableHeader>

                                <TableBody
                                    items={loading ? [] : threads}
                                    emptyContent={
                                        loading ? null : (
                                            <span className="text-sm text-default-400">
                                                No support threads found.
                                            </span>
                                        )
                                    }
                                >
                                    {threads.map((thread) => {
                                        const isUnread = thread.unreadUserMessages > 0;

                                        return (
                                            <TableRow
                                                key={thread.threadId}
                                                className={
                                                    isUnread
                                                        ? "bg-warning-50 dark:bg-warning-900/20"
                                                        : ""   // ← read: no background, fully default
                                                }
                                            >
                                                {(columnKey) => (
                                                    <TableCell>
                                                        {renderCell(thread, columnKey as string)}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* SKELETON */}
                            {loading && (
                                <div className="p-4 space-y-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex gap-3">
                                            <Skeleton className="h-4 w-12 rounded" />
                                            <Skeleton className="h-4 w-24 rounded" />
                                            <Skeleton className="h-4 w-32 rounded" />
                                            <Skeleton className="h-4 flex-1 rounded" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

                            <Pagination
                                showControls
                                color="primary"
                                isDisabled={loading}
                                page={page}
                                total={Math.max(totalPages, 1)}
                                onChange={setPage}
                            />
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* MODAL */}
            <ThreadDetailModal
                isOpen={modalOpen}
                onOpenChange={setModalOpen}
                selectedThread={selectedThread}
                onThreadClosed={() => fetchThreads(page, limit)}
            />
        </>
    );
}