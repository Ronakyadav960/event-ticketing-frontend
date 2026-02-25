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
      <small class="error" *ngIf="submitted && password.length < 6">
        Password must be at least 6 characters
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

      <button (click)="register()">Register</button>

      <p class="success" *ngIf="success">{{ success }}</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="verify" *ngIf="otpStep">
        <p>OTP sent to your email. Enter it below:</p>
        <input placeholder="Enter OTP" [(ngModel)]="otp" />
        <button (click)="verifyOtp()">Verify OTP</button>
        <button class="secondary" (click)="resendOtp()">Resend OTP</button>
        <small class="error" *ngIf="otpError">{{ otpError }}</small>
      </div>

      <p class="link" (click)="goToLogin()">Already have an account?</p>
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
    }
    .error {
      color: red;
      font-size: 12px;
      display: block;
      text-align: left;
      margin-top: 4px;
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

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  validEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  register() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    this.otp = '';
    this.otpError = '';
    this.otpStep = false;

    if (!this.name || !this.validEmail() || this.password.length < 6 || !this.role) {
      return;
    }

    this.auth.register(this.name, this.email, this.password, this.role).subscribe({
      next: (res: any) => {
        this.success = res?.message || 'Registration successful. Please verify your email.';
        this.otpStep = true;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Registration failed';
      }
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
