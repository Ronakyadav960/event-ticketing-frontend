import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="login-box">
    <h2>Login</h2>

    <input
      type="email"
      placeholder="Email"
      [(ngModel)]="email"
    />

    <input
      type="password"
      placeholder="Password"
      [(ngModel)]="password"
    />

    <button (click)="login()">Login</button>

    <p class="error" *ngIf="error">{{ error }}</p>

    <p class="register-text">
      Don’t have an account?
      <span (click)="goToRegister()">Register</span>
    </p>
  </div>
  `,
  styles: [`
    .login-box {
      width: 320px;
      margin: 100px auto;
      padding: 25px;
      border-radius: 10px;
      background: white;
      box-shadow: 0 10px 20px rgba(0,0,0,.15);
      text-align: center;
    }
    input {
      width: 100%;
      margin: 10px 0;
      padding: 10px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .error {
      color: red;
      margin-top: 10px;
    }
    .register-text {
      margin-top: 15px;
      font-size: 14px;
    }
    .register-text span {
      color: #4f46e5;
      cursor: pointer;
      font-weight: 600;
    }
    .register-text span:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  goToRegister() {
    this.router.navigate(['/register']);
  }

  login() {
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res: any) => {
        // ✅ save token + user (role included)
        this.auth.saveAuthData(res.token, res.user);

        const role = res?.user?.role;

        // ✅ ROLE BASED REDIRECT (FIXED)
        if (role === 'admin') {
          this.router.navigate(['/dashboard']); // admin portal dashboard
        } else {
          this.router.navigate(['/events']); // user landing page
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Invalid email or password';
      }
    });
  }
}
