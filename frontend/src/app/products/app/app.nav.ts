import { ShellNavItem } from '../../shared/shell/shell-nav.model';

export const APP_NAV: ShellNavItem[] = [
  { id: 'dashboard', labelKey: 'core.nav.dashboard', icon: 'dashboard', route: '/app/dashboard' },
  { id: 'employees', labelKey: 'core.nav.employees', icon: 'group', route: '/app/employees', expandable: true },
  { id: 'projects', labelKey: 'core.nav.projects', icon: 'account_tree', route: '/app/dashboard', expandable: true },
  { id: 'reports', labelKey: 'core.nav.reports', icon: 'monitoring', route: '/app/dashboard' },
];
