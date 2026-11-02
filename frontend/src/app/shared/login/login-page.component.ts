import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { DemoAuthService, DemoProduct } from '../../core/auth/demo-auth.service';
import { LocaleService } from '../../core/locale/locale.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TranslatePipe, Button, InputText, Password, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements OnInit {
  private readonly auth = inject(DemoAuthService);
  private readonly router = inject(Router);
  private readonly locale = inject(LocaleService);

  readonly product = input.required<DemoProduct>();
  readonly titleKey = input.required<string>();
  readonly taglineKey = input.required<string>();
  readonly successRoute = input.required<string>();
  readonly homeLink = input('/');

  email = '';
  password = '';
  readonly errorKey = signal<string | null>(null);
  readonly language = this.locale.language;

  ngOnInit(): void {
    this.locale.init();
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.locale.setLanguage(lang);
  }

  submit(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorKey.set('login.errors.required');
      return;
    }
    this.errorKey.set(null);
    this.auth.login(this.product(), this.email.trim());
    void this.router.navigateByUrl(this.successRoute());
  }
}
