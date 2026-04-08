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
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Search */}
        <div className="flex-shrink-0">
          <Input
            isClearable
            className="w-[520px]"
            label="Search users"
            placeholder="Search name, email or mobile"
            size="md"
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
        </div>

        {/* Payment Status */}
        <div className="flex-shrink-0">
          <Select
            disallowEmptySelection
            label="Payment status"
            selectedKeys={[values.paymentStatus]}
            className="w-[150px]"
            size="md"
            variant="bordered"
            onSelectionChange={handlePaymentSelectionChange}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="paid">Paid</SelectItem>
            <SelectItem key="unpaid">Unpaid</SelectItem>
          </Select>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <Select
            disallowEmptySelection
            label="Status"
            selectedKeys={[values.status]}
            className="w-[150px]"
            size="md"
            variant="bordered"
            onSelectionChange={handleStatusSelectionChange}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="online">Online</SelectItem>
            <SelectItem key="offline">Offline</SelectItem>
          </Select>
        </div>

        {/* Start Date */}
        <div className="flex-shrink-0">
          <Input
            label="Start date"
            max={values.endDate || undefined}
            className="w-[150px]"
            size="md"
            type="date"
            value={values.startDate}
            variant="bordered"
            onValueChange={onStartDateChange}
          />
        </div>

        {/* End Date */}
        <div className="flex-shrink-0">
          <Input
            label="End date"
            min={values.startDate || undefined}
            className="w-[150px]"
            size="md"
            type="date"
            value={values.endDate}
            variant="bordered"
            onValueChange={onEndDateChange}
          />
        </div>

        {/* Button */}
        <div className="flex-shrink-0 ml-auto">
          <Button
            className="h-10 w-full sm:w-auto min-w-[148px]"
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
  );
}
