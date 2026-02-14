import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-payment-cancel',
  template: `
    <div style="padding:40px;text-align:center">
      <h2 style="color:#dc3545">❌ Payment Cancelled</h2>
      <p>Your payment was not completed.</p>
      <p>Redirecting you back to events...</p>

      <button 
        (click)="goToEvents()" 
        style="margin-top:20px;padding:10px 20px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer">
        ← Back to Events
      </button>
    </div>
  `
})
export class PaymentCancelComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit(): void {
    // auto redirect after 3 seconds
    setTimeout(() => {
      this.goToEvents();
    }, 3000);
  }

  goToEvents() {
    this.router.navigate(['/events']);
  }
}
