import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-superadmin-dashboard',
  imports: [CommonModule],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.css']
})
export class SuperadminDashboardComponent implements OnInit, AfterViewInit {

  data: any;
  chart: Chart | null = null;

  @ViewChild('trendChart') trendChartRef!: ElementRef;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.getSuperadminDashboard().subscribe({
      next: (res) => {
        this.data = res;

        // Load chart only if monthlyTrend exists
        if (this.data?.monthlyTrend?.length) {
          setTimeout(() => this.loadChart());
        }
      },
      error: (err) => {
        console.error('Dashboard Load Error:', err);
      }
    });
  }

  ngAfterViewInit() {
    // Ensures ViewChild ready
  }

  loadChart() {
    if (!this.trendChartRef || !this.data?.monthlyTrend?.length) {
      return;
    }

    // Destroy old chart if exists
    if (this.chart) {
      this.chart.destroy();
    }

    const trend = this.data.monthlyTrend;

    this.chart = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: trend.map((m: any) => m.month),
        datasets: [
          {
            label: 'Platform Revenue',
            data: trend.map((m: any) => m.revenue),
            borderWidth: 2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}