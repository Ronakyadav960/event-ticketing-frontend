import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  goToRegister() {
    this.router.navigate(['/register']);
  }

  login() {
    this.error = '';
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (res: any) => {
        this.auth.saveAuthData(res.token, res.user);

        const role = res?.user?.role;

        if (role === 'admin') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/events']);
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Invalid email or password';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
