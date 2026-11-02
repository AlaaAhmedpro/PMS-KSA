import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';

interface PlanRow {
  nameKey: string;
  price: string;
  seats: string;
  status: 'published' | 'draft';
}

@Component({
  selector: 'app-plans-page',
  imports: [TranslatePipe, TableModule],
  templateUrl: './plans.page.html',
  styleUrl: './plans.page.scss',
})
export class PlansPage {
  readonly plans: PlanRow[] = [
    { nameKey: 'admin.plans.basic', price: '1,250.00 ر.س', seats: '15', status: 'published' },
    { nameKey: 'admin.plans.pro', price: '3,900.00 ر.س', seats: '50', status: 'published' },
    { nameKey: 'admin.plans.enterprise', price: '9,800.00 ر.س', seats: 'غير محدود', status: 'published' },
    { nameKey: 'admin.plans.gov', price: 'حسب العرض', seats: 'حسب العقد', status: 'draft' },
  ];

  statusClass(status: PlanRow['status']): string {
    return status === 'published'
      ? 'status-badge status-badge--success'
      : 'status-badge status-badge--neutral';
  }
}
