import type {
  BrowserBreakdownItem,
  DayRange,
  DeviceAnalyticsPayload,
  DeviceBreakdownItem,
  OsBreakdownItem,
} from "@/types/analytics.types";

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

import {
  getAnalyticsErrorMessage,
  getDevicesAnalytics,
} from "@/api/analytics.api";

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
              Full response view for{" "}
              <span className="font-mono">/admin/analytics/devices</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map((option) => (
              <Button
                key={option}
                color={days === option ? "primary" : "default"}
                isDisabled={isLoading}
                size="sm"
                variant={days === option ? "solid" : "flat"}
                onPress={() => setDays(option)}
              >
                {option}D
              </Button>
            ))}
            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width="16" />
              }
              variant="flat"
              onPress={loadDeviceAnalytics}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card shadow="sm">
        <CardBody className="gap-4 p-4 sm:p-5">

          {/* ✅ Header Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm sm:text-base font-semibold">
              Summary
            </h3>

            <Chip size="sm" variant="flat" className="w-fit">
              Range: {payload?.range_days ?? days} days
            </Chip>
          </div>

          {/* Content */}
          {isLoading && !payload ? (
            <div className="h-20 flex items-center justify-center">
              <Spinner label="Loading summary..." />
            </div>
          ) : (
            <div
              className="
          grid gap-3
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          xl:grid-cols-5
        "
            >
              {/* Card 1 */}
              <Card className="border border-default-200" shadow="none">
                <CardBody className="gap-1 p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs uppercase text-default-500">
                    Total Users
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {formatNumber(summary?.total_users)}
                  </p>
                </CardBody>
              </Card>

              {/* Card 2 */}
              <Card className="border border-default-200" shadow="none">
                <CardBody className="gap-1 p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs uppercase text-default-500">
                    Logged-In Users
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {formatNumber(summary?.logged_in_users)}
                  </p>
                </CardBody>
              </Card>

              {/* Card 3 */}
              <Card className="border border-default-200" shadow="none">
                <CardBody className="gap-1 p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs uppercase text-default-500">
                    Guest Users
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {formatNumber(summary?.guest_users)}
                  </p>
                </CardBody>
              </Card>

              {/* Card 4 */}
              <Card className="border border-default-200" shadow="none">
                <CardBody className="gap-1 p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs uppercase text-default-500">
                    Total Sessions
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
                    {formatNumber(summary?.total_sessions)}
                  </p>
                </CardBody>
              </Card>

              {/* Card 5 */}
              <Card className="border border-default-200" shadow="none">
                <CardBody className="gap-1 p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs uppercase text-default-500">
                    Avg Sessions/User
                  </p>
                  <p className="text-lg sm:text-xl font-semibold">
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
        <CardBody className="gap-4 p-4 sm:p-5">

          {/* ✅ Header */}
          <h3 className="text-sm sm:text-base font-semibold">
            Devices
          </h3>

          {/* ✅ Table Scroll Fix */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <Table
              removeWrapper
              aria-label="Devices analytics table"
              className="min-w-[900px]"
            >
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
                emptyContent="No device data"
                isLoading={isLoading && !payload}
                items={payload?.devices ?? []}
                loadingContent={<Spinner label="Loading devices..." />}
              >
                {(item: DeviceBreakdownItem) => (
                  <TableRow key={item.device}>

                    {/* Device */}
                    <TableCell className="whitespace-nowrap">
                      {item.device}
                    </TableCell>

                    {/* Users */}
                    <TableCell>
                      {formatNumber(item.users)}
                    </TableCell>

                    {/* Logged In */}
                    <TableCell>
                      {formatNumber(item.logged_in_users)}
                    </TableCell>

                    {/* Guest */}
                    <TableCell>
                      {formatNumber(item.guest_users)}
                    </TableCell>

                    {/* Sessions */}
                    <TableCell>
                      {formatNumber(item.sessions)}
                    </TableCell>

                    {/* Sessions/User */}
                    <TableCell>
                      {typeof item.sessions_per_user === "number"
                        ? item.sessions_per_user.toFixed(2)
                        : "-"}
                    </TableCell>

                    {/* Share */}
                    <TableCell>
                      {formatPercent(
                        item.users_share_percent ?? item.percentage,
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card shadow="sm">
          <CardBody className="gap-4 p-4 sm:p-5">

            {/* ✅ Header */}
            <h3 className="text-sm sm:text-base font-semibold">
              Browsers
            </h3>

            {/* ✅ Table Scroll Fix */}
            <div className="w-full overflow-x-auto scrollbar-hide">
              <Table
                removeWrapper
                aria-label="Browser analytics table"
                className="min-w-[600px]"
              >
                <TableHeader>
                  <TableColumn>Browser</TableColumn>
                  <TableColumn>Users</TableColumn>
                  <TableColumn>Sessions</TableColumn>
                  <TableColumn>User Share</TableColumn>
                </TableHeader>

                <TableBody
                  emptyContent="No browser data"
                  isLoading={isLoading && !payload}
                  items={payload?.browsers ?? []}
                  loadingContent={<Spinner label="Loading browsers..." />}
                >
                  {(item: BrowserBreakdownItem) => (
                    <TableRow key={item.browser}>

                      {/* Browser */}
                      <TableCell className="whitespace-nowrap">
                        {item.browser}
                      </TableCell>

                      {/* Users */}
                      <TableCell>
                        {formatNumber(item.users)}
                      </TableCell>

                      {/* Sessions */}
                      <TableCell>
                        {formatNumber(item.sessions)}
                      </TableCell>

                      {/* Share */}
                      <TableCell>
                        {formatPercent(
                          item.users_share_percent ?? item.percentage,
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="gap-4 p-4 sm:p-5">

            {/* ✅ Header */}
            <h3 className="text-sm sm:text-base font-semibold">
              Operating Systems
            </h3>

            {/* ✅ Table Scroll Fix */}
            <div className="w-full overflow-x-auto scrollbar-hide">
              <Table
                removeWrapper
                aria-label="OS analytics table"
                className="min-w-[600px]"
              >
                <TableHeader>
                  <TableColumn>OS</TableColumn>
                  <TableColumn>Users</TableColumn>
                  <TableColumn>Sessions</TableColumn>
                  <TableColumn>User Share</TableColumn>
                </TableHeader>

                <TableBody
                  emptyContent="No OS data"
                  isLoading={isLoading && !payload}
                  items={payload?.os ?? []}
                  loadingContent={
                    <Spinner label="Loading operating systems..." />
                  }
                >
                  {(item: OsBreakdownItem) => (
                    <TableRow key={item.os}>

                      {/* OS Name */}
                      <TableCell className="whitespace-nowrap">
                        {item.os}
                      </TableCell>

                      {/* Users */}
                      <TableCell>
                        {formatNumber(item.users)}
                      </TableCell>

                      {/* Sessions */}
                      <TableCell>
                        {formatNumber(item.sessions)}
                      </TableCell>

                      {/* Share */}
                      <TableCell>
                        {formatPercent(
                          item.users_share_percent ?? item.percentage,
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

          </CardBody>
        </Card>
      </div>
    </div>
  );
}
