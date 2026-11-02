import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';

interface TenantPreview {
  name: string;
  city: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended';
  seats: number;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [TranslatePipe, Button, TableModule, RouterLink],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.scss',
})
export class AdminDashboardPage {
  readonly kpis = [
    { labelKey: 'admin.dashboard.kpi.tenants', value: '48', deltaKey: 'admin.dashboard.kpi.tenantsDelta', up: true },
    { labelKey: 'admin.dashboard.kpi.trials', value: '11', deltaKey: 'admin.dashboard.kpi.trialsDelta', up: true },
    { labelKey: 'admin.dashboard.kpi.mrr', value: '286,400.00 ر.س', deltaKey: 'admin.dashboard.kpi.mrrDelta', up: true },
    { labelKey: 'admin.dashboard.kpi.demoRequests', value: '17', deltaKey: 'admin.dashboard.kpi.demoRequestsDelta', up: false },
  ];

  readonly tenants: TenantPreview[] = [
    { name: 'هيئة تطوير المشاريع', city: 'الرياض', plan: 'مؤسسي', status: 'active', seats: 120 },
    { name: 'شركة نماء للتطوير', city: 'جدة', plan: 'احترافي', status: 'active', seats: 45 },
    { name: 'بلدية المنطقة الشرقية', city: 'الدمام', plan: 'حكومي', status: 'trial', seats: 80 },
    { name: 'مجموعة أفق العقارية', city: 'المدينة المنورة', plan: 'أساسي', status: 'suspended', seats: 18 },
  ];

  statusClass(status: TenantPreview['status']): string {
    if (status === 'active') return 'status-badge status-badge--success';
    if (status === 'trial') return 'status-badge status-badge--info';
    return 'status-badge status-badge--warning';
  }
}
