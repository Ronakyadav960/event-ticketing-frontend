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

      <input placeholder="Name" [(ngModel)]="name" />
      <input type="email" placeholder="Email" [(ngModel)]="email" />
      <input type="password" placeholder="Password" [(ngModel)]="password" />

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
    input {
      width: 100%;
      margin: 10px 0;
      padding: 10px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .error { color: red; }
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
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  register() {
    this.error = '';

    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => {
        alert('Registration successful. Please login.');
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
