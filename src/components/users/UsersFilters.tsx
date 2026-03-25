import type {
  UserPaymentStatusFilter,
  UsersFiltersFormValues,
} from "@/types/user.types";

import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";

interface UsersFiltersProps {
  hasActiveFilters: boolean;
  isLoading?: boolean;
  values: UsersFiltersFormValues;
  onClear: () => void;
  onEndDateChange: (value: string) => void;
  onPaymentStatusChange: (value: UserPaymentStatusFilter) => void;
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
  onSearchChange,
  onStartDateChange,
}: UsersFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Filters
          </span>
          <p className="text-sm text-default-500">
            Search, payment status, and created date range.
          </p>
        </div>

        {hasActiveFilters ? (
          <p className="text-xs font-medium text-default-500">
            Results update automatically
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(170px,210px)_minmax(150px,170px)_minmax(150px,170px)_max-content] lg:items-end">
        <Input
          isClearable
          className="w-full"
          label="Search users"
          placeholder="Type a name, email, or mobile number"
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

        <Select
          disallowEmptySelection
          label="Payment status"
          selectedKeys={[values.paymentStatus]}
          size="sm"
          variant="bordered"
          onChange={(event) =>
            onPaymentStatusChange(event.target.value as UserPaymentStatusFilter)
          }
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="paid">Paid</SelectItem>
          <SelectItem key="unpaid">Unpaid</SelectItem>
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

        <div className="flex items-end">
          <Button
            className="h-10 w-full justify-center px-4 whitespace-nowrap lg:min-w-[148px]"
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
