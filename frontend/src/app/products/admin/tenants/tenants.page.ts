import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

interface TenantRow {
  name: string;
  cr: string;
  city: string;
  plan: string;
  seats: number;
  status: 'active' | 'trial' | 'suspended';
}

@Component({
  selector: 'app-tenants-page',
  imports: [FormsModule, TranslatePipe, Button, InputText, TableModule],
  templateUrl: './tenants.page.html',
  styleUrl: './tenants.page.scss',
})
export class TenantsPage {
  search = '';

  readonly tenants = signal<TenantRow[]>([
    { name: 'هيئة تطوير المشاريع', cr: '1010123456', city: 'الرياض', plan: 'مؤسسي', seats: 120, status: 'active' },
    { name: 'شركة نماء للتطوير', cr: '4030987654', city: 'جدة', plan: 'احترافي', seats: 45, status: 'active' },
    { name: 'بلدية المنطقة الشرقية', cr: '2050112233', city: 'الدمام', plan: 'حكومي', seats: 80, status: 'trial' },
    { name: 'مجموعة أفق العقارية', cr: '4650334455', city: 'المدينة المنورة', plan: 'أساسي', seats: 18, status: 'suspended' },
    { name: 'مؤسسة وادي عسير', cr: '5850667788', city: 'أبها', plan: 'احترافي', seats: 32, status: 'active' },
  ]);

  filtered(): TenantRow[] {
    const q = this.search.trim();
    if (!q) return this.tenants();
    return this.tenants().filter((t) => t.name.includes(q) || t.city.includes(q) || t.plan.includes(q));
  }

  statusClass(status: TenantRow['status']): string {
    if (status === 'active') return 'status-badge status-badge--success';
    if (status === 'trial') return 'status-badge status-badge--info';
    return 'status-badge status-badge--warning';
  }
}
