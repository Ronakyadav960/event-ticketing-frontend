import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private router = inject(Router);
  auth = inject(AuthService);

  // ✅ NEW: login page detection
  isLoginPage = false;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const e = event as NavigationEnd;
        this.isLoginPage = e.urlAfterRedirects.includes('/login');
      });
  }

  // navigate helper (already used)
  go(path: string) {
    this.router.navigateByUrl(path);
  }

  // ✅ logout for top navbar
  logout(): void {
    this.auth.logout(); // remove token / user data
    this.router.navigate(['/login']);
  }

  // optional: show logout only when logged in
  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn
      ? this.auth.isLoggedIn()
      : !!localStorage.getItem('token');
  }
}
