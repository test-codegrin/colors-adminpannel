"use client";

import type { BetaPlan } from "@/types/betaPlans.types";
import type { PaginationPayload } from "@/types/pagination.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Input,
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
import { useEffect, useState, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";

import {
  deleteBetaPlanById,
  getBetaPlans,
  getBetaPlansErrorMessage,
  isBetaPlansRequestCancelled,
} from "@/api/betaPlans.api";

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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange,
    onClose: closeDeleteModal,
  } = useDisclosure();

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchBetaPlans = useCallback(
    async (overrideQuery?: string) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError("");

      try {
        const res = await getBetaPlans({
          page,
          limit,
          search: overrideQuery ?? committedQuery,
          signal: abortRef.current.signal,
        });

        setBetaPlans(res.data ?? []);
        setPagination(res.pagination);
      } catch (err) {
        if (isBetaPlansRequestCancelled(err)) return;
        setError(getBetaPlansErrorMessage(err));
        setBetaPlans([]);
        setPagination({ total: 0, page, limit, total_pages: 0, totalPages: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, committedQuery],
  );

  useEffect(() => {
    void fetchBetaPlans();
    return () => abortRef.current?.abort();
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

  // ─── Search handlers ──────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1);
      setCommittedQuery(value);
    }, 400);
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchQuery("");
    setCommittedQuery("");
    setPage(1);
  }

  // ─── Delete handlers ──────────────────────────────────────────────────────
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
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
      await fetchBetaPlans();
    } catch (err) {
      addToast({
        title: "Delete Failed",
        description: getBetaPlansErrorMessage(err),
        color: "default",
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

  const isSearchActive = committedQuery.trim() !== "";

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6 p-4 sm:p-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Beta Plans</h2>
              <p className="text-sm text-default-500">
                {isSearchActive
                  ? `${pagination.total} result${pagination.total !== 1 ? "s" : ""} for "${committedQuery}"`
                  : "Manage and review beta plan submissions"}
              </p>
            </div>

            <div className="flex justify-start sm:justify-end">
              <Button
                isLoading={isLoading}
                size="sm"
                startContent={
                  !isLoading && <Icon icon="solar:refresh-bold" width={16} />
                }
                variant="flat"
                onPress={() => fetchBetaPlans()}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <Input
              className="flex-1"
              placeholder="Search by name, email or user ID…"
              size="md"
              value={searchQuery}
              onValueChange={handleSearchChange}
              startContent={
                isLoading && isSearchActive ? (
                  <Spinner size="sm" color="default" />
                ) : (
                  <Icon
                    icon="mdi:magnify"
                    className="text-default-400 shrink-0"
                    width={18}
                  />
                )
              }
              endContent={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-default-400 hover:text-default-600 transition-colors"
                  >
                    <Icon icon="mdi:close-circle" width={16} />
                  </button>
                ) : null
              }
              isClearable={false}
            />
          </div>

          {/* Error */}
          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Table */}
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
                isLoading={isLoading}
                loadingContent={<Spinner label="Loading..." />}
                emptyContent={
                  isSearchActive ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Icon
                        icon="mdi:magnify-close"
                        className="text-default-300"
                        width={32}
                      />
                      <span className="text-sm text-default-400">
                        No beta plans match &ldquo;{committedQuery}&rdquo;.
                      </span>
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={clearSearch}
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    "No beta plans"
                  )
                }
                items={betaPlans}
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

                    <TableCell className="break-all">
                      {betaPlan.email}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip content="Delete beta plan">
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="flat"
                            isDisabled={deletingId !== null}
                            isLoading={deletingId === betaPlan.beta_claim_id}
                            onPress={() =>
                              handleOpenDeleteModal(
                                betaPlan.beta_claim_id,
                                betaPlan.name,
                              )
                            }
                          >
                            {deletingId !== betaPlan.beta_claim_id && (
                              <Icon icon="mdi:delete-outline" width={16} />
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

          {/* Pagination — resets to page 1 on new search */}
          {!isLoading && pagination.total > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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