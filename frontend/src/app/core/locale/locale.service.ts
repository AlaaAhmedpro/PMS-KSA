import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'pms.locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);

  readonly language = signal<AppLanguage>(this.readStoredLanguage());

  init(): void {
    this.apply(this.language());
  }

  setLanguage(lang: AppLanguage): void {
    if (this.language() === lang) {
      return;
    }
    this.apply(lang);
  }

  toggleLanguage(): void {
    this.setLanguage(this.language() === 'ar' ? 'en' : 'ar');
  }

  private apply(lang: AppLanguage): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const root = document.documentElement;

    root.lang = lang;
    root.dir = dir;

    this.translate.use(lang);
    this.language.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private readStoredLanguage(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ar';
  }
}
