import { useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Outlet } from "react-router-dom";
import { Icon } from "@iconify/react";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/layout/Sidebar";
import { ThemeSwitch } from "@/components/theme-switch";

function DashboardLayout() {
  const { admin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-default-50 flex">
      {/* Sidebar */}
      {isSidebarOpen && <Sidebar isOpen={isSidebarOpen} />}

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "md:ml-0" : "w-full"
        } p-4 md:p-6`}
      >
        <Card className="mb-6">
          <CardBody className="flex flex-row items-center justify-between py-4">
            {/* Left Side */}
            <div className="flex items-center gap-3">
              {/* Toggle Button */}
              <Button isIconOnly variant="light" onPress={toggleSidebar}>
                <Icon
                  icon={isSidebarOpen ? "mdi:menu" : "mdi:menu"}
                  width="22"
                />
              </Button>

              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6">
              <p className="text-sm text-default-500">
                {admin?.email ?? "Admin"}
              </p>
              <ThemeSwitch className="hidden sm:flex gap-2 mr-3" />
            </div>
          </CardBody>
        </Card>

        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
