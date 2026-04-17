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
    if (keys === "all") return onPaymentStatusChange("all");

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
    if (keys === "all") return onStatusChange("all");

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:min-w-64 sm:flex-1">
        <Input
          isClearable
          label="Search users"
          placeholder="Search name, email or mobile"
          startContent={
            <Icon
              className="text-default-400"
              height={18}
              icon="mdi:magnify"
              width={18}
            />
          }
          value={values.search}
          onClear={() => onSearchChange("")}
          onValueChange={onSearchChange}
        />
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-72">
        <Select
          disallowEmptySelection
          label="Payment"
          selectedKeys={[values.paymentStatus]}
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
          onSelectionChange={handleStatusSelectionChange}
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="online">Online</SelectItem>
          <SelectItem key="offline">Offline</SelectItem>
        </Select>
      </div>

      <div className="w-full sm:w-40">
        <Input
          label="Start date"
          max={values.endDate || undefined}
          type="date"
          value={values.startDate}
          onValueChange={onStartDateChange}
        />
      </div>

      <div className="w-full sm:w-40">
        <Input
          label="End date"
          min={values.startDate || undefined}
          type="date"
          value={values.endDate}
          onValueChange={onEndDateChange}
        />
      </div>

      <div className="w-full sm:ml-auto sm:w-auto">
        <Button
          className="w-full sm:w-auto"
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
  );
}
