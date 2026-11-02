import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./store/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PlatformTenants } from "./pages/platform/PlatformTenants";
import { PlatformPlans } from "./pages/platform/PlatformPlans";
import { PlatformDemoRequests } from "./pages/platform/PlatformDemoRequests";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/tenants" element={<PlatformTenants />} />
        <Route path="/plans" element={<PlatformPlans />} />
        <Route path="/demo-requests" element={<PlatformDemoRequests />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
