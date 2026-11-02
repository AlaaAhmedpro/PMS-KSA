import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./store/AuthContext";
import { useCan } from "./store/RbacContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { RecordsList } from "./pages/RecordsList";
import { RecordForm } from "./pages/RecordForm";
import { RecordDetail } from "./pages/RecordDetail";
import { NewsAdmin } from "./pages/NewsAdmin";
import { Permissions } from "./pages/Permissions";
import { Reports } from "./pages/Reports";
import { Archive } from "./pages/Archive";
import { LookupsAdmin } from "./pages/LookupsAdmin";
import { PlatformTenants } from "./pages/platform/PlatformTenants";
import { PlatformPlans } from "./pages/platform/PlatformPlans";
import { PlatformDemoRequests } from "./pages/platform/PlatformDemoRequests";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePlatform({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const can = useCan();
  if (!user || !can.viewPlatform(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const can = useCan();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route path="/projects" element={<RecordsList kind="project" />} />
        <Route path="/projects/new" element={<RecordForm kind="project" />} />
        <Route path="/projects/:id" element={<RecordDetail kind="project" />} />
        <Route
          path="/projects/:id/edit"
          element={<RecordForm kind="project" />}
        />

        <Route path="/tasks" element={<RecordsList kind="task" />} />
        <Route path="/tasks/new" element={<RecordForm kind="task" />} />
        <Route path="/tasks/:id" element={<RecordDetail kind="task" />} />
        <Route path="/tasks/:id/edit" element={<RecordForm kind="task" />} />

        {can.viewPlatform(user?.role) && (
          <>
            <Route
              path="/platform/tenants"
              element={
                <RequirePlatform>
                  <PlatformTenants />
                </RequirePlatform>
              }
            />
            <Route
              path="/platform/plans"
              element={
                <RequirePlatform>
                  <PlatformPlans />
                </RequirePlatform>
              }
            />
            <Route
              path="/platform/demo-requests"
              element={
                <RequirePlatform>
                  <PlatformDemoRequests />
                </RequirePlatform>
              }
            />
          </>
        )}

        {can.manageNews(user?.role, user?.newsAdmin) && (
          <Route path="/news" element={<NewsAdmin />} />
        )}
        {can.viewSettings(user?.role) && (
          <>
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/lookups" element={<LookupsAdmin />} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
