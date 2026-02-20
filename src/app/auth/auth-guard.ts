import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';

function isTokenExpired(token: string): boolean {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;

    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    const exp = payload?.exp;
    if (!exp) return false;

    const now = Math.floor(Date.now() / 1000);
    return exp < now;
  } catch {
    return true;
  }
}

function getUserRole(): string | null {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user)?.role || null;
  } catch {
    return null;
  }
}

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): boolean | UrlTree => {

  const router = inject(Router);
  const token = localStorage.getItem('token');

  // 🔒 1️⃣ Must have token
  if (!token) {
    return router.parseUrl('/login');
  }

  // 🔒 2️⃣ Token should not be expired
  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return router.parseUrl('/login');
  }

  // 🔒 3️⃣ Role-based check (if required)
  const requiredRole = route.data?.['role'];

  if (requiredRole) {
    const userRole = getUserRole();

    // Allow superadmin everywhere
    if (userRole === 'superadmin') {
      return true;
    }

    if (userRole !== requiredRole) {
      return router.parseUrl('/events');
    }
  }

  return true;
};
