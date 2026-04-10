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
    <div className="flex flex-col gap-3">

      {/* ✅ FLEX LAYOUT */}
      <div className="flex flex-wrap gap-3 lg:flex-nowrap lg:items-end">

        {/* 🔍 SEARCH (flexible) */}
        <div className="w-full sm:w-[300px] lg:flex-1 min-w-[220px]">
          <Input
            isClearable
            label="Search users"
            placeholder="Search name, email or mobile"
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
        </div>

        {/* 💳 PAYMENT + STATUS */}
        <div className="grid grid-cols-2 gap-3 w-full sm:w-[300px] lg:w-[260px] shrink-0">
          <Select
            disallowEmptySelection
            label="Payment"
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
        </div>

        {/* 📅 START DATE */}
        <div className="w-full sm:w-[150px] lg:w-[140px] shrink-0">
          <Input
            label="Start date"
            max={values.endDate || undefined}
            size="sm"
            type="date"
            value={values.startDate}
            variant="bordered"
            onValueChange={onStartDateChange}
          />
        </div>

        {/* 📅 END DATE */}
        <div className="w-full sm:w-[150px] lg:w-[140px] shrink-0">
          <Input
            label="End date"
            min={values.startDate || undefined}
            size="sm"
            type="date"
            value={values.endDate}
            variant="bordered"
            onValueChange={onEndDateChange}
          />
        </div>

        {/* 🧹 BUTTON */}
        <div className="w-full sm:w-auto lg:ml-auto shrink-0">
          <Button
            className="h-10 px-4 w-full sm:w-auto"
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