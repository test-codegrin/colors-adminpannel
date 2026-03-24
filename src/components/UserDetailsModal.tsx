"use client";

import type { UpdateUserPayload, User } from "@/types/user.types";

import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

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
  isUpdatingUser: boolean;
  onUpdateUser: (payload: UpdateUserPayload) => Promise<void>;
}

interface EditFormValues {
  name: string;
  email: string;
  mobile: string;
  picture: string;
  is_paid: boolean;
  password: string;
}

interface EditFormErrors {
  email: string;
  mobile: string;
}

const initialEditFormValues: EditFormValues = {
  name: "",
  email: "",
  mobile: "",
  picture: "",
  is_paid: false,
  password: "",
};

const initialEditFormErrors: EditFormErrors = {
  email: "",
  mobile: "",
};

/* ---------- Component ---------- */

export default function UserDetailsModal({
  isOpen,
  onOpenChange,
  selectedUser,
  isUserLoading,
  isUpdatingUser,
  onUpdateUser,
}: Props) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formValues, setFormValues] = useState<EditFormValues>(
    initialEditFormValues,
  );
  const [formErrors, setFormErrors] = useState<EditFormErrors>(
    initialEditFormErrors,
  );

  useEffect(() => {
    if (!selectedUser) {
      setFormValues(initialEditFormValues);
      setFormErrors(initialEditFormErrors);
      setIsEditMode(false);

      return;
    }

    setFormValues({
      name: typeof selectedUser.name === "string" ? selectedUser.name : "",
      email: typeof selectedUser.email === "string" ? selectedUser.email : "",
      mobile:
        typeof selectedUser.mobile === "string" ? selectedUser.mobile : "",
      picture:
        typeof selectedUser.picture === "string" ? selectedUser.picture : "",
      is_paid: isUserPaid(selectedUser.is_paid),
      password: "",
    });
    setFormErrors(initialEditFormErrors);
    setIsEditMode(false);
  }, [selectedUser]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setFormErrors(initialEditFormErrors);
    }
  }, [isOpen]);

  const handleFieldChange = (
    field: keyof EditFormValues,
    value: string | boolean,
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditCancel = () => {
    if (!selectedUser) {
      setIsEditMode(false);

      return;
    }

    setFormValues({
      name: typeof selectedUser.name === "string" ? selectedUser.name : "",
      email: typeof selectedUser.email === "string" ? selectedUser.email : "",
      mobile:
        typeof selectedUser.mobile === "string" ? selectedUser.mobile : "",
      picture:
        typeof selectedUser.picture === "string" ? selectedUser.picture : "",
      is_paid: isUserPaid(selectedUser.is_paid),
      password: "",
    });
    setFormErrors(initialEditFormErrors);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedUser) {
      return;
    }

    const email = formValues.email.trim();
    const mobile = formValues.mobile.trim();
    const nextErrors: EditFormErrors = { ...initialEditFormErrors };

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (mobile && !/^\+?\d{10,15}$/.test(mobile)) {
      nextErrors.mobile = "Enter a valid mobile number";
    }

    setFormErrors(nextErrors);

    if (nextErrors.email || nextErrors.mobile) {
      return;
    }

    const currentName =
      typeof selectedUser.name === "string" ? selectedUser.name.trim() : "";
    const currentEmail =
      typeof selectedUser.email === "string" ? selectedUser.email.trim() : "";
    const currentMobile =
      typeof selectedUser.mobile === "string" ? selectedUser.mobile.trim() : "";
    const currentPicture =
      typeof selectedUser.picture === "string"
        ? selectedUser.picture.trim()
        : "";
    const currentIsPaid = isUserPaid(selectedUser.is_paid);

    const payload: UpdateUserPayload = {};
    const nextName = formValues.name.trim();
    const nextEmail = formValues.email.trim();
    const nextMobile = formValues.mobile.trim();
    const nextPicture = formValues.picture.trim();
    const nextPassword = formValues.password;

    if (nextName !== currentName) payload.name = nextName;
    if (nextEmail !== currentEmail) payload.email = nextEmail;
    if (nextMobile !== currentMobile) payload.mobile = nextMobile;
    if (nextPicture !== currentPicture) payload.picture = nextPicture;
    if (formValues.is_paid !== currentIsPaid)
      payload.is_paid = formValues.is_paid;
    if (nextPassword.trim()) payload.password = nextPassword;

    if (Object.keys(payload).length === 0) {
      addToast({
        title: "No Changes",
        description: "Update at least one field before saving.",
        color: "warning",
        radius: "full",
        timeout: 3000,
      });

      return;
    }

    try {
      await onUpdateUser(payload);
      setFormValues((prev) => ({ ...prev, password: "" }));
      setIsEditMode(false);
    } catch {
      // Errors are surfaced by the parent toast.
    }
  };

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      isDismissable={false}
      isOpen={isOpen}
      size="md"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <h3 className="text-base font-semibold">User Details</h3>
              <div className="flex items-center gap-2">
                {selectedUser && !isUserLoading ? (
                  <Button
                    isIconOnly
                    color={isEditMode ? "warning" : "default"}
                    isDisabled={isUpdatingUser}
                    radius="full"
                    variant={isEditMode ? "flat" : "light"}
                    onPress={() => {
                      if (isEditMode) {
                        handleEditCancel();
                      } else {
                        setIsEditMode(true);
                      }
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      icon={isEditMode ? "mdi:close" : "mdi:pencil"}
                    />
                  </Button>
                ) : null}

                <Button
                  isIconOnly
                  radius="full"
                  variant="light"
                  onPress={onClose}
                >
                  <Icon className="w-5 h-5" icon="mdi:close" />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="py-5">
              {isUserLoading ? (
                <Loader />
              ) : selectedUser ? (
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <Avatar
                      isBordered
                      className="w-20 h-20 text-white text-xl font-semibold"
                      color="primary"
                      name={getInitials(selectedUser.name)}
                      radius="full"
                      src={selectedUser.picture || undefined}
                    />
                  </div>

                  <Input
                    isReadOnly={!isEditMode}
                    label="Full Name"
                    value={
                      isEditMode ? formValues.name : (selectedUser.name ?? "-")
                    }
                    variant="flat"
                    onValueChange={(value) => handleFieldChange("name", value)}
                  />

                  <Input
                    errorMessage={formErrors.email}
                    isInvalid={Boolean(formErrors.email)}
                    isReadOnly={!isEditMode}
                    label="Email"
                    value={
                      isEditMode
                        ? formValues.email
                        : (selectedUser.email ?? "-")
                    }
                    variant="flat"
                    onValueChange={(value) => handleFieldChange("email", value)}
                  />

                  <Input
                    errorMessage={formErrors.mobile}
                    isInvalid={Boolean(formErrors.mobile)}
                    isReadOnly={!isEditMode}
                    label="Mobile"
                    value={
                      isEditMode
                        ? formValues.mobile
                        : (selectedUser.mobile ?? "-")
                    }
                    variant="flat"
                    onValueChange={(value) =>
                      handleFieldChange("mobile", value)
                    }
                  />

                  <Input
                    isReadOnly={!isEditMode}
                    label="Picture URL"
                    value={
                      isEditMode
                        ? formValues.picture
                        : (selectedUser.picture ?? "-")
                    }
                    variant="flat"
                    onValueChange={(value) =>
                      handleFieldChange("picture", value)
                    }
                  />

                  <Input
                    isReadOnly
                    classNames={{
                      input: selectedUser.google_id
                        ? "text-success font-medium"
                        : "text-danger font-medium",
                    }}
                    label="Google Account"
                    value={selectedUser.google_id ? "Linked" : "Not Linked"}
                    variant="flat"
                  />

                  {isEditMode ? (
                    <Select
                      disallowEmptySelection
                      label="Payment Status"
                      selectedKeys={[formValues.is_paid ? "paid" : "unpaid"]}
                      onChange={(event) =>
                        handleFieldChange(
                          "is_paid",
                          event.target.value === "paid",
                        )
                      }
                    >
                      <SelectItem key="paid">Paid</SelectItem>
                      <SelectItem key="unpaid">Unpaid</SelectItem>
                    </Select>
                  ) : (
                    <Input
                      isReadOnly
                      classNames={{
                        input: isUserPaid(selectedUser.is_paid)
                          ? "text-success font-medium"
                          : "text-danger font-medium",
                      }}
                      label="Payment Status"
                      value={
                        isUserPaid(selectedUser.is_paid) ? "Paid" : "Unpaid"
                      }
                      variant="flat"
                    />
                  )}

                  {isEditMode ? (
                    <Input
                      label="New Password"
                      placeholder="Leave blank to keep current password"
                      type="password"
                      value={formValues.password}
                      variant="flat"
                      onValueChange={(value) =>
                        handleFieldChange("password", value)
                      }
                    />
                  ) : null}

                  <Input
                    isReadOnly
                    label="Created At"
                    value={formatDate(selectedUser.created_at)}
                    variant="flat"
                  />

                  {isEditMode ? (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        isDisabled={isUpdatingUser}
                        variant="flat"
                        onPress={handleEditCancel}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        isLoading={isUpdatingUser}
                        onPress={handleSave}
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : null}
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
