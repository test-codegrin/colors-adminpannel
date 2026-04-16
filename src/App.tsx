import { Navigate, Route, Routes } from "react-router-dom";

import Payments from "./pages/dashboard/Payments";
import ContactMessages from "./pages/dashboard/ContactMessages";
import LiveUsers from "./pages/dashboard/LiveUsers";
import DevicesAnalytics from "./pages/dashboard/DevicesAnalytics";
import SubscriptionPlans from "./pages/dashboard/SubscriptionPlans";
import BetaPlans from "./pages/dashboard/BetaPlans";
import ActivityFeed from "./pages/dashboard/ActivityFeed";
import ColorStories from "./pages/dashboard/ColorStories";
import GameScore from "./pages/dashboard/GameScore";
import CaseStudies from "./pages/dashboard/CaseStudies";

import ProtectedRoute from "@/routes/ProtectedRoute";
import Users from "@/pages/dashboard/Users";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import Login from "@/pages/Login";
import DashboardLayout from "@/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import ChatMessages from "./pages/dashboard/ChatMessages";

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        element={<Navigate replace to={token ? "/dashboard" : "/login"} />}
        path="/"
      />
      <Route element={<Login />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />} path="/dashboard">
          <Route index element={<DashboardHome />} />
          <Route element={<Users />} path="users" />
          <Route element={<ChatMessages />} path="help-desk" />
          <Route element={<Payments />} path="payments" />
          <Route element={<SubscriptionPlans />} path="subscription-plans" />
          <Route element={<ColorStories />} path="color-stories" />
          <Route element={<CaseStudies />} path="case-studies" />
          <Route element={<ContactMessages />} path="contact" />
          <Route element={<LiveUsers />} path="live-users" />
          <Route element={<DevicesAnalytics />} path="devices-analytics" />
          <Route element={<GameScore />} path="game-score" />
          <Route element={<BetaPlans />} path="beta-plans" />
          <Route element={<ActivityFeed />} path="activity-feed" />
        </Route>
      </Route>

      <Route
        element={<Navigate replace to={token ? "/dashboard" : "/login"} />}
        path="*"
      />
    </Routes>
  );
}

export default App;
