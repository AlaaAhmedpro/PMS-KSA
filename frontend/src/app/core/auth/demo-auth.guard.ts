import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DemoAuthService, DemoProduct } from './demo-auth.service';

export function demoAuthGuard(product: DemoProduct): CanActivateFn {
  return () => {
    const auth = inject(DemoAuthService);
    const router = inject(Router);
    if (auth.isAuthenticated(product)) {
      return true;
    }
    return router.createUrlTree([product === 'admin' ? '/admin/login' : '/app/login']);
  };
}
