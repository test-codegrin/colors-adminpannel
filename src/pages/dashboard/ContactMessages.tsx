"use client";

import {
  Avatar,
  Button,
  Card,
  CardBody,
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
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
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
          <div className="flex w-full items-end justify-between gap-4">
            <Select
              label="Limit"
              size="sm"
              disallowEmptySelection
              selectedKeys={[String(limit)]}
              className="w-28"
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
                total={Math.max(totalPages, 1)}
                page={page}
                onChange={setPage}
                isDisabled={isLoading}
                showControls
                color="primary"
              />
            </div>
          </div>

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
