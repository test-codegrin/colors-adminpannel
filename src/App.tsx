import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/layout/DashboardLayout";
import Login from "@/pages/Login";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import Users from "@/pages/dashboard/Users";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Payments from "./pages/dashboard/Payments";
import ContactMessages from "./pages/dashboard/ContactMessages";
import LiveUsers from "./pages/dashboard/LiveUsers";
import DevicesAnalytics from "./pages/dashboard/DevicesAnalytics";
import SubscriptionPlans from "./pages/dashboard/SubscriptionPlans";

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
          <Route element={<Payments />} path="payments" />
          <Route element={<SubscriptionPlans />} path="subscription-plans" />
          <Route element={<ContactMessages /> } path="contact" />
          <Route element={<LiveUsers />} path="live-users" />
          <Route element={<DevicesAnalytics />} path="devices-analytics" />
        </Route>
      </Route>

      <Route element={<Navigate replace to={token ? "/dashboard" : "/login"} />} path="*" />
    </Routes>
  );
}

export default App;
