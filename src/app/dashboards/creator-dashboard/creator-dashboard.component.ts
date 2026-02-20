import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-creator-dashboard',
  imports: [CommonModule],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.css']
})
export class CreatorDashboardComponent implements OnInit, AfterViewInit {

  data: any;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('bookingChart') bookingChartRef!: ElementRef;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.getCreatorDashboard().subscribe(res => {
      this.data = res;
      setTimeout(() => this.loadCharts(), 100);
    });
  }

  ngAfterViewInit() {}

  loadCharts() {
    if (!this.data) return;

    // Revenue Trend Chart
    new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.data.monthlyTrend.map((m: any) => m.month),
        datasets: [{
          label: 'Revenue',
          data: this.data.monthlyTrend.map((m: any) => m.revenue),
          borderWidth: 2,
          fill: false
        }]
      }
    });

    // Booking Chart (per event)
    new Chart(this.bookingChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.data.perEvent.map((e: any) => e.title),
        datasets: [{
          label: 'Bookings',
          data: this.data.perEvent.map((e: any) => e.bookings),
          borderWidth: 1
        }]
      }
    });
  }
}
