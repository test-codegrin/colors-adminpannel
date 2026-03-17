import {
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";

import { getAnalyticsErrorMessage, getDevicesAnalytics } from "@/api/analytics.api";
import type {
  BrowserBreakdownItem,
  DayRange,
  DeviceAnalyticsPayload,
  DeviceBreakdownItem,
  OsBreakdownItem,
} from "@/types/analytics.types";

const DAY_OPTIONS: DayRange[] = [7, 30, 90];
const numberFormatter = new Intl.NumberFormat("en-IN");

function formatPercent(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

function formatNumber(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return numberFormatter.format(value);
}

export default function DevicesAnalytics() {
  const [days, setDays] = useState<DayRange>(30);
  const [payload, setPayload] = useState<DeviceAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDeviceAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getDevicesAnalytics(days);

      setPayload(response);
    } catch (fetchError) {
      setPayload(null);
      setError(getAnalyticsErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadDeviceAnalytics();
  }, [loadDeviceAnalytics]);

  const summary = payload?.summary;

  return (
    <div className="space-y-6">
      <Card shadow="sm">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Devices Analytics</h2>
            <p className="text-sm text-default-500">
              Full response view for <span className="font-mono">/admin/analytics/devices</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map((option) => (
              <Button
                key={option}
                size="sm"
                color={days === option ? "primary" : "default"}
                variant={days === option ? "solid" : "flat"}
                onPress={() => setDays(option)}
                isDisabled={isLoading}
              >
                {option}D
              </Button>
            ))}
            <Button
              size="sm"
              variant="flat"
              onPress={loadDeviceAnalytics}
              isLoading={isLoading}
              startContent={!isLoading && <Icon icon="solar:refresh-bold" width="16" />}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card shadow="sm">
        <CardBody className="gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Summary</h3>
            <Chip size="sm" variant="flat">
              Range: {payload?.range_days ?? days} days
            </Chip>
          </div>

          {isLoading && !payload ? (
            <div className="h-20 flex items-center justify-center">
              <Spinner label="Loading summary..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-1">
                  <p className="text-xs uppercase text-default-500">Total Users</p>
                  <p className="text-xl font-semibold">{formatNumber(summary?.total_users)}</p>
                </CardBody>
              </Card>
              <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-1">
                  <p className="text-xs uppercase text-default-500">Logged-In Users</p>
                  <p className="text-xl font-semibold">{formatNumber(summary?.logged_in_users)}</p>
                </CardBody>
              </Card>
              <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-1">
                  <p className="text-xs uppercase text-default-500">Guest Users</p>
                  <p className="text-xl font-semibold">{formatNumber(summary?.guest_users)}</p>
                </CardBody>
              </Card>
              <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-1">
                  <p className="text-xs uppercase text-default-500">Total Sessions</p>
                  <p className="text-xl font-semibold">{formatNumber(summary?.total_sessions)}</p>
                </CardBody>
              </Card>
              <Card shadow="none" className="border border-default-200">
                <CardBody className="gap-1">
                  <p className="text-xs uppercase text-default-500">Avg Sessions/User</p>
                  <p className="text-xl font-semibold">
                    {typeof summary?.avg_sessions_per_user === "number"
                      ? summary.avg_sessions_per_user.toFixed(2)
                      : "0.00"}
                  </p>
                </CardBody>
              </Card>
            </div>
          )}
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardBody className="gap-4">
          <h3 className="text-base font-semibold">Devices</h3>
          <Table aria-label="Devices analytics table" removeWrapper>
            <TableHeader>
              <TableColumn>Device</TableColumn>
              <TableColumn>Users</TableColumn>
              <TableColumn>Logged In</TableColumn>
              <TableColumn>Guest</TableColumn>
              <TableColumn>Sessions</TableColumn>
              <TableColumn>Sessions/User</TableColumn>
              <TableColumn>User Share</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading && !payload}
              items={payload?.devices ?? []}
              loadingContent={<Spinner label="Loading devices..." />}
              emptyContent="No device data"
            >
              {(item: DeviceBreakdownItem) => (
                <TableRow key={item.device}>
                  <TableCell>{item.device}</TableCell>
                  <TableCell>{formatNumber(item.users)}</TableCell>
                  <TableCell>{formatNumber(item.logged_in_users)}</TableCell>
                  <TableCell>{formatNumber(item.guest_users)}</TableCell>
                  <TableCell>{formatNumber(item.sessions)}</TableCell>
                  <TableCell>
                    {typeof item.sessions_per_user === "number"
                      ? item.sessions_per_user.toFixed(2)
                      : "-"}
                  </TableCell>
                  <TableCell>{formatPercent(item.percentage)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card shadow="sm">
          <CardBody className="gap-4">
            <h3 className="text-base font-semibold">Browsers</h3>
            <Table aria-label="Browser analytics table" removeWrapper>
              <TableHeader>
                <TableColumn>Browser</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Sessions</TableColumn>
                <TableColumn>User Share</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={isLoading && !payload}
                items={payload?.browsers ?? []}
                loadingContent={<Spinner label="Loading browsers..." />}
                emptyContent="No browser data"
              >
                {(item: BrowserBreakdownItem) => (
                  <TableRow key={item.browser}>
                    <TableCell>{item.browser}</TableCell>
                    <TableCell>{formatNumber(item.users)}</TableCell>
                    <TableCell>{formatNumber(item.sessions)}</TableCell>
                    <TableCell>{formatPercent(item.percentage)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4">
            <h3 className="text-base font-semibold">Operating Systems</h3>
            <Table aria-label="OS analytics table" removeWrapper>
              <TableHeader>
                <TableColumn>OS</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Sessions</TableColumn>
                <TableColumn>User Share</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={isLoading && !payload}
                items={payload?.os ?? []}
                loadingContent={<Spinner label="Loading operating systems..." />}
                emptyContent="No OS data"
              >
                {(item: OsBreakdownItem) => (
                  <TableRow key={item.os}>
                    <TableCell>{item.os}</TableCell>
                    <TableCell>{formatNumber(item.users)}</TableCell>
                    <TableCell>{formatNumber(item.sessions)}</TableCell>
                    <TableCell>{formatPercent(item.percentage)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
