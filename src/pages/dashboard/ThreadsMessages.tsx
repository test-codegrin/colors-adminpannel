"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    getSupportThreads,
    getSupportErrorMessage,
    closeThread,
    filterThreadsLocally,
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
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Input,
} from "@heroui/react";

import { Icon } from "@iconify/react";
import ThreadDetailModal from "@/components/ThreaddetailModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

type StatusFilter = "all" | "open" | "closed";

// ─── Page Component ───────────────────────────────────────────────────────────

export default function SupportThreadsPage() {
    const [threads, setThreads] = useState<SupportThread[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(25);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Thread detail modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);

    // Close confirmation modal
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [threadToClose, setThreadToClose] = useState<SupportThread | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    // ─── Derived: apply client-side search + status filter ───────────────────

    const filteredThreads = (() => {
        let result = filterThreadsLocally(threads, debouncedQuery);
        if (statusFilter === "open") result = result.filter((t) => t.status > 0);
        if (statusFilter === "closed") result = result.filter((t) => t.status === 0);
        return result;
    })();

    const totalUnread = threads.filter((t) => t.unreadUserMessages > 0).length;
    const isFiltering = debouncedQuery.trim() !== "" || statusFilter !== "all";

    // ─── Debounce search input ────────────────────────────────────────────────

    function handleSearchChange(value: string) {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(value);
            setPage(1);
        }, 300);
    }

    function clearSearch() {
        setSearchQuery("");
        setDebouncedQuery("");
        setPage(1);
    }

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchThreads = useCallback(
        async (p: number, perPage: number) => {
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
        },
        [],
    );

    useEffect(() => {
        fetchThreads(page, limit);
    }, [page, limit, fetchThreads]);

    // ─── Modal handlers ───────────────────────────────────────────────────────

    function openModal(thread: SupportThread) {
        setThreads((prev) =>
            prev.map((t) =>
                t.threadId === thread.threadId
                    ? { ...t, unreadUserMessages: 0 }
                    : t,
            ),
        );
        setSelectedThread({ ...thread, unreadUserMessages: 0 });
        setModalOpen(true);
    }

    function handleCloseClick(thread: SupportThread) {
        setThreadToClose(thread);
        onConfirmOpen();
    }

    async function handleConfirmClose() {
        if (!threadToClose) return;
        setIsClosing(true);
        try {
            await closeThread(threadToClose.threadId);
            addToast({
                title: "Thread Closed",
                description: `Thread #${threadToClose.threadId} has been closed successfully.`,
                color: "success",
            });
            onConfirmClose();
            setThreadToClose(null);
            fetchThreads(page, limit);
        } catch (err) {
            addToast({
                title: "Error",
                description: getSupportErrorMessage(err),
                color: "danger",
            });
        } finally {
            setIsClosing(false);
        }
    }

    // ─── Cell renderer ────────────────────────────────────────────────────────

    function renderCell(thread: SupportThread, columnKey: string) {
        const isUnread = thread.unreadUserMessages > 0;
        const isOpen = thread.status > 0;

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
                    <span
                        className={`text-xs sm:text-sm ${
                            isUnread
                                ? "font-bold text-foreground"
                                : "font-medium text-default-700"
                        }`}
                    >
                        {thread.user.name}
                    </span>
                );

            case "email":
                return (
                    <div className="text-xs sm:text-sm text-default-500 break-all">
                        {thread.user.email}
                    </div>
                );

            case "lastMessage":
                return (
                    <div className="max-w-[160px] sm:max-w-[260px]">
                        <p
                            className={`text-xs sm:text-sm truncate ${
                                isUnread
                                    ? "font-semibold text-foreground"
                                    : "text-default-700"
                            }`}
                        >
                            {thread.lastMessage}
                        </p>
                        <span className="text-[10px] sm:text-xs text-default-400 capitalize">
                            by {thread.lastSenderType}
                        </span>
                    </div>
                );

            case "status":
                return isOpen ? (
                    <Chip
                        size="sm"
                        color="success"
                        variant="flat"
                        className="text-[10px] sm:text-xs font-semibold"
                    >
                        Open
                    </Chip>
                ) : (
                    <Chip
                        size="sm"
                        color="default"
                        variant="flat"
                        className="text-[10px] sm:text-xs text-default-400"
                    >
                        Closed
                    </Chip>
                );

            case "unread":
                return isUnread ? (
                    <Chip
                        size="sm"
                        color="warning"
                        variant="flat"
                        className="text-[10px] sm:text-xs font-semibold"
                    >
                        {thread.unreadUserMessages} New
                    </Chip>
                ) : (
                    <Chip
                        size="sm"
                        color="default"
                        variant="flat"
                        className="text-[10px] sm:text-xs text-default-400"
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
                    <div className="flex gap-3">
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

                        <Tooltip
                            content={
                                isOpen ? "Close thread" : "Thread already closed"
                            }
                        >
                            <Button
                                isIconOnly
                                size="sm"
                                variant={isUnread ? "solid" : "flat"}
                                color="danger"
                                isDisabled={!isOpen}
                                onPress={() => handleCloseClick(thread)}
                            >
                                <Icon icon="ic:outline-lock" width={16} />
                            </Button>
                        </Tooltip>
                    </div>
                );

            default:
                return null;
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

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
                                    {isFiltering
                                        ? `${filteredThreads.length} result${filteredThreads.length !== 1 ? "s" : ""} of ${total} total`
                                        : `${total} total conversations`}
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

                        {/* SEARCH + FILTER BAR */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                className="flex-1"
                                placeholder="Search by name, email, message or ID…"
                                size="lg"
                                value={searchQuery}
                                onValueChange={handleSearchChange}
                                startContent={
                                    <Icon
                                        icon="mdi:magnify"
                                        className="text-default-400 shrink-0"
                                        width={18}
                                    />
                                }
                                endContent={
                                    searchQuery ? (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="text-default-400 hover:text-default-600 transition-colors"
                                        >
                                            <Icon icon="mdi:close-circle" width={16} />
                                        </button>
                                    ) : null
                                }
                                isClearable={false}
                            />

                            <Select
                                disallowEmptySelection
                                className="w-full sm:w-36"
                                label="Status"
                                selectedKeys={[statusFilter]}
                                size="sm"
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as StatusFilter);
                                    setPage(1);
                                }}
                                startContent={
                                    <Icon
                                        icon="mdi:filter-outline"
                                        className="text-default-400 shrink-0"
                                        width={16}
                                    />
                                }
                            >
                                <SelectItem key="all">All</SelectItem>
                                <SelectItem key="open">Open</SelectItem>
                                <SelectItem key="closed">Closed</SelectItem>
                            </Select>

                            {/* Clear filters button — only visible when a filter is active */}
                            {isFiltering && (
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="default"
                                    startContent={<Icon icon="mdi:filter-off-outline" width={16} />}
                                    onPress={() => {
                                        clearSearch();
                                        setStatusFilter("all");
                                    }}
                                    className="shrink-0"
                                >
                                    Clear
                                </Button>
                            )}
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
                                    items={loading ? [] : filteredThreads}
                                    emptyContent={
                                        loading ? null : isFiltering ? (
                                            <div className="flex flex-col items-center gap-1 py-6">
                                                <Icon
                                                    icon="mdi:magnify-close"
                                                    className="text-default-300"
                                                    width={32}
                                                />
                                                <span className="text-sm text-default-400">
                                                    No threads match your search.
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    color="primary"
                                                    onPress={() => {
                                                        clearSearch();
                                                        setStatusFilter("all");
                                                    }}
                                                >
                                                    Clear filters
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-default-400">
                                                No support threads found.
                                            </span>
                                        )
                                    }
                                >
                                    {filteredThreads.map((thread) => (
                                        <TableRow key={thread.threadId}>
                                            {(columnKey) => (
                                                <TableCell>
                                                    {renderCell(
                                                        thread,
                                                        columnKey as string,
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
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

                            {/* Hide pagination when filtering client-side — results are already local */}
                            {!isFiltering && (
                                <Pagination
                                    showControls
                                    color="primary"
                                    isDisabled={loading}
                                    page={page}
                                    total={Math.max(totalPages, 1)}
                                    onChange={setPage}
                                />
                            )}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* THREAD DETAIL MODAL */}
            <ThreadDetailModal
                isOpen={modalOpen}
                onOpenChange={setModalOpen}
                selectedThread={selectedThread}
                onThreadClosed={() => fetchThreads(page, limit)}
            />

            {/* CLOSE THREAD CONFIRMATION MODAL */}
            <Modal
                isOpen={isConfirmOpen}
                onClose={onConfirmClose}
                size="sm"
                placement="center"
                isDismissable={!isClosing}
                hideCloseButton={isClosing}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-danger-100 dark:bg-danger-900/30 shrink-0">
                                        <Icon
                                            icon="ic:outline-lock"
                                            className="text-danger"
                                            width={20}
                                        />
                                    </div>
                                    <span>Close Thread</span>
                                </div>
                            </ModalHeader>

                            <ModalBody>
                                {threadToClose && (
                                    <div className="mt-2 p-3 rounded-lg bg-default-100 dark:bg-default-50/10 space-y-1">
                                        <p className="text-sm text-default-600">
                                            Are you sure you want to close the chat with{" "}
                                            <span className="font-semibold text-foreground">
                                                {threadToClose.user.name}
                                            </span>
                                            ?
                                        </p>
                                        <p className="text-xs text-default-400 mt-1">
                                            Once closed, no further replies can be sent
                                            unless the thread is reopened.
                                        </p>
                                    </div>
                                )}
                            </ModalBody>

                            <ModalFooter>
                                <Button
                                    variant="flat"
                                    color="default"
                                    onPress={onClose}
                                    isDisabled={isClosing}
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleConfirmClose}
                                    isLoading={isClosing}
                                    size="sm"
                                    variant="flat"
                                    startContent={
                                        !isClosing ? (
                                            <Icon icon="ic:outline-lock" width={16} />
                                        ) : undefined
                                    }
                                >
                                    {isClosing ? "Closing..." : "Close Thread"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}