import { Button } from "@heroui/react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Users", path: "/dashboard/users" },
];

function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-full border-b border-default-200 bg-content1 p-4 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-6 text-lg font-semibold">Admin Panel</div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Button
              key={item.path}
              className="justify-start"
              color={isActive ? "primary" : "default"}
              variant={isActive ? "solid" : "light"}
              onPress={() => navigate(item.path)}
            >
              {item.label}
            </Button>
          );
        })}
        <Button className="justify-start" color="danger" variant="light" onPress={handleLogout}>
          Logout
        </Button>
      </nav>
    </aside>
  );
}

export default Sidebar;
