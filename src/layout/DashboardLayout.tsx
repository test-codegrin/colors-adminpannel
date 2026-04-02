import { useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Outlet, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/layout/Sidebar";
import { ThemeSwitch } from "@/components/theme-switch";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Analytics Dashboard";
  if (pathname === "/dashboard/users") return "Users";
  if (pathname === "/dashboard/payments") return "Payments";
  if (pathname === "/dashboard/subscription-plans") return "Subscription Plans";
  if (pathname === "/dashboard/color-stories") return "Color Stories";
  if (pathname === "/dashboard/contact") return "Contact Messages";
  if (pathname === "/dashboard/live-users") return "Live Users";
  if (pathname === "/dashboard/devices-analytics") return "Devices Analytics";
  if (pathname === "/dashboard/beta-plans") return "Beta Plans";
  if (pathname === "/dashboard/activity-feed") return "Activity Feed";

  return "Admin Panel";
}

function DashboardLayout() {
  const { admin } = useAuth();
  const { pathname } = useLocation();

  // Desktop: sidebar open by default; Mobile: closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 768
  );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-default-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main
        className={`
          flex-1 transition-all duration-300
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
          p-4 md:p-6
          min-w-0
        `}
      >
        {/* Top Bar */}
        <Card className="mb-6">
          <CardBody className="flex md:flex-row md:items-center justify-between py-3 px-4 gap-2">
            {/* Left Side */}
            <div className="flex items-center gap-2 min-w-0">
              <Button isIconOnly variant="light" onPress={toggleSidebar}>
                <Icon icon="mdi:menu" width="22" />
              </Button>
              <h1 className="text-base sm:text-xl font-semibold truncate">
                {getPageTitle(pathname)}
              </h1>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3 shrink-0">
              <p className="block text-sm text-default-500 truncate max-w-[160px]">
                {admin?.email ?? "Admin"}
              </p>
              <ThemeSwitch className="hidden sm:flex gap-2 mr-1" />
            </div>
          </CardBody>
        </Card>

        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;