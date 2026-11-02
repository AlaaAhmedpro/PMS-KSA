import { Component } from '@angular/core';
import { LoginPageComponent } from '../../../shared/login/login-page.component';

@Component({
  selector: 'app-core-login',
  imports: [LoginPageComponent],
  template: `
    <app-login-page
      product="app"
      titleKey="login.appTitle"
      taglineKey="login.appTagline"
      successRoute="/app/dashboard"
      homeLink="/"
    />
  `,
})
export class AppLoginPage {}
