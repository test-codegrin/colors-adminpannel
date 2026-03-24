"use client";

import type {
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/types/subscriptionPlan.types";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAsyncList } from "@react-stately/data";
import { useEffect, useRef, useState } from "react";

import {
  createSubscriptionPlan,
  deleteSubscriptionPlanById,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  getSubscriptionPlansErrorMessage,
  updateSubscriptionPlanById,
} from "@/api/subscriptionPlans.api";

interface PlanFormState {
  name: string;
  price: string;
  description: string;
  is_beta: boolean;
  is_active: boolean;
}

const defaultFormState: PlanFormState = {
  name: "",
  price: "",
  description: "",
  is_beta: false,
  is_active: true,
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function toBooleanFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toFlagNumber(value: boolean): number {
  return value ? 1 : 0;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function getFormFromPlan(plan: SubscriptionPlan): PlanFormState {
  return {
    name: plan.name ?? "",
    price: typeof plan.price === "number" ? String(plan.price) : "",
    description: plan.description ?? "",
    is_beta: toBooleanFlag(plan.is_beta),
    is_active: toBooleanFlag(plan.is_active),
  };
}

export default function SubscriptionPlans() {
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const hasMountedRef = useRef(false);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isViewLoading, setIsViewLoading] = useState(false);

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [formState, setFormState] = useState<PlanFormState>(defaultFormState);

  const [pendingDeletePlan, setPendingDeletePlan] =
    useState<SubscriptionPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);

  const {
    isOpen: isViewModalOpen,
    onOpen: onViewOpen,
    onOpenChange: onViewOpenChange,
  } = useDisclosure();
  const {
    isOpen: isFormModalOpen,
    onOpen: onFormOpen,
    onOpenChange: onFormOpenChange,
    onClose: onFormClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
    onClose: onDeleteClose,
  } = useDisclosure();

  const plansList = useAsyncList<SubscriptionPlan>({
    async load() {
      setError("");

      try {
        const result = await getSubscriptionPlans(page, limit);
        const serverTotalPages =
          result.pagination?.total_pages ??
          result.pagination?.totalPages ??
          result.totalPages ??
          (result.count && limit > 0 ? Math.ceil(result.count / limit) : 1);

        setTotalPages(Math.max(serverTotalPages, 1));

        return { items: result.plans ?? [] };
      } catch (fetchError) {
        setError(getSubscriptionPlansErrorMessage(fetchError));
        setTotalPages(1);

        return { items: [] };
      }
    },
  });

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;

      return;
    }

    plansList.reload();
  }, [page, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingPlanId(null);
  };

  const openCreateModal = () => {
    resetForm();
    onFormOpen();
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setFormState(getFormFromPlan(plan));
    onFormOpen();
  };

  const openViewModal = async (id: number) => {
    setSelectedPlan(null);
    setIsViewLoading(true);
    onViewOpen();

    try {
      const plan = await getSubscriptionPlanById(id);

      setSelectedPlan(plan);
    } catch (fetchError) {
      addToast({
        title: "Load Failed",
        description: getSubscriptionPlansErrorMessage(fetchError),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsViewLoading(false);
    }
  };

  const openDeleteModal = (plan: SubscriptionPlan) => {
    setPendingDeletePlan(plan);
    onDeleteOpen();
  };

  const validateAndBuildPayload = (): SubscriptionPlanPayload | null => {
    const trimmedName = formState.name.trim();
    const trimmedDescription = formState.description.trim();
    const parsedPrice = Number(formState.price);

    if (!trimmedName) {
      addToast({
        title: "Validation Error",
        description: "Plan name is required.",
        color: "danger",
        radius: "full",
        timeout: 3000,
      });

      return null;
    }

    if (!trimmedDescription) {
      addToast({
        title: "Validation Error",
        description: "Description is required.",
        color: "danger",
        radius: "full",
        timeout: 3000,
      });

      return null;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      addToast({
        title: "Validation Error",
        description: "Price must be a valid positive number.",
        color: "danger",
        radius: "full",
        timeout: 3000,
      });

      return null;
    }

    return {
      name: trimmedName,
      price: parsedPrice,
      description: trimmedDescription,
      is_beta: toFlagNumber(formState.is_beta),
      is_active: toFlagNumber(formState.is_active),
    };
  };

  const handleSavePlan = async () => {
    const payload = validateAndBuildPayload();

    if (!payload) {
      return;
    }

    setIsSubmittingForm(true);

    try {
      if (editingPlanId) {
        const result = await updateSubscriptionPlanById(editingPlanId, payload);

        addToast({
          title: "Plan Updated",
          description:
            result.message ?? "Subscription plan updated successfully.",
          color: "success",
          radius: "full",
          timeout: 3000,
        });
      } else {
        const result = await createSubscriptionPlan(payload);

        addToast({
          title: "Plan Created",
          description:
            result.message ?? "Subscription plan created successfully.",
          color: "success",
          radius: "full",
          timeout: 3000,
        });
      }

      onFormClose();
      resetForm();
      await plansList.reload();
    } catch (submitError) {
      addToast({
        title: editingPlanId ? "Update Failed" : "Create Failed",
        description: getSubscriptionPlansErrorMessage(submitError),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!pendingDeletePlan) {
      return;
    }

    const id = pendingDeletePlan.id;

    setDeletingPlanId(id);

    try {
      const result = await deleteSubscriptionPlanById(id);

      addToast({
        title: "Plan Deleted",
        description:
          result.message ?? "Subscription plan deleted successfully.",
        color: "success",
        radius: "full",
        timeout: 3000,
      });

      if (plansList.items.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await plansList.reload();
      }
    } catch (deleteError) {
      addToast({
        title: "Delete Failed",
        description: getSubscriptionPlansErrorMessage(deleteError),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setDeletingPlanId(null);
      setPendingDeletePlan(null);
      onDeleteClose();
    }
  };

  const isEditMode = editingPlanId !== null;

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Subscription Plans</h2>
              <p className="text-sm text-default-500">
                Create and manage plan pricing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                isLoading={plansList.isLoading}
                startContent={
                  !plansList.isLoading && (
                    <Icon icon="solar:refresh-bold" width={18} />
                  )
                }
                variant="flat"
                onPress={() => plansList.reload()}
              >
                Refresh
              </Button>

              <Button
                color="primary"
                startContent={<Icon icon="mdi:plus" width={18} />}
                onPress={openCreateModal}
              >
                Add Plan
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Table removeWrapper aria-label="Subscription plans table">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Price</TableColumn>
              <TableColumn>Beta</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>

            <TableBody
              emptyContent="No subscription plans found"
              isLoading={plansList.isLoading}
              items={plansList.items}
              loadingContent={<Spinner label="Loading plans..." />}
            >
              {(plan: SubscriptionPlan) => (
                <TableRow key={String(plan.id)}>
                  <TableCell>#{plan.id}</TableCell>
                  <TableCell>{plan.name ?? "-"}</TableCell>
                  <TableCell>
                    Rs. {Number(plan.price ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={
                        toBooleanFlag(plan.is_beta) ? "warning" : "default"
                      }
                      size="sm"
                      variant="flat"
                    >
                      {toBooleanFlag(plan.is_beta) ? "Yes" : "No"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={
                        toBooleanFlag(plan.is_active) ? "success" : "danger"
                      }
                      size="sm"
                      variant="flat"
                    >
                      {toBooleanFlag(plan.is_active) ? "Active" : "Inactive"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {formatDate(plan.updated_at ?? plan.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip content="View plan">
                        <Button
                          isIconOnly
                          size="sm"
                          startContent={
                            <Icon height={16} icon="mdi:eye" width={16} />
                          }
                          variant="flat"
                          onPress={() => openViewModal(plan.id)}
                        />
                      </Tooltip>

                      <Tooltip content="Edit plan">
                        <Button
                          isIconOnly
                          color="secondary"
                          size="sm"
                          startContent={
                            <Icon
                              height={16}
                              icon="mdi:pencil-outline"
                              width={16}
                            />
                          }
                          variant="flat"
                          onPress={() => openEditModal(plan)}
                        />
                      </Tooltip>

                      <Tooltip content="Delete plan">
                        <Button
                          isIconOnly
                          color="danger"
                          isDisabled={deletingPlanId !== null}
                          isLoading={deletingPlanId === plan.id}
                          size="sm"
                          startContent={
                            deletingPlanId !== plan.id ? (
                              <Icon
                                height={16}
                                icon="mdi:delete-outline"
                                width={16}
                              />
                            ) : undefined
                          }
                          variant="flat"
                          onPress={() => openDeleteModal(plan)}
                        />
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

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

            <Pagination
              showControls
              color="primary"
              isDisabled={plansList.isLoading}
              page={page}
              total={Math.max(totalPages, 1)}
              onChange={setPage}
            />
          </div>
        </CardBody>
      </Card>

      <Modal
        backdrop="blur"
        isOpen={isViewModalOpen}
        size="md"
        onOpenChange={onViewOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            Subscription Plan
          </ModalHeader>
          <ModalBody className="pb-4">
            {isViewLoading ? (
              <div className="flex min-h-[140px] items-center justify-center">
                <Spinner label="Loading plan..." />
              </div>
            ) : selectedPlan ? (
              <div className="space-y-3">
                <Input
                  isReadOnly
                  label="Name"
                  value={selectedPlan.name ?? "-"}
                  variant="flat"
                />
                <Input
                  isReadOnly
                  label="Price"
                  value={`Rs. ${Number(selectedPlan.price ?? 0).toFixed(2)}`}
                  variant="flat"
                />
                <Input
                  isReadOnly
                  label="Description"
                  value={stripHtmlTags(selectedPlan.description ?? "-") || "-"}
                  variant="flat"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    isReadOnly
                    label="Beta"
                    value={toBooleanFlag(selectedPlan.is_beta) ? "Yes" : "No"}
                    variant="flat"
                  />
                  <Input
                    isReadOnly
                    label="Status"
                    value={
                      toBooleanFlag(selectedPlan.is_active)
                        ? "Active"
                        : "Inactive"
                    }
                    variant="flat"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-default-500">Plan not found.</p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={isFormModalOpen}
        size="lg"
        onOpenChange={onFormOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            {isEditMode ? "Edit Subscription Plan" : "Create Subscription Plan"}
          </ModalHeader>
          <ModalBody className="pb-2">
            <Input
              isRequired
              label="Plan Name"
              value={formState.name}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, name: value }))
              }
            />

            <Input
              isRequired
              label="Price"
              min={0}
              placeholder="199.99"
              step={0.01}
              type="number"
              value={formState.price}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, price: value }))
              }
            />

            <Textarea
              isRequired
              label="Description"
              minRows={3}
              placeholder="Plan content"
              value={formState.description}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, description: value }))
              }
            />

            <div className="flex flex-wrap gap-6 py-2">
              <Switch
                isSelected={formState.is_beta}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, is_beta: value }))
                }
              >
                Is Beta
              </Switch>

              <Switch
                isSelected={formState.is_active}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, is_active: value }))
                }
              >
                Is Active
              </Switch>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={isSubmittingForm}
              variant="flat"
              onPress={() => {
                onFormClose();
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isSubmittingForm}
              onPress={handleSavePlan}
            >
              {isEditMode ? "Update Plan" : "Create Plan"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        hideCloseButton={deletingPlanId !== null}
        isDismissable={deletingPlanId === null}
        isOpen={isDeleteModalOpen}
        onOpenChange={onDeleteOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            Delete Plan
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {pendingDeletePlan?.name ?? "this plan"}
              </span>
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={deletingPlanId !== null}
              variant="flat"
              onPress={onDeleteClose}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deletingPlanId === pendingDeletePlan?.id}
              onPress={handleDeletePlan}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
