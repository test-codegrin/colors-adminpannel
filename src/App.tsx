import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/layout/DashboardLayout";
import Login from "@/pages/Login";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import Users from "@/pages/dashboard/Users";
import ProtectedRoute from "@/routes/ProtectedRoute";

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route element={<Navigate replace to={token ? "/dashboard" : "/login"} />} path="/" />
      <Route element={<Login />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />} path="/dashboard">
          <Route element={<DashboardHome />} index />
          <Route element={<Users />} path="users" />
        </Route>
      </Route>

      <Route element={<Navigate replace to={token ? "/dashboard" : "/login"} />} path="*" />
    </Routes>
  );
}

export default App;
