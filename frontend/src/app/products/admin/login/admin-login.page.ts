import { Component } from '@angular/core';
import { LoginPageComponent } from '../../../shared/login/login-page.component';

@Component({
  selector: 'app-admin-login',
  imports: [LoginPageComponent],
  template: `
    <app-login-page
      product="admin"
      titleKey="login.adminTitle"
      taglineKey="login.adminTagline"
      successRoute="/admin/dashboard"
      homeLink="/"
    />
  `,
})
export class AdminLoginPage {}
