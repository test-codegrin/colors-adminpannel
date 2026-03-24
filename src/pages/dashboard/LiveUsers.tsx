import type { LiveUsersData } from "@/types/analytics.types";

import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getAnalyticsErrorMessage, getLiveUsers } from "@/api/analytics.api";

interface MetricCard {
  key: string;
  label: string;
  icon: string;
  getValue: (data: LiveUsersData) => number | undefined;
}

const numberFormatter = new Intl.NumberFormat("en-IN");

const metricCards: MetricCard[] = [
  {
    key: "active_users_now",
    label: "Active Users Now",
    icon: "mdi:account-group-outline",
    getValue: (data) => data.active_users_now ?? data.live_users,
  },
  {
    key: "active_sessions",
    label: "Active Sessions",
    icon: "mdi:monitor-dashboard",
    getValue: (data) => data.active_sessions,
  },
  {
    key: "users_last_5_minutes",
    label: "Users (Last 5m)",
    icon: "mdi:clock-fast",
    getValue: (data) => data.users_last_5_minutes,
  },
  {
    key: "users_last_30_minutes",
    label: "Users (Last 30m)",
    icon: "mdi:clock-outline",
    getValue: (data) => data.users_last_30_minutes,
  },
  {
    key: "logged_in_users_now",
    label: "Logged-In Users Now",
    icon: "mdi:account-check-outline",
    getValue: (data) => data.logged_in_users_now,
  },
  {
    key: "guest_users_now",
    label: "Guest Users Now",
    icon: "mdi:account-outline",
    getValue: (data) => data.guest_users_now,
  },
  {
    key: "logged_in_users_last_30_minutes",
    label: "Logged-In Users (30m)",
    icon: "mdi:account-clock-outline",
    getValue: (data) => data.logged_in_users_last_30_minutes,
  },
  {
    key: "guest_users_last_30_minutes",
    label: "Guest Users (30m)",
    icon: "mdi:account-arrow-right-outline",
    getValue: (data) => data.guest_users_last_30_minutes,
  },
  {
    key: "logged_in_active_sessions",
    label: "Logged-In Sessions",
    icon: "mdi:cellphone-link",
    getValue: (data) => data.logged_in_active_sessions,
  },
  {
    key: "guest_active_sessions",
    label: "Guest Sessions",
    icon: "mdi:cellphone-nfc",
    getValue: (data) => data.guest_active_sessions,
  },
  {
    key: "sessions_last_30_minutes",
    label: "Sessions (Last 30m)",
    icon: "mdi:history",
    getValue: (data) => data.sessions_last_30_minutes,
  },
  {
    key: "sessions_per_user_now",
    label: "Sessions Per User",
    icon: "mdi:chart-donut",
    getValue: (data) => data.sessions_per_user_now,
  },
];

const emptyLiveUsersData: LiveUsersData = {
  live_users: 0,
  active_users_now: 0,
  active_sessions: 0,
  users_last_5_minutes: 0,
  users_last_30_minutes: 0,
  logged_in_users_now: 0,
  guest_users_now: 0,
  logged_in_users_last_30_minutes: 0,
  guest_users_last_30_minutes: 0,
  logged_in_active_sessions: 0,
  guest_active_sessions: 0,
  sessions_last_30_minutes: 0,
  sessions_per_user_now: 0,
};

function formatValue(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return numberFormatter.format(value);
}

export default function LiveUsers() {
  const [liveUsersData, setLiveUsersData] = useState<LiveUsersData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLiveUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getLiveUsers();

      setLiveUsersData(response);
    } catch (fetchError) {
      setLiveUsersData(null);
      setError(getAnalyticsErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveUsers();
  }, [loadLiveUsers]);

  const lastUpdated = useMemo(() => {
    if (!liveUsersData?.updated_at) {
      return "-";
    }

    const date = new Date(liveUsersData.updated_at);

    if (Number.isNaN(date.getTime())) {
      return liveUsersData.updated_at;
    }

    return date.toLocaleString("en-IN");
  }, [liveUsersData]);

  return (
    <Card shadow="md">
      <CardBody className="gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Live Users</h2>
            <p className="text-sm text-default-500">
              Realtime activity snapshot from{" "}
              <span className="font-mono">/admin/analytics/live-users</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Chip className="font-mono text-xs" radius="sm" variant="flat">
              Last Updated: {lastUpdated}
            </Chip>

            <Button
              isLoading={isLoading}
              size="sm"
              startContent={
                !isLoading && <Icon icon="solar:refresh-bold" width="16" />
              }
              variant="flat"
              onPress={loadLiveUsers}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {isLoading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <Spinner label="Loading live users..." />
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((metric) => (
              <Card
                key={metric.key}
                className="border border-default-200"
                shadow="sm"
              >
                <CardBody className="gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-default-600">{metric.label}</p>
                    <Icon
                      className="text-default-500"
                      icon={metric.icon}
                      width="18"
                    />
                  </div>

                  <p className="text-2xl font-semibold text-foreground">
                    {formatValue(
                      metric.getValue(liveUsersData ?? emptyLiveUsersData),
                    )}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
