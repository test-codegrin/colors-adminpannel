"use client";

import type { ContactMessage } from "@/types/contactMessages.types";

import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

import Loader from "@/components/Loader";
import { getContactMessageById } from "@/api/contactMessages.api";

/* ---------- Utility ---------- */

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getInitials(name?: string): string {
  if (!name) return "U";

  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ---------- Props ---------- */

interface Props {
  isOpen: boolean;
  onOpenChange: () => void;
  messageId: number | null;
}

/* ---------- Component ---------- */

export default function ContactMessageModal({
  isOpen,
  onOpenChange,
  messageId,
}: Props) {
  const [message, setMessage] = useState<ContactMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------- Fetch Message ---------- */

  useEffect(() => {
    if (!messageId) return;

    const fetchMessage = async () => {
      try {
        setIsLoading(true);

        const data = await getContactMessageById(messageId);

        setMessage(data);
      } catch (error) {
        console.error("Failed to load message", error);
        setMessage(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessage();
  }, [messageId]);

  /* ---------- Render ---------- */

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      placement="center"
      isDismissable={false}
      isOpen={isOpen}
      size="md"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Contact Message</h3>

              <Button
                isIconOnly
                radius="full"
                variant="light"
                onPress={onClose}
              >
                <Icon className="w-5 h-5" icon="mdi:close" />
              </Button>
            </ModalHeader>

            <ModalBody className="py-5">
              {isLoading ? (
                <Loader />
              ) : message ? (
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <Avatar
                      className="w-20 h-20 text-white text-xl font-semibold"
                      color="primary"
                      name={getInitials(message.name)}
                      radius="full"
                    />
                  </div>

                  <Input
                    isReadOnly
                    label="Full Name"
                    value={message.name ?? "-"}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="Email"
                    value={message.email ?? "-"}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="Subject"
                    value={message.subject ?? "-"}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="Message"
                    value={message.description ?? "-"}
                    variant="flat"
                  />

                  {/* <Textarea
                    label="Message"
                    value={message.description ?? "-"}
                    variant="flat"
                    isReadOnly
                    minRows={3}
                  /> */}

                  <Input
                    isReadOnly
                    label="Received At"
                    value={formatDate(message.created_at)}
                    variant="flat"
                  />
                </div>
              ) : (
                <div className="text-center text-default-400 py-6">
                  No message found
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
