"use client";

import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Progress,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import type { User } from "@/types/user.types";
import Loader from "./Loader";

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

function isUserPaid(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

/* ---------- Props ---------- */

interface Props {
  isOpen: boolean;
  onOpenChange: () => void;
  selectedUser: User | null;
  isUserLoading: boolean;
}

/* ---------- Component ---------- */

export default function UserDetailsModal({
  isOpen,
  onOpenChange,
  selectedUser,
  isUserLoading,
}: Props) {
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
              <h3 className="text-base font-semibold">User Details</h3>
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
              {isUserLoading ? (
                <Loader />
              ) : selectedUser ? (
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <Avatar
                      src={selectedUser.picture || undefined}
                      name={getInitials(selectedUser.name)}
                      isBordered
                      color="primary"
                      radius="full"
                      className="w-20 h-20 text-white text-xl font-semibold"
                    />
                  </div>

                  <Input
                    label="Full Name"
                    value={selectedUser.name ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Email"
                    value={selectedUser.email ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Mobile"
                    value={selectedUser.mobile ?? "-"}
                    variant="flat"
                    isReadOnly
                  />

                  <Input
                    label="Google Account"
                    value={selectedUser.google_id ? "Linked" : "Not Linked"}
                    variant="flat"
                    isReadOnly
                    classNames={{
                      input: selectedUser.google_id
                        ? "text-success font-medium"
                        : "text-danger font-medium",
                    }}
                  />

                  <Input
                    label="Payment Status"
                    value={
                      isUserPaid(selectedUser.is_paid)
                        ? "Paid"
                        : "Unpaid"
                    }
                    variant="flat"
                    isReadOnly
                    classNames={{
                      input: isUserPaid(selectedUser.is_paid)
                        ? "text-success font-medium"
                        : "text-danger font-medium",
                    }}
                  />

                  <Input
                    label="Created At"
                    value={formatDate(selectedUser.created_at)}
                    variant="flat"
                    isReadOnly
                  />
                </div>
              ) : (
                <div className="text-center text-default-400 py-6">
                  No data found
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
