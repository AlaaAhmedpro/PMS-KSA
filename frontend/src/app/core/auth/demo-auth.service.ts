import { Injectable, signal } from '@angular/core';

export type DemoProduct = 'app' | 'admin';

export interface DemoSession {
  product: DemoProduct;
  name: string;
  email: string;
  role: string;
}

const STORAGE_KEY = 'pms.demo.session';

@Injectable({ providedIn: 'root' })
export class DemoAuthService {
  readonly session = signal<DemoSession | null>(this.read());

  isAuthenticated(product: DemoProduct): boolean {
    const current = this.session();
    return !!current && current.product === product;
  }

  login(product: DemoProduct, email: string): DemoSession {
    const session: DemoSession =
      product === 'admin'
        ? {
            product,
            name: 'نورة فهد الشمري',
            email: email || 'platform.ops@pms.sa',
            role: 'مسؤول المنصة',
          }
        : {
            product,
            name: 'عبدالله محمد العتيبي',
            email: email || 'a.alotaibi@projects.gov.sa',
            role: 'مدير مشاريع',
          };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
    return session;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }

  private read(): DemoSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as DemoSession;
    } catch {
      return null;
    }
  }
}
