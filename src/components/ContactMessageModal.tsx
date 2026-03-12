"use client";

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
import type { ContactMessage } from "@/types/contactMessages.types";

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
      backdrop="blur"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      hideCloseButton
      isDismissable={false}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Contact Message</h3>

              <Button
                isIconOnly
                variant="light"
                radius="full"
                onPress={onClose}
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
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
                      name={getInitials(message.name)}
                      color="primary"
                      radius="full"
                      className="w-20 h-20 text-white text-xl font-semibold"
                    />
                  </div>

                  <Input
                    label="Full Name"
                    value={message.name ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Email"
                    value={message.email ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Subject"
                    value={message.subject ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Message"
                    value={message.description ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  {/* <Textarea
                    label="Message"
                    value={message.description ?? "-"}
                    variant="flat"
                    isReadOnly
                    minRows={3}
                  /> */}

                  <Input
                    label="Received At"
                    value={formatDate(message.created_at)}
                    variant="flat"
                    isReadOnly
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