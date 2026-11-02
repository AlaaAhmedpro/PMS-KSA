import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyDemoDataMigration } from "../lib/demoSeed";
import {
  SEED_DEMO_REQUESTS,
  SEED_PLANS,
  SEED_TENANTS,
} from "../lib/platformSeed";
import type {
  DemoRequest,
  DemoRequestStatus,
  PlatformTenant,
  SubscriptionPlan,
  TenantStatus,
} from "../lib/types";

const LS_TENANTS = "pms_tenants_v1";
const LS_PLANS = "pms_plans_v1";
const LS_DEMO_REQUESTS = "pms_demo_requests_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

interface PlatformContextValue {
  tenants: PlatformTenant[];
  plans: SubscriptionPlan[];
  demoRequests: DemoRequest[];
  updateTenantStatus: (id: string, status: TenantStatus) => void;
  updateDemoRequestStatus: (id: string, status: DemoRequestStatus) => void;
  togglePlanActive: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  applyDemoDataMigration();

  const [tenants, setTenants] = useState<PlatformTenant[]>(() =>
    load(LS_TENANTS, SEED_TENANTS),
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    load(LS_PLANS, SEED_PLANS),
  );
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>(() =>
    load(LS_DEMO_REQUESTS, SEED_DEMO_REQUESTS),
  );

  useEffect(() => save(LS_TENANTS, tenants), [tenants]);
  useEffect(() => save(LS_PLANS, plans), [plans]);
  useEffect(() => save(LS_DEMO_REQUESTS, demoRequests), [demoRequests]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      tenants,
      plans,
      demoRequests,
      updateTenantStatus: (id, status) =>
        setTenants((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t)),
        ),
      updateDemoRequestStatus: (id, status) =>
        setDemoRequests((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d)),
        ),
      togglePlanActive: (id) =>
        setPlans((prev) =>
          prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        ),
    }),
    [tenants, plans, demoRequests],
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
