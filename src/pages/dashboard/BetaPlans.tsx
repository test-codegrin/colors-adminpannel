"use client";

import type { BetaPlan } from "@/types/betaPlans.types";

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
  deleteBetaPlanById,
  getBetaPlans,
  getBetaPlansErrorMessage,
} from "@/api/betaPlans.api";
import BetaPlanModal from "@/components/BetaPlanModal";

export default function BetaPlansPage() {
  const [betaPlans, setBetaPlans] = useState<BetaPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange,
    onClose: closeDeleteModal,
  } = useDisclosure();

  const fetchBetaPlans = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getBetaPlans();

      setBetaPlans(res.data ?? []);
    } catch (err) {
      setError(getBetaPlansErrorMessage(err));
      setBetaPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBetaPlans();
  }, [fetchBetaPlans]);

  const handleView = (id: number) => {
    setSelectedId(id);
    onOpen();
  };

  const handleOpenDeleteModal = (id: number, name?: string) => {
    setPendingDelete({ id, name: name?.trim() ? name : "this beta plan" });
    openDeleteModal();
  };

  const handleDeleteBetaPlan = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;

    setDeletingId(id);
    try {
      const result = await deleteBetaPlanById(id);

      addToast({
        title: "Beta Plan Deleted",
        description: result.message ?? "Beta plan deleted successfully.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });
      await fetchBetaPlans();
    } catch (err) {
      addToast({
        title: "Delete Failed",
        description: getBetaPlansErrorMessage(err),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
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
              <h2 className="text-xl font-semibold">Beta Plans</h2>
              <p className="text-sm text-default-500">
                Manage and review beta plan submissions
              </p>
            </div>
            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width="18" />
              }
              variant="flat"
              onPress={fetchBetaPlans}
            >
              Refresh
            </Button>
          </div>

          {/* Error */}
          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Table */}
          <Table removeWrapper aria-label="Beta plans table">
            <TableHeader>
              <TableColumn>User_Id</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>

            <TableBody
              emptyContent="No beta plans"
              isLoading={isLoading}
              items={betaPlans}
              loadingContent={<Spinner label="Loading..." />}
            >
              {(betaPlan: BetaPlan) => (
                <TableRow key={betaPlan.beta_claim_id}>
                  <TableCell>
                    <span className="font-mono text-xs">
                      #{betaPlan.user_id}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={betaPlan.name} size="sm" />
                      <span>{betaPlan.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>{betaPlan.email}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip content="View beta plan">
                        <Button
                          isIconOnly
                          size="sm"
                          startContent={
                            <Icon height={16} icon="mdi:eye" width={16} />
                          }
                          variant="flat"
                          onPress={() => handleView(betaPlan.beta_claim_id)}
                        />
                      </Tooltip>

                      <Tooltip content="Delete beta plan">
                        <Button
                          isIconOnly
                          color="danger"
                          isDisabled={deletingId !== null}
                          isLoading={deletingId === betaPlan.beta_claim_id}
                          size="sm"
                          startContent={
                            deletingId !== betaPlan.beta_claim_id ? (
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
                              betaPlan.beta_claim_id,
                              betaPlan.name,
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
        </CardBody>
      </Card>

      {/* View Modal */}
      <BetaPlanModal
        betaPlanId={selectedId}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isDismissable={false}
        isOpen={isDeleteModalOpen}
        size="sm"
        onOpenChange={onDeleteModalOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Icon
                  className="text-danger w-5 h-5"
                  icon="mdi:alert-circle-outline"
                />
                <span>Delete Beta Plan</span>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{pendingDelete?.name}</span>?
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  isDisabled={deletingId !== null}
                  variant="flat"
                  onPress={closeDeleteModal}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  isLoading={deletingId !== null}
                  onPress={handleDeleteBetaPlan}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
