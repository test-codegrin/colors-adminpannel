"use client";

import {
  Card,
  CardBody,
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
  Avatar,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useState, useCallback } from "react";
import {
  getContactMessages,
  getContactMessagesErrorMessage,
} from "@/api/contactMessages.api";

import type { ContactMessage } from "@/types/contactMessages.types";
import ContactMessageModal from "@/components/ContactMessageModal";
import { Icon } from "@iconify/react";

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
  const rowsPerPage = 10;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const handleView = (id: number) => {
    setSelectedId(id);
    onOpen();
  };

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await getContactMessages(page, rowsPerPage);
      setMessages(res.data ?? []);
    } catch (err) {
      setError(getContactMessagesErrorMessage(err));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const totalPages = messages.length < rowsPerPage ? page : page + 1;

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
              onPress={fetchMessages}
              isLoading={isLoading}
              startContent={!isLoading && <Icon icon="solar:refresh-bold" width="18" />}
              variant="flat"
              size="sm"
            >
              Refresh
            </Button>
          </div>

          {/* Error */}
          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Table */}
          <Table aria-label="Contact messages table" removeWrapper>

            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Sender</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Subject</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>View</TableColumn>
            </TableHeader>

            <TableBody
              isLoading={isLoading}
              items={messages}
              loadingContent={<Spinner label="Loading..." />}
              emptyContent="No contact messages"
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
                    <div>
                      {msg.subject}
                    </div>
                  </TableCell>

                  <TableCell>
                    {formatDate(msg.created_at)}
                  </TableCell>

                  {/* Eye Button */}
                  <TableCell>
                    <Tooltip content="View message">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => handleView(msg.contact_message_id)}
                        startContent={
                          <Icon icon="mdi:eye" width={16} height={16} />
                        }
                      >
                      </Button>
                    </Tooltip>
                  </TableCell>

                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                showControls
                color="primary"
              />
            </div>
          )}

        </CardBody>
      </Card>

      <ContactMessageModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        messageId={selectedId}
      />
    </>

  );
}