import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-payment-cancel',
  template: `
    <div style="padding:24px;text-align:center">
      <h2>❌ Payment Cancelled</h2>
      <p>Your payment was not completed.</p>
      <a routerLink="/events">← Back to events</a>
    </div>
  `
})
export class PaymentCancelComponent {}
