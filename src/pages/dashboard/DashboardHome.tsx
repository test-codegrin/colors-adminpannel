import { Card, CardBody } from "@heroui/react";

import { useAuth } from "@/context/AuthContext";

function DashboardHome() {
  const { admin } = useAuth();

  return (
    <Card>
      <CardBody className="gap-2">
        <h2 className="text-lg font-semibold">Welcome back</h2>
        <p className="text-default-600">{admin?.name ?? admin?.email ?? "Administrator"}</p>
        <p className="text-sm text-default-500">Use the sidebar to manage users and account actions.</p>
      </CardBody>
    </Card>
  );
}

export default DashboardHome;
