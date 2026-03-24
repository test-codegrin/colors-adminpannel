import type { ReactNode } from "react";

import { Button, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";

interface FilterOption<T extends number | string> {
  label: string;
  value: T;
}

export function SegmentedFilter<T extends number | string>({
  label,
  options,
  value,
  onChange,
  isDisabled = false,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDisabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-default-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            color={value === option.value ? "primary" : "default"}
            isDisabled={isDisabled}
            radius="full"
            size="sm"
            variant={value === option.value ? "solid" : "flat"}
            onPress={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyles =
    tone === "success"
      ? "from-emerald-500/12 to-emerald-500/0 text-emerald-600"
      : tone === "warning"
        ? "from-amber-500/12 to-amber-500/0 text-amber-600"
        : tone === "danger"
          ? "from-rose-500/12 to-rose-500/0 text-rose-600"
          : "from-sky-500/12 to-sky-500/0 text-sky-600";

  return (
    <Card className="border border-default-200 bg-content1" shadow="sm">
      <CardBody className="gap-4 bg-gradient-to-br p-5 from-white to-transparent dark:from-transparent">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-default-500">
              {label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {value}
            </p>
          </div>

          {icon ? (
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${toneStyles}`}
            >
              <Icon icon={icon} width="22" />
            </div>
          ) : null}
        </div>

        {hint ? <p className="text-sm text-default-500">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export function LoadingBlock({
  lines = 4,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={`loading-${index + 1}`}
          className="h-4 animate-pulse rounded-full bg-default-200"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-default-300 bg-default-50/70 px-6 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm text-default-500">{description}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger-50/40 px-6 py-10 text-center">
      <p className="text-base font-semibold text-danger">
        Unable to load this section
      </p>
      <p className="mt-2 max-w-md text-sm text-default-600">{message}</p>
      <Button className="mt-4" color="danger" variant="flat" onPress={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`border border-default-200 bg-content1 ${className}`}
      shadow="sm"
    >
      <CardBody className="gap-5 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-default-500">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}
