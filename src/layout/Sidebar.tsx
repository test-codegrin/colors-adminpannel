import { Button } from "@heroui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "mdi:view-dashboard-outline",
  },
  {
    label: "Users",
    path: "/dashboard/users",
    icon: "mdi:account-group-outline",
  },
  {
    label: "Payments",
    path: "/dashboard/payments",
    icon: "mdi:credit-card-outline",
  },
];

function Sidebar({ isOpen }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`
        bg-content1 border-r border-default-200
        transition-all duration-300
        ${isOpen ? "w-64 p-4" : "w-0 overflow-hidden"}
        hidden md:flex flex-col h-screen
      `}
    >
      {/* Header */}
      <div className="text-xl font-semibold tracking-wide mb-8">
        Admin Panel
      </div>

      {/* Navigation */}
      <nav className="flex flex-col mt-10 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Button
              key={item.path}
              className="justify-start gap-3 text-base font-medium"
              color={isActive ? "primary" : "default"}
              variant={isActive ? "solid" : "light"}
              radius="md"
              onPress={() => navigate(item.path)}
              startContent={
                <Icon
                  icon={item.icon}
                  width="23"
                  className={isActive ? "text-white" : "text-default-500"}
                />
              }
            >
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Logout Button at Bottom */}
      <div className="mt-auto pt-6">
        <Button
          fullWidth
          variant="flat"
          onPress={handleLogout}
          className="
            justify-start gap-3
            bg-danger/10 
            hover:bg-danger/20 
            text-danger 
            hover:text-danger
            text-md
          "
        >
          <Icon
            icon="ic:outline-remove-circle-outline"
            width="20"
            className="text-danger"
          />
          Log Out
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
