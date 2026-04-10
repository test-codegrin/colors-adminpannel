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
    { key: "all", label: "All categories" },
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

      <div className="flex flex-wrap gap-3 md:flex-nowrap md:items-end">

        {/* 🔍 SEARCH — full width on mobile, flexible on md+ */}
        <div className="w-full md:flex-1 md:min-w-[220px]">
          <Input
            isClearable
            label="Search stories"
            placeholder="Search title, excerpt, or tags"
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

        {/* 📊 STATUS + CATEGORY — side-by-side on ALL screen sizes */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-[280px] md:shrink-0">
          <Select
            disallowEmptySelection
            label="Status"
            selectedKeys={[values.status]}
            size="sm"
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
              categories.length > 0 ? "Filter by category" : "No categories"
            }
            selectedKeys={[values.category || "all"]}
            size="sm"
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
        </div>

        {/* 🧹 CLEAR BUTTON — full width on mobile, auto on md+ */}
        <div className="w-full md:w-auto md:shrink-0">
          <Button
            className="h-10 w-full px-4 md:w-auto"
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