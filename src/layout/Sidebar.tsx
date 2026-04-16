import { Button } from "@heroui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const USERS_ROUTE_PATH = "/dashboard/users";

const navItems: NavItem[] = [
  { label: "Analytics", path: "/dashboard", icon: "mdi:view-dashboard-outline" },
  { label: "Users", path: "/dashboard/users", icon: "mdi:account-group-outline" },
  { label: "Help Desk", path: "/dashboard/help-desk", icon: "quill:chat" },
  { label: "Payments", path: "/dashboard/payments", icon: "mdi:credit-card-outline" },
  { label: "Subscription Plans", path: "/dashboard/subscription-plans", icon: "mdi:ticket-confirmation-outline" },
  { label: "Color Stories", path: "/dashboard/color-stories", icon: "mdi:book-open-page-variant-outline" },
  { label: "Case Studies", path: "/dashboard/case-studies", icon: "mdi:file-document-multiple-outline" },
  { label: "Contact Messages", path: "/dashboard/contact", icon: "fluent-mdl2:contact" },
  { label: "Live Users", path: "/dashboard/live-users", icon: "mdi:account-clock-outline" },
  { label: "Devices Analytics", path: "/dashboard/devices-analytics", icon: "mdi:desktop-mac-dashboard" },
  { label: "Game Score", path: "/dashboard/game-score", icon: "mdi:gamepad-variant-outline" },
  { label: "Beta Plans", path: "/dashboard/beta-plans", icon: "mdi:beta" },
  { label: "Activity Feed", path: "/dashboard/activity-feed", icon: "mdi:pulse" },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavigate = (path: string) => {
    if (path === USERS_ROUTE_PATH) {
      navigate(path, {
        replace: path === pathname,
        state: { usersResetAt: Date.now() },
      });
    } else {
      navigate(path);
    }

    // ✅ Close sidebar on mobile after click
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        // onClick={onClose} // ✅ click outside closes sidebar
      />

      {/* Sidebar */}
      <aside
        className="
          fixed top-0 left-0 z-40 h-screen
          bg-content1 border-r border-default-200
          transition-all duration-300
          flex flex-col
          w-64 p-4
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-semibold tracking-wide">Admin Panel</div>

          <Button
            isIconOnly
            className="lg:hidden"
            size="sm"
            variant="light"
            onPress={onClose}
          >
            <Icon icon="mdi:close" width="20" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col mt-4 gap-2 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <Button
                key={item.path}
                className="justify-start gap-3 text-base font-medium"
                color={isActive ? "primary" : "default"}
                radius="md"
                startContent={
                  <Icon
                    className={isActive ? "text-white" : "text-default-500"}
                    icon={item.icon}
                    width="23"
                  />
                }
                variant={isActive ? "solid" : "light"}
                onPress={() => handleNavigate(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-6">
          <Button
            fullWidth
            className="justify-start gap-3 bg-danger/10 hover:bg-danger/20 text-danger"
            variant="flat"
            onPress={handleLogout}
          >
            <Icon icon="ic:outline-remove-circle-outline" width="20" />
            Log Out
          </Button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;