import type {
  UserPaymentStatusFilter,
  UserStatusFilter,
  UsersFiltersFormValues,
} from "@/types/user.types";

import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { Key } from "react";

interface UsersFiltersProps {
  hasActiveFilters: boolean;
  isLoading?: boolean;
  values: UsersFiltersFormValues;
  onClear: () => void;
  onEndDateChange: (value: string) => void;
  onPaymentStatusChange: (value: UserPaymentStatusFilter) => void;
  onStatusChange: (value: UserStatusFilter) => void;
  onSearchChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
}

export default function UsersFilters({
  hasActiveFilters,
  isLoading = false,
  values,
  onClear,
  onEndDateChange,
  onPaymentStatusChange,
  onStatusChange,
  onSearchChange,
  onStartDateChange,
}: UsersFiltersProps) {
  const handlePaymentSelectionChange = (keys: "all" | Set<Key>) => {
    if (keys === "all") {
      onPaymentStatusChange("all");

      return;
    }

    const [selectedKey] = Array.from(keys);
    const nextValue =
      selectedKey === "paid" ||
      selectedKey === "unpaid" ||
      selectedKey === "all"
        ? selectedKey
        : "all";

    onPaymentStatusChange(nextValue);
  };

  const handleStatusSelectionChange = (keys: "all" | Set<Key>) => {
    if (keys === "all") {
      onStatusChange("all");

      return;
    }

    const [selectedKey] = Array.from(keys);
    const nextValue =
      selectedKey === "online" ||
      selectedKey === "offline" ||
      selectedKey === "all"
        ? selectedKey
        : "all";

    onStatusChange(nextValue);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Filters
          </span>
          <p className="text-sm text-default-500">
            Search, payment status, live status, and created date range.
          </p>
        </div>

        {hasActiveFilters ? (
          <p className="text-xs font-medium text-default-500">
            Results update automatically
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <Input
          isClearable
          className="w-full"
          label="Search users"
          placeholder="Search name, email, or mobile"
          size="sm"
          startContent={
            <Icon
              className="text-default-400"
              height={18}
              icon="mdi:magnify"
              width={18}
            />
          }
          value={values.search}
          variant="bordered"
          onClear={() => onSearchChange("")}
          onValueChange={onSearchChange}
        />

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.85fr)_minmax(160px,0.85fr)_auto] 2xl:items-end">
          <Select
            disallowEmptySelection
            label="Payment status"
            selectedKeys={[values.paymentStatus]}
            size="sm"
            variant="bordered"
            onSelectionChange={handlePaymentSelectionChange}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="paid">Paid</SelectItem>
            <SelectItem key="unpaid">Unpaid</SelectItem>
          </Select>

          <Select
            disallowEmptySelection
            label="Status"
            selectedKeys={[values.status]}
            size="sm"
            variant="bordered"
            onSelectionChange={handleStatusSelectionChange}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="online">Online</SelectItem>
            <SelectItem key="offline">Offline</SelectItem>
          </Select>

          <Input
            label="Start date"
            max={values.endDate || undefined}
            size="sm"
            type="date"
            value={values.startDate}
            variant="bordered"
            onValueChange={onStartDateChange}
          />

          <Input
            label="End date"
            min={values.startDate || undefined}
            size="sm"
            type="date"
            value={values.endDate}
            variant="bordered"
            onValueChange={onEndDateChange}
          />

          <div className="flex justify-start sm:col-span-2 2xl:col-span-1 2xl:justify-end">
            <Button
              className="h-10 w-full justify-center whitespace-nowrap px-4 sm:w-auto sm:min-w-[148px] 2xl:min-w-[156px]"
              isDisabled={!hasActiveFilters || isLoading}
              size="sm"
              startContent={
                <Icon
                  height={18}
                  icon="mdi:filter-remove-outline"
                  width={18}
                />
              }
              variant="flat"
              onPress={onClear}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
