"use client";

import type { ContactMessage } from "@/types/contactMessages.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
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
  Tooltip,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";

import {
  deleteContactMessageById,
  getContactMessages,
  getContactMessagesErrorMessage,
} from "@/api/contactMessages.api";
import ContactMessageModal from "@/components/ContactMessageModal";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/* ---------- Component ---------- */

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(
    null,
  );
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<{
    id: number;
    subject: string;
  } | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange,
    onClose: closeDeleteModal,
  } = useDisclosure();

  const handleView = (id: number) => {
    setSelectedId(id);
    onOpen();
  };

  const handleOpenDeleteModal = (id: number, subject?: string) => {
    setPendingDeleteMessage({
      id,
      subject: subject?.trim() ? subject : "this message",
    });
    openDeleteModal();
  };

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await getContactMessages(page, limit);
      const serverTotalPages =
        res.pagination?.total_pages ?? res.pagination?.totalPages ?? 1;

      setMessages(res.data ?? []);
      setTotalPages(Math.max(serverTotalPages, 1));
    } catch (err) {
      setError(getContactMessagesErrorMessage(err));
      setMessages([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleDeleteMessage = async () => {
    if (!pendingDeleteMessage) {
      return;
    }

    const id = pendingDeleteMessage.id;

    setDeletingMessageId(id);

    try {
      const result = await deleteContactMessageById(id);

      addToast({
        title: "Message Deleted",
        description: result.message ?? "Contact message deleted successfully.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });

      if (messages.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchMessages();
      }
    } catch (err) {
      addToast({
        title: "Delete Failed",
        description: getContactMessagesErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setDeletingMessageId(null);
      setPendingDeleteMessage(null);
      closeDeleteModal();
    }
  };

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Contact Messages</h2>
              <p className="text-sm text-default-500">
                Manage and review contact submissions
              </p>
            </div>

            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width="18" />
              }
              variant="flat"
              onPress={fetchMessages}
            >
              Refresh
            </Button>
          </div>

          {/* Error */}
          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Table */}
          <Table removeWrapper aria-label="Contact messages table">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Sender</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Subject</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>

            <TableBody
              emptyContent="No contact messages"
              isLoading={isLoading}
              items={messages}
              loadingContent={<Spinner label="Loading..." />}
            >
              {(msg: ContactMessage) => (
                <TableRow key={msg.contact_message_id}>
                  <TableCell>
                    <span className="font-mono text-xs">
                      #{msg.contact_message_id}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={msg.name} size="sm" />
                      <span>{msg.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>{msg.email}</TableCell>

                  <TableCell>
                    <div>{msg.subject}</div>
                  </TableCell>

                  <TableCell>{formatDate(msg.created_at)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip content="View message">
                        <Button
                          isIconOnly
                          size="sm"
                          startContent={
                            <Icon height={16} icon="mdi:eye" width={16} />
                          }
                          variant="flat"
                          onPress={() => handleView(msg.contact_message_id)}
                        />
                      </Tooltip>

                      <Tooltip content="Delete message">
                        <Button
                          isIconOnly
                          color="danger"
                          isDisabled={deletingMessageId !== null}
                          isLoading={
                            deletingMessageId === msg.contact_message_id
                          }
                          size="sm"
                          startContent={
                            deletingMessageId !== msg.contact_message_id ? (
                              <Icon
                                height={16}
                                icon="mdi:delete-outline"
                                width={16}
                              />
                            ) : undefined
                          }
                          variant="flat"
                          onPress={() =>
                            handleOpenDeleteModal(
                              msg.contact_message_id,
                              msg.subject,
                            )
                          }
                        />
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex w-full items-end justify-between gap-4">
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

            <div className="flex justify-end w-full">
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

      <ContactMessageModal
        isOpen={isOpen}
        messageId={selectedId}
        onOpenChange={onOpenChange}
      />

      <Modal
        hideCloseButton={deletingMessageId !== null}
        isDismissable={deletingMessageId === null}
        isOpen={isDeleteModalOpen}
        onOpenChange={onDeleteModalOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            Delete Message
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {pendingDeleteMessage?.subject ?? "this message"}
              </span>
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={deletingMessageId !== null}
              variant="flat"
              onPress={closeDeleteModal}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deletingMessageId === pendingDeleteMessage?.id}
              onPress={handleDeleteMessage}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
