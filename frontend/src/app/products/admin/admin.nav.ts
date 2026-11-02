import { ShellNavItem } from '../../shared/shell/shell-nav.model';

export const ADMIN_NAV: ShellNavItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', icon: 'dashboard', route: '/admin/dashboard' },
  { id: 'tenants', labelKey: 'admin.nav.tenants', icon: 'apartment', route: '/admin/tenants', expandable: true },
  { id: 'plans', labelKey: 'admin.nav.plans', icon: 'workspace_premium', route: '/admin/plans' },
  { id: 'demoRequests', labelKey: 'admin.nav.demoRequests', icon: 'inbox', route: '/admin/demo-requests' },
];
