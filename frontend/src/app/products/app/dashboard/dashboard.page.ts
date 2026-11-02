import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';

interface ProjectRow {
  name: string;
  city: string;
  manager: string;
  status: 'active' | 'delayed' | 'done';
  budget: string;
}

@Component({
  selector: 'app-core-dashboard',
  imports: [TranslatePipe, Button, TableModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly kpis = [
    { labelKey: 'core.dashboard.kpi.activeProjects', value: '24', deltaKey: 'core.dashboard.kpi.activeProjectsDelta', up: true },
    { labelKey: 'core.dashboard.kpi.openTasks', value: '186', deltaKey: 'core.dashboard.kpi.openTasksDelta', up: false },
    { labelKey: 'core.dashboard.kpi.budget', value: '1,842,500.00 ر.س', deltaKey: 'core.dashboard.kpi.budgetDelta', up: true },
  ];

  readonly projects: ProjectRow[] = [
    { name: 'تطوير الواجهة البحرية', city: 'جدة', manager: 'نورة القحطاني', status: 'active', budget: '850,000.00 ر.س' },
    { name: 'إسكان تنموي', city: 'الرياض', manager: 'خالد الشمري', status: 'delayed', budget: '1,250,000.00 ر.س' },
    { name: 'تأهيل مرافق عامة', city: 'الدمام', manager: 'سارة الغامدي', status: 'active', budget: '420,000.00 ر.س' },
    { name: 'مركز خدمات أحياء', city: 'أبها', manager: 'فيصل الحربي', status: 'done', budget: '310,000.00 ر.س' },
  ];

  statusClass(status: ProjectRow['status']): string {
    if (status === 'active') return 'status-badge status-badge--success';
    if (status === 'delayed') return 'status-badge status-badge--warning';
    return 'status-badge status-badge--info';
  }
}
