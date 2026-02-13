import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

function isTokenExpired(token: string): boolean {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;

    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    const exp = payload?.exp; // exp in seconds
    if (!exp) return false; // if no exp, assume valid

    const now = Math.floor(Date.now() / 1000);
    return exp < now;
  } catch {
    return true;
  }
}

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);

  const token = localStorage.getItem('token');

  // ✅ Must have token
  if (!token) {
    return router.parseUrl('/login');
  }

  // ✅ Token should not be expired
  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    return router.parseUrl('/login');
  }

  // ✅ Token valid => allow (no extra state dependency)
  return true;
};
