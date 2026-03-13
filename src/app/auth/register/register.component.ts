import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-box">
      <h2>Register</h2>

      <ng-container *ngIf="!otpStep">
        <!-- Name -->
        <input placeholder="Name" [(ngModel)]="name" />
        <small class="error" *ngIf="submitted && !name">
          Name is required
        </small>

        <!-- Email -->
        <input type="email" placeholder="Email" [(ngModel)]="email" />
        <small class="error" *ngIf="submitted && !validEmail()">
          Valid email is required
        </small>

      <!-- Password -->
      <input type="password" placeholder="Password" [(ngModel)]="password" />
      <small class="hint">
        Password must include:
        <span [class.ok]="hasUpper()">1 uppercase letter</span>,
        <span [class.ok]="hasSymbol()">1 symbol</span>,
        <span [class.ok]="hasTwoNumbers()">2 numbers</span>,
        <span [class.ok]="password.length >= 6">min 6 characters</span>
      </small>
      <small class="error" *ngIf="submitted && !validPassword()">
        Please create a stronger password.
      </small>

        <!-- Role Dropdown -->
        <select [(ngModel)]="role">
          <option value="">Select Role</option>
          <option value="creator">Creator</option>
          <option value="user">User</option>
        </select>
        <small class="error" *ngIf="submitted && !role">
          Please select a role
        </small>

        <button (click)="register()" [disabled]="loading">
          <span *ngIf="!loading">Register</span>
          <span class="btn-loader" *ngIf="loading"></span>
        </button>

        <p class="success" *ngIf="success">{{ success }}</p>
        <p class="error" *ngIf="error">{{ error }}</p>

        <p class="link" (click)="goToLogin()">Already have an account?</p>
      </ng-container>

      <div class="verify" *ngIf="otpStep">
        <p class="success" *ngIf="success">{{ success }}</p>
        <p>OTP sent to your email. Enter it below:</p>
        <input placeholder="Enter OTP" [(ngModel)]="otp" />
        <button (click)="verifyOtp()">Verify OTP</button>
        <button class="secondary" (click)="resendOtp()">Resend OTP</button>
        <small class="error" *ngIf="otpError">{{ otpError }}</small>
      </div>
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
    input, select {
      width: 100%;
      margin-top: 12px;
      padding: 10px;
    }
    button {
      width: 100%;
      padding: 10px;
      margin-top: 15px;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    button:disabled {
      opacity: 0.75;
      cursor: not-allowed;
    }
    .btn-loader {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.5);
      border-top-color: #fff;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: red;
      font-size: 12px;
      display: block;
      text-align: left;
      margin-top: 4px;
    }
    .hint {
      color: #334155;
      font-size: 12px;
      display: block;
      text-align: left;
      margin-top: 6px;
    }
    .hint span {
      display: inline-block;
      margin-right: 6px;
      padding: 2px 6px;
      border-radius: 10px;
      background: #e2e8f0;
      color: #334155;
    }
    .hint span.ok {
      background: #dcfce7;
      color: #166534;
      font-weight: 600;
    }
    .success {
      color: #16a34a;
      font-size: 12px;
      display: block;
      text-align: left;
      margin-top: 6px;
    }
    .verify {
      margin-top: 8px;
      text-align: left;
      font-size: 12px;
      word-break: break-all;
    }
    .verify input {
      width: 100%;
      margin-top: 6px;
      padding: 8px;
    }
    .verify button {
      width: 100%;
      padding: 10px;
      margin-top: 8px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .verify button.secondary {
      background: #0f172a;
    }
    .link {
      margin-top: 10px;
      color: #4f46e5;
      cursor: pointer;
    }
  `]
})
export class RegisterComponent {

  name = '';
  email = '';
  password = '';
  role = '';
  error = '';
  success = '';
  otp = '';
  otpError = '';
  otpStep = false;
  submitted = false;
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  validEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }
  hasUpper(): boolean {
    return /[A-Z]/.test(this.password);
  }
  hasSymbol(): boolean {
    return /[^A-Za-z0-9]/.test(this.password);
  }
  hasTwoNumbers(): boolean {
    const matches = this.password.match(/[0-9]/g) || [];
    return matches.length >= 2;
  }
  validPassword(): boolean {
    return this.password.length >= 6 && this.hasUpper() && this.hasSymbol() && this.hasTwoNumbers();
  }

  register() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    this.otp = '';
    this.otpError = '';
    this.otpStep = false;
    this.loading = true;

    if (!this.name || !this.validEmail() || !this.validPassword() || !this.role) {
      this.loading = false;
      return;
    }

    this.auth.register(this.name, this.email, this.password, this.role).subscribe({
      next: (res: any) => {
        this.success = res?.message || 'Registration successful. Please verify your email.';
        this.otpStep = true;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Registration failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  verifyOtp() {
    this.otpError = '';

    if (!this.email || !this.otp) {
      this.otpError = 'Email and OTP are required';
      return;
    }

    this.auth.verifyOtp(this.email, this.otp).subscribe({
      next: (res: any) => {
        this.success = res?.message || 'Email verified successfully. You can login now.';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.otpError = err?.error?.message || 'OTP verification failed';
      }
    });
  }

  resendOtp() {
    this.otpError = '';

    if (!this.email) {
      this.otpError = 'Email is required';
      return;
    }

    this.auth.resendOtp(this.email).subscribe({
      next: (res: any) => {
        this.success = res?.message || 'OTP resent. Check your email.';
        if (res?.otp) {
          this.otp = res.otp;
        }
      },
      error: (err) => {
        this.otpError = err?.error?.message || 'Resend OTP failed';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
