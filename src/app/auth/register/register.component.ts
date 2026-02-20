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

      <p class="error" *ngIf="error">{{ error }}</p>

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

    if (!this.name || !this.validEmail() || this.password.length < 6 || !this.role) {
      return;
    }

    this.auth.register(this.name, this.email, this.password, this.role).subscribe({
      next: () => {
        alert('Registration successful. Please verify your email.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Registration failed';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
