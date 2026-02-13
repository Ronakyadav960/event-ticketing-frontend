import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Check if logged in
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if admin
  const user = auth.getUser();
  if (user?.role === 'admin') {
    return true;
  }

  // Not an admin — redirect to user dashboard
  alert('Admin access only');
  router.navigate(['/dashboard']);
  return false;
};
