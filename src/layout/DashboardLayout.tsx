import { Card, CardBody } from "@heroui/react";
import { Outlet } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/layout/Sidebar";

function DashboardLayout() {
  const { admin } = useAuth();

  return (
    <div className="min-h-screen bg-default-50 md:flex">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6">
        <Card className="mb-6">
          <CardBody className="flex flex-row items-center justify-between py-4">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-default-500">{admin?.email ?? "Admin"}</p>
          </CardBody>
        </Card>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
