"use client";

import { useEffect, useRef, useState } from "react";
import {
    getThreadDetail,
    replyToThread,
    closeThread,
    getSupportErrorMessage,
    type SupportThread,
    type ThreadDetail,
} from "@/api/chat.api";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Textarea,
    Spinner,
    Avatar,
    Divider,
    Chip,
    Button,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
    message: string;
    senderType: "admin" | "user";
    createdAt: string;
    senderName: string;
}

function MessageBubble({ message, senderType, createdAt, senderName }: BubbleProps) {
    const isAdmin = senderType === "admin";
    return (
        <div className={`flex gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
            <Avatar
                name={isAdmin ? "A" : senderName}
                size="sm"
                color={isAdmin ? "primary" : "secondary"}
                className="shrink-0 mt-1 w-7 h-7 text-xs"
            />
            <div className={`flex flex-col gap-1 max-w-[72%] sm:max-w-[65%] ${isAdmin ? "items-end" : "items-start"}`}>
                <div
                    className={`
                        px-3.5 py-2.5 text-sm leading-relaxed break-words
                        ${isAdmin
                            ? "bg-primary text-white rounded-2xl rounded-tr-md"
                            : "bg-secondary text-white rounded-2xl rounded-tl-md"
                        }
                    `}
                >
                    {message}
                </div>
                <span className="text-[10px] text-default-400 px-1">
                    {isAdmin ? "Admin" : senderName} · {formatChatTime(createdAt)}
                </span>
            </div>
        </div>
    );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, value }: { icon: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-default-600">
            <Icon icon={icon} width={14} height={14} className="text-default-400 shrink-0" />
            <span className="truncate">{value}</span>
        </div>
    );
}

// ─── Confirm Close Modal ──────────────────────────────────────────────────────

interface ConfirmCloseModalProps {
    isOpen: boolean;
    closing: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    userName: string;
}

function ConfirmCloseModal({ isOpen, closing, onConfirm, onCancel, userName }: ConfirmCloseModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => { if (!open) onCancel(); }}
            size="sm"
            placement="center"
            isDismissable={!closing}
            hideCloseButton={closing}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-danger-100 shrink-0">
                                    <Icon icon="mdi:lock-outline" width={18} className="text-danger" />
                                </div>
                                <span className="text-base font-semibold">Close Chat</span>
                            </div>
                        </ModalHeader>

                        <ModalBody className="pt-0 pb-2">
                            <p className="text-sm text-default-600">
                                Are you sure you want to close the chat with{" "}
                                <span className="font-semibold text-foreground">{userName}</span>?
                            </p>
                            <p className="text-xs text-default-400 mt-1">
                                Once closed, no further replies can be sent unless the thread is reopened.
                            </p>
                        </ModalBody>

                        <ModalFooter className="pt-2">
                            <Button
                                size="sm"
                                variant="flat"
                                color="default"
                                onPress={onCancel}
                                isDisabled={closing}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                color="danger"
                                onPress={onConfirm}
                                isLoading={closing}
                                startContent={!closing ? <Icon icon="mdi:lock-outline" width={14} /> : null}
                            >
                                Yes, Close Chat
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ThreadDetailModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedThread: SupportThread | null;
    onThreadClosed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThreadDetailModal({
    isOpen,
    onOpenChange,
    selectedThread,
    onThreadClosed,
}: ThreadDetailModalProps) {
    const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);

    // Close confirmation state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [closing, setClosing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load thread detail whenever the modal opens with a thread
    useEffect(() => {
        if (isOpen && selectedThread) {
            setThreadDetail(null);
            setReplyText("");
            setDetailLoading(true);
            getThreadDetail(selectedThread.threadId)
                .then((res) => setThreadDetail(res.data))
                .catch((err) =>
                    addToast({ title: "Error", description: getSupportErrorMessage(err), color: "danger" })
                )
                .finally(() => setDetailLoading(false));
        }
    }, [isOpen, selectedThread]);

    // Auto-scroll to latest message
    useEffect(() => {
        if (isOpen && !detailLoading) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        }
    }, [threadDetail, isOpen, detailLoading]);

    async function handleReply() {
        if (!selectedThread || !replyText.trim()) return;
        setReplying(true);
        try {
            await replyToThread(selectedThread.threadId, replyText.trim());
            setReplyText("");
            const res = await getThreadDetail(selectedThread.threadId);
            setThreadDetail(res.data);
            addToast({ title: "Sent", description: "Reply sent successfully.", color: "success" });
        } catch (err) {
            addToast({ title: "Error", description: getSupportErrorMessage(err), color: "danger" });
        } finally {
            setReplying(false);
        }
    }

    async function handleConfirmClose() {
        if (!selectedThread) return;
        setClosing(true);
        try {
            await closeThread(selectedThread.threadId);
            // Update local thread detail status to closed
            setThreadDetail((prev) => prev ? { ...prev, status: 0 } : prev);
            setConfirmOpen(false);
            addToast({ title: "Closed", description: "Thread has been closed.", color: "success" });
            onThreadClosed();
        } catch (err) {
            addToast({ title: "Error", description: getSupportErrorMessage(err), color: "danger" });
        } finally {
            setClosing(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleReply();
        }
    }

    const isThreadOpen = threadDetail?.status === 1;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="2xl"
                scrollBehavior="inside"
                hideCloseButton
                placement="center"
                classNames={{
                    wrapper: "items-end sm:items-center p-0 sm:p-4",
                    base: [
                        "m-0 sm:m-4",
                        "max-h-[92dvh] sm:max-h-[88vh]",
                        "w-full sm:w-auto",
                        "rounded-t-2xl sm:rounded-2xl",
                        "flex flex-col",
                    ].join(" "),
                    body: "p-0 flex-1 overflow-hidden",
                    header: "shrink-0",
                    footer: "shrink-0",
                }}
            >
                <ModalContent className="flex flex-col h-full">
                    {() => (
                        <>
                            {/* ── Header ── */}
                            <ModalHeader className="flex flex-col gap-0 px-4 pt-4 pb-0">
                                {/* Drag handle for mobile */}
                                <div className="flex sm:hidden justify-center mb-3">
                                    <div className="w-10 h-1 rounded-full bg-default-300" />
                                </div>

                                <div className="flex items-start justify-between gap-3 w-full">
                                    {/* Left: avatar + user info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar
                                            name={selectedThread?.user.name}
                                            size="md"
                                            color="primary"
                                            className="shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold leading-tight truncate">
                                                {selectedThread?.user.name}
                                            </p>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <InfoRow icon="mdi:email-outline" value={selectedThread?.user.email ?? ""} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: status chip + close button */}
                                    <div className="flex items-center gap-2 mt-1 shrink-0">
                                        <Chip
                                            size="sm"
                                            color={threadDetail?.status === 1 ? "success" : "default"}
                                            variant="solid"
                                            classNames={{ content: "text-xs font-semibold text-white px-1" }}
                                        >
                                            {detailLoading ? "…" : threadDetail?.status === 1 ? "Open" : "Closed"}
                                        </Chip>

                                        {/* Close Chat Button — only when thread is open */}
                                        {isThreadOpen && !detailLoading && (
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                startContent={<Icon icon="mdi:lock-outline" width={14} />}
                                                onPress={() => setConfirmOpen(true)}
                                                className="text-xs h-7 px-2"
                                            >
                                                Close Chat
                                            </Button>
                                        )}

                                        <div className="bg-default-100 rounded-full p-1 cursor-pointer">
                                            <Icon icon="mdi:close" width={20} height={20} className="text-default-400 cursor-pointer" onClick={() => onOpenChange(false)} />
                                        </div>
                                    </div>
                                </div>

                                <Divider className="mt-3" />
                            </ModalHeader>

                            {/* ── Body: Messages ── */}
                            <ModalBody>
                                <div className="flex flex-col h-full scrollbar-hide overflow-y-auto">
                                    {detailLoading ? (
                                        <div className="flex flex-1 items-center justify-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <Spinner size="lg" color="primary" />
                                                <p className="text-sm text-default-400">Loading messages…</p>
                                            </div>
                                        </div>
                                    ) : (threadDetail?.messages ?? []).length === 0 ? (
                                        <div className="flex flex-1 flex-col items-center justify-center py-20 gap-2">
                                            <Icon icon="mdi:message-off-outline" width={36} height={36} className="text-default-300" />
                                            <p className="text-sm text-default-400">No messages yet.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4 px-4 py-4">
                                            {(threadDetail?.messages ?? []).map((msg, idx, arr) => {
                                                const msgDate = new Date(msg.createdAt).toDateString();
                                                const prevDate = idx > 0 ? new Date(arr[idx - 1].createdAt).toDateString() : null;
                                                const showDateSep = msgDate !== prevDate;

                                                return (
                                                    <div key={idx}>
                                                        {showDateSep && (
                                                            <div className="flex items-center gap-3 my-1">
                                                                <div className="flex-1 h-px bg-divider" />
                                                                <span className="text-[10px] text-default-400 whitespace-nowrap px-1">
                                                                    {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                                                                        day: "2-digit", month: "short", year: "numeric",
                                                                    })}
                                                                </span>
                                                                <div className="flex-1 h-px bg-divider" />
                                                            </div>
                                                        )}
                                                        <MessageBubble
                                                            message={msg.message}
                                                            senderType={msg.senderType}
                                                            createdAt={msg.createdAt}
                                                            senderName={selectedThread?.user.name ?? "User"}
                                                        />
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            </ModalBody>

                            {/* ── Footer ── */}
                            <ModalFooter className="flex flex-col gap-3 px-4 pt-3 pb-4 border-t border-divider">
                                {isThreadOpen && (
                                    <div className="flex gap-2 w-full items-end">
                                        <Textarea
                                            placeholder="Type a reply… (Enter to send)"
                                            minRows={1}
                                            maxRows={4}
                                            value={replyText}
                                            onValueChange={setReplyText}
                                            onKeyDown={handleKeyDown}
                                            isDisabled={replying}
                                            classNames={{
                                                base: "flex-1",
                                                inputWrapper: "shadow-none",
                                            }}
                                            variant="bordered"
                                            radius="lg"
                                        />
                                        <Button
                                            color="primary"
                                            isIconOnly
                                            isLoading={replying}
                                            isDisabled={!replyText.trim() || replying}
                                            onPress={handleReply}
                                            radius="full"
                                            className="mb-0.5 w-10 h-10 min-w-10"
                                            aria-label="Send reply"
                                        >
                                            {!replying && <Icon icon="mdi:send" width={16} height={16} />}
                                        </Button>
                                    </div>
                                )}

                                {!isThreadOpen && !detailLoading && (
                                    <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-default-100 text-default-500 text-xs">
                                        <Icon icon="mdi:lock-outline" width={13} height={13} />
                                        This thread is closed. Reopen to reply.
                                    </div>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* ── Confirm Close Popup ── */}
            <ConfirmCloseModal
                isOpen={confirmOpen}
                closing={closing}
                onConfirm={handleConfirmClose}
                onCancel={() => setConfirmOpen(false)}
                userName={selectedThread?.user.name ?? "this user"}
            />
        </>
    );
}