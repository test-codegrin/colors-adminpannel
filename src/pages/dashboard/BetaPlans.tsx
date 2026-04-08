"use client";

import type { BetaPlan } from "@/types/betaPlans.types";
import type { PaginationPayload } from "@/types/pagination.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Pagination,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
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
  deleteBetaPlanById,
  getBetaPlans,
  getBetaPlansErrorMessage,
} from "@/api/betaPlans.api";
import BetaPlanModal from "@/components/BetaPlanModal";

export default function BetaPlansPage() {
  const [betaPlans, setBetaPlans] = useState<BetaPlan[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<PaginationPayload>({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
    totalPages: 0,
  });
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
      const res = await getBetaPlans({ page, limit });

      setBetaPlans(res.data ?? []);
      setPagination(res.pagination);
    } catch (err) {
      setError(getBetaPlansErrorMessage(err));
      setBetaPlans([]);
      setPagination({
        total: 0,
        page,
        limit,
        total_pages: 0,
        totalPages: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    void fetchBetaPlans();
  }, [fetchBetaPlans]);

  useEffect(() => {
    const nextTotalPages = Math.max(
      pagination.total_pages ?? pagination.totalPages ?? 0,
      0,
    );

    if (nextTotalPages > 0 && page > nextTotalPages) {
      setPage(nextTotalPages);
    }
  }, [page, pagination.totalPages, pagination.total_pages]);

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
        severity: "success",
        radius: "full",
        timeout: 3000,
      });
      await fetchBetaPlans();
    } catch (err) {
      addToast({
        title: "Delete Failed",
        description: getBetaPlansErrorMessage(err),
        severity: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
      closeDeleteModal();
    }
  };

  const totalPages = Math.max(
    pagination.total_pages ?? pagination.totalPages ?? 0,
    1,
  );

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6 p-4 sm:p-6">

          {/* ✅ Header Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <h2 className="text-lg sm:text-xl font-semibold">
                Beta Plans
              </h2>
              <p className="text-sm text-default-500">
                Manage and review beta plan submissions
              </p>
            </div>

            <div className="flex justify-start sm:justify-end">
              <Button
                isLoading={isLoading}
                size="sm"
                startContent={
                  !isLoading && (
                    <Icon icon="solar:refresh-bold" width={16} />
                  )
                }
                variant="flat"
                onPress={fetchBetaPlans}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-danger text-sm">{error}</p>}

          {/* ✅ Table Scroll Fix */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <Table
              removeWrapper
              aria-label="Beta plans table"
              className="min-w-[700px]"
            >
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
                        <span className="whitespace-nowrap">
                          {betaPlan.name}
                        </span>
                      </div>
                    </TableCell>

                    {/* ✅ Email wrap fix */}
                    <TableCell className="break-all">
                      {betaPlan.email}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip content="View beta plan">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            onPress={() =>
                              handleView(betaPlan.beta_claim_id)
                            }
                          >
                            <Icon icon="mdi:eye" width={16} />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Delete beta plan">
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="flat"
                            isDisabled={deletingId !== null}
                            isLoading={
                              deletingId === betaPlan.beta_claim_id
                            }
                            onPress={() =>
                              handleOpenDeleteModal(
                                betaPlan.beta_claim_id,
                                betaPlan.name,
                              )
                            }
                          >
                            {deletingId !== betaPlan.beta_claim_id && (
                              <Icon
                                icon="mdi:delete-outline"
                                width={16}
                              />
                            )}
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ✅ Pagination Responsive */}
          {!isLoading && pagination.total > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

              {/* Limit */}
              <div className="flex justify-start">
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
              </div>

              {/* Pagination */}
              <div className="flex justify-start sm:justify-end w-full">
                <Pagination
                  showControls
                  color="primary"
                  isDisabled={isLoading}
                  page={page}
                  total={totalPages}
                  onChange={setPage}
                />
              </div>
            </div>
          ) : null}

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
