import type { ButtonProps } from "@heroui/react";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export interface SegmentedPillOption<T extends string> {
  label: string;
  value: T;
  icon?: string;
  color?: ButtonProps["color"];
}

interface SegmentedPillsProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: SegmentedPillOption<T>[];
  isDisabled?: boolean;
  onChange: (value: T) => void;
}

export default function SegmentedPills<T extends string>({
  label,
  hint,
  value,
  options,
  isDisabled = false,
  onChange,
}: SegmentedPillsProps<T>) {
  return (
    <div className="rounded-[20px] border border-default-200 bg-default-50/80 p-3 sm:p-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-default-500">
            {label}
          </p>
          {hint ? (
            <p className="text-sm text-default-600">{hint}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = value === option.value;

            return (
              <Button
                key={option.value}
                color={isSelected ? option.color ?? "primary" : "default"}
                isDisabled={isDisabled}
                radius="full"
                size="sm"
                startContent={
                  option.icon ? <Icon icon={option.icon} width="16" /> : undefined
                }
                variant={isSelected ? "solid" : "flat"}
                onPress={() => onChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
