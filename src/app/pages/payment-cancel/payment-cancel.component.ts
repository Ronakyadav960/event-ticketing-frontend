import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-payment-cancel',
  templateUrl: './payment-cancel.component.html',
  styleUrls: ['./payment-cancel.component.css'],
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
