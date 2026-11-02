import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./store/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { RequirePerm } from "./components/sa/RequirePerm";
import { Login } from "./pages/Login";
import { OverviewPage } from "./pages/saas/OverviewPage";
import { OrganizationsPage } from "./pages/saas/OrganizationsPage";
import { OrganizationDetailPage } from "./pages/saas/OrganizationDetailPage";
import { OrganizationOnboardPage } from "./pages/saas/OrganizationOnboardPage";
import { PlansPage } from "./pages/saas/PlansPage";
import { PlanEditPage } from "./pages/saas/PlanEditPage";
import { SubscriptionsPage } from "./pages/saas/SubscriptionsPage";
import { BillingPage } from "./pages/saas/BillingPage";
import { AnalyticsPage } from "./pages/saas/AnalyticsPage";
import { LeadsPage } from "./pages/saas/LeadsPage";
import { SupportPage } from "./pages/saas/SupportPage";
import { PlatformUsersPage } from "./pages/saas/PlatformUsersPage";
import { MonitoringPage } from "./pages/saas/MonitoringPage";
import { AuditPage } from "./pages/saas/AuditPage";
import { SettingsPage } from "./pages/saas/SettingsPage";

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
        <Route
          path="/"
          element={
            <RequirePerm perm="overview">
              <OverviewPage />
            </RequirePerm>
          }
        />
        <Route
          path="/organizations"
          element={
            <RequirePerm perm="organizations">
              <OrganizationsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/organizations/new"
          element={
            <RequirePerm perm="organizations">
              <OrganizationOnboardPage />
            </RequirePerm>
          }
        />
        <Route
          path="/organizations/:id"
          element={
            <RequirePerm perm="organizations">
              <OrganizationDetailPage />
            </RequirePerm>
          }
        />
        <Route
          path="/platform-users"
          element={
            <RequirePerm perm="platform_users">
              <PlatformUsersPage />
            </RequirePerm>
          }
        />
        <Route
          path="/support"
          element={
            <RequirePerm perm="support">
              <SupportPage />
            </RequirePerm>
          }
        />
        <Route
          path="/plans"
          element={
            <RequirePerm perm="plans">
              <PlansPage />
            </RequirePerm>
          }
        />
        <Route
          path="/plans/:id"
          element={
            <RequirePerm perm="plans">
              <PlanEditPage />
            </RequirePerm>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <RequirePerm perm="subscriptions">
              <SubscriptionsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/billing"
          element={
            <RequirePerm perm="billing">
              <BillingPage />
            </RequirePerm>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequirePerm perm="analytics">
              <AnalyticsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/leads"
          element={
            <RequirePerm perm="leads">
              <LeadsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/monitoring"
          element={
            <RequirePerm perm="monitoring">
              <MonitoringPage />
            </RequirePerm>
          }
        />
        <Route
          path="/audit"
          element={
            <RequirePerm perm="audit">
              <AuditPage />
            </RequirePerm>
          }
        />
        <Route
          path="/settings"
          element={
            <RequirePerm perm="settings">
              <SettingsPage />
            </RequirePerm>
          }
        />

        {/* legacy redirects */}
        <Route path="/tenants" element={<Navigate to="/organizations" replace />} />
        <Route path="/demo-requests" element={<Navigate to="/leads" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
