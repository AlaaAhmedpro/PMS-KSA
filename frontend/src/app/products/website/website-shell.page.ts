import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LocaleService } from '../../core/locale/locale.service';

@Component({
  selector: 'app-website-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './website-shell.page.html',
  styleUrl: './website-shell.page.scss',
})
export class WebsiteShellPage implements OnInit {
  private readonly locale = inject(LocaleService);
  readonly language = this.locale.language;

  ngOnInit(): void {
    this.locale.init();
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.locale.setLanguage(lang);
  }
}
