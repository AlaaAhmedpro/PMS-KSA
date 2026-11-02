import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { can, type PlatformPermission } from "../../lib/platformRbac";

export function RequirePerm({
  perm,
  children,
}: {
  perm: PlatformPermission;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!can(user?.role, perm)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
