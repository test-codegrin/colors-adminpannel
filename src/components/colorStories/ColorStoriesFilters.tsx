import type {
  ColorStoryCategory,
  ColorStoriesFiltersFormValues,
  ColorStoryStatusFilter,
} from "@/types/colorStories.types";

import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { Key } from "react";

interface ColorStoriesFiltersProps {
  categories: ColorStoryCategory[];
  hasActiveFilters: boolean;
  isLoading?: boolean;
  values: ColorStoriesFiltersFormValues;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ColorStoryStatusFilter) => void;
}

export default function ColorStoriesFilters({
  categories,
  hasActiveFilters,
  isLoading = false,
  values,
  onCategoryChange,
  onClear,
  onSearchChange,
  onStatusChange,
}: ColorStoriesFiltersProps) {
  const categoryOptions = [
    {
      key: "all",
      label: "All categories",
    },
    ...categories.map((category) => ({
      key: category.name,
      label: category.name,
    })),
  ];

  const handleStatusSelectionChange = (keys: "all" | Set<Key>) => {
    if (keys === "all") {
      onStatusChange("all");

      return;
    }

    const [selectedKey] = Array.from(keys);
    const nextValue =
      selectedKey === "0" || selectedKey === "1" || selectedKey === "all"
        ? selectedKey
        : "all";

    onStatusChange(nextValue);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)_auto] lg:items-end">
        <Input
          isClearable
          label="Search stories"
          placeholder="Search title, excerpt, or tags"
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

        <Select
          disallowEmptySelection
          label="Status"
          selectedKeys={[values.status]}
          size="md"
          variant="bordered"
          onSelectionChange={handleStatusSelectionChange}
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="0">Draft</SelectItem>
          <SelectItem key="1">Published</SelectItem>
        </Select>

        <Select
          disallowEmptySelection
          isDisabled={categories.length === 0}
          items={categoryOptions}
          label="Category"
          placeholder={
            categories.length > 0 ? "Filter by category" : "No categories yet"
          }
          selectedKeys={[values.category || "all"]}
          variant="bordered"
          onSelectionChange={(keys) => {
            if (keys === "all") {
              onCategoryChange("");

              return;
            }

            const [selectedKey] = Array.from(keys);
            onCategoryChange(selectedKey === "all" ? "" : String(selectedKey));
          }}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>

        <div className="flex justify-start lg:justify-end">
          <Button
            className="h-10 w-full justify-center whitespace-nowrap px-4 sm:w-auto sm:min-w-[148px]"
            isDisabled={!hasActiveFilters || isLoading}
            size="sm"
            startContent={
              <Icon height={18} icon="mdi:filter-remove-outline" width={18} />
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
