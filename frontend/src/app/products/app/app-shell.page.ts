import { Component } from '@angular/core';
import { AppShellComponent } from '../../shared/shell/app-shell.component';
import { APP_NAV } from './app.nav';

@Component({
  selector: 'app-core-shell',
  imports: [AppShellComponent],
  template: `
    <app-shell
      product="app"
      brandKey="core.brand"
      [navItems]="nav"
      homeRoute="/app/dashboard"
      loginRoute="/app/login"
    />
  `,
})
export class AppShellPage {
  readonly nav = APP_NAV;
}
