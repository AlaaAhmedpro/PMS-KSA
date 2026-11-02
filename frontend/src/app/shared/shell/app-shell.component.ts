import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DemoAuthService, DemoProduct } from '../../core/auth/demo-auth.service';
import { LocaleService } from '../../core/locale/locale.service';
import { ShellNavItem } from './shell-nav.model';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private readonly locale = inject(LocaleService);
  private readonly auth = inject(DemoAuthService);
  private readonly router = inject(Router);

  readonly product = input.required<DemoProduct>();
  readonly brandKey = input.required<string>();
  readonly navItems = input.required<ShellNavItem[]>();
  readonly homeRoute = input.required<string>();
  readonly loginRoute = input.required<string>();
  readonly breadcrumbs = input<{ labelKey: string }[]>([]);

  readonly language = this.locale.language;
  readonly session = this.auth.session;
  readonly menuCollapsed = signal(false);

  ngOnInit(): void {
    this.locale.init();
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.locale.setLanguage(lang);
  }

  toggleMenu(): void {
    this.menuCollapsed.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl(this.loginRoute());
  }
}
