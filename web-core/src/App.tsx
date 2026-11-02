import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./store/AuthContext";
import { useCan } from "./store/RbacContext";
import { useOrgModules } from "./hooks/useOrgModules";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { HierarchyDashboard } from "./pages/HierarchyDashboard";
import { PortfoliosPage } from "./pages/PortfoliosPage";
import { PortfolioFormPage } from "./pages/PortfolioFormPage";
import { PortfolioDetailPage } from "./pages/PortfolioDetailPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { InitiativesPage } from "./pages/InitiativesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { PeoplePage } from "./pages/PeoplePage";
import { Permissions } from "./pages/Permissions";
import { Reports } from "./pages/Reports";
import { Archive } from "./pages/Archive";
import { LookupsAdmin } from "./pages/LookupsAdmin";
import { StructureMapPage } from "./pages/StructureMapPage";
import { StrategicOverviewPage } from "./pages/StrategicOverviewPage";
import { ObjectivesPage } from "./pages/ObjectivesPage";
import { OrganizationPortfolioSettingsPage } from "./pages/OrganizationPortfolioSettingsPage";

const RETURN_KEY = "pms_core_return_path";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const location = useLocation();
  if (!user || !session) {
    try {
      if (location.pathname !== "/login") {
        sessionStorage.setItem(RETURN_KEY, location.pathname + location.search);
      }
    } catch {
      /* ignore */
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function RequirePerm({
  allow,
  children,
}: {
  allow: boolean;
  children: ReactNode;
}) {
  if (!allow) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const can = useCan();
  const role = user?.role;
  const { canAccessPortfolio, canAccessProgram, canAccessInitiative } =
    useOrgModules();

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
        <Route path="/" element={<HierarchyDashboard />} />
        <Route
          path="/strategy"
          element={
            <RequirePerm
              allow={
                canAccessPortfolio("view") ||
                canAccessProgram("view") ||
                canAccessInitiative("view") ||
                can.manageRecords(role) ||
                can.execute(role)
              }
            >
              <StrategicOverviewPage />
            </RequirePerm>
          }
        />
        <Route
          path="/structure"
          element={
            <RequirePerm
              allow={
                canAccessPortfolio("view") ||
                canAccessProgram("view") ||
                canAccessInitiative("view") ||
                can.manageRecords(role) ||
                can.execute(role)
              }
            >
              <StructureMapPage />
            </RequirePerm>
          }
        />
        <Route
          path="/objectives"
          element={
            <RequirePerm allow={canAccessInitiative("view")}>
              <ObjectivesPage />
            </RequirePerm>
          }
        />
        <Route
          path="/portfolios/dashboard"
          element={<Navigate to="/portfolios?tab=dashboard" replace />}
        />
        <Route
          path="/portfolios/new"
          element={
            <RequirePerm allow={canAccessPortfolio("manage")}>
              <PortfolioFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="/portfolios/:id/edit"
          element={
            <RequirePerm allow={canAccessPortfolio("manage")}>
              <PortfolioFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="/portfolios/:id"
          element={
            <RequirePerm allow={canAccessPortfolio("view")}>
              <PortfolioDetailPage />
            </RequirePerm>
          }
        />
        <Route
          path="/portfolios"
          element={
            <RequirePerm allow={canAccessPortfolio("view")}>
              <PortfoliosPage />
            </RequirePerm>
          }
        />
        <Route
          path="/programs"
          element={
            <RequirePerm allow={canAccessProgram("view")}>
              <ProgramsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/initiatives"
          element={
            <RequirePerm allow={canAccessInitiative("view")}>
              <InitiativesPage />
            </RequirePerm>
          }
        />
        <Route
          path="/projects"
          element={
            <RequirePerm
              allow={
                can.manageRecords(role) ||
                can.execute(role) ||
                can.closeRecords(role)
              }
            >
              <ProjectsPage />
            </RequirePerm>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequirePerm
              allow={
                can.manageRecords(role) ||
                can.execute(role) ||
                can.closeRecords(role)
              }
            >
              <ProjectDetailPage />
            </RequirePerm>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequirePerm
              allow={
                can.manageRecords(role) ||
                can.execute(role) ||
                can.closeRecords(role)
              }
            >
              <TasksPage />
            </RequirePerm>
          }
        />
        <Route
          path="/people"
          element={
            <RequirePerm allow={can.managePeople(role)}>
              <PeoplePage />
            </RequirePerm>
          }
        />

        {can.viewSettings(role) && (
          <>
            <Route path="/permissions" element={<Permissions />} />
            <Route
              path="/settings/portfolio"
              element={<OrganizationPortfolioSettingsPage />}
            />
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
