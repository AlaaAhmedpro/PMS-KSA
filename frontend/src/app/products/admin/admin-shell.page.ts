import { Component } from '@angular/core';
import { AppShellComponent } from '../../shared/shell/app-shell.component';
import { ADMIN_NAV } from './admin.nav';

@Component({
  selector: 'app-admin-shell',
  imports: [AppShellComponent],
  template: `
    <app-shell
      product="admin"
      brandKey="admin.brand"
      [navItems]="nav"
      homeRoute="/admin/dashboard"
      loginRoute="/admin/login"
    />
  `,
})
export class AdminShellPage {
  readonly nav = ADMIN_NAV;
}
