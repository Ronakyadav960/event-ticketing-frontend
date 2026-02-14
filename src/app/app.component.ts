import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {

  private router = inject(Router);
  private destroy$ = new Subject<void>();

  auth = inject(AuthService);

  isLoginPage = false;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.isLoginPage = event.urlAfterRedirects.includes('/login');
      });
  }

  // ✅ Safe navigation helper
  go(path: string): void {
    if (!path) return;
    this.router.navigateByUrl(path);
  }

  // ✅ Proper logout handler
  logout(): void {
    try {
      this.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      this.router.navigate(['/login']);
    }
  }

  // ✅ Strong login detection
  get isLoggedIn(): boolean {
    try {
      if (typeof this.auth.isLoggedIn === 'function') {
        return this.auth.isLoggedIn();
      }
      return !!localStorage.getItem('token');
    } catch {
      return false;
    }
  }

  // ✅ Prevent memory leaks
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
