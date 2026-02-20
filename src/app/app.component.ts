import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {

  private router = inject(Router);
  private authService = inject(AuthService);

  private destroy$ = new Subject<void>();

  isLoginPage = false;
  isRegisterPage = false;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;

        this.isLoginPage = url.includes('/login');
        this.isRegisterPage = url.includes('/register');
      });
  }

  // =====================
  // ROLE HELPERS
  // =====================

  get currentUser() {
    return this.authService.getUser();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get isUser(): boolean {
    return this.currentUser?.role === 'user';
  }

  get isCreator(): boolean {
    return this.currentUser?.role === 'creator';
  }

  get isSuperAdmin(): boolean {
    return this.currentUser?.role === 'superadmin';
  }

  // Superadmin should also see creator features
  get canManageEvents(): boolean {
    return this.isCreator || this.isSuperAdmin;
  }

  // =====================
  // LOGOUT
  // =====================

  logout(): void {
    try {
      this.authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
