import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { LocaleService } from '../../core/locale/locale.service';

interface CityOption {
  labelKey: string;
  value: string;
}

interface EmployeeRow {
  name: string;
  city: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
}

interface KpiTile {
  labelKey: string;
  value: string;
  deltaKey: string;
  deltaPositive: boolean;
}

type NavId = 'dashboard' | 'projects' | 'employees' | 'reports' | 'settings';

interface NavItem {
  id: NavId;
  labelKey: string;
  icon: string;
  expandable?: boolean;
}

interface ActivityItem {
  titleKey: string;
  metaKey: string;
  amount: string;
  tone: 'in' | 'out' | 'neutral';
}

@Component({
  selector: 'app-design-system',
  imports: [
    FormsModule,
    TranslatePipe,
    Button,
    InputText,
    Textarea,
    Select,
    TableModule,
    Dialog,
    TabsModule,
    Tag,
    Paginator,
    DatePicker,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './design-system.page.html',
  styleUrl: './design-system.page.scss',
})
export class DesignSystemPage implements OnInit {
  private readonly locale = inject(LocaleService);
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly language = this.locale.language;

  name = '';
  notes = '';
  selectedCity: string | null = null;
  selectedDate: Date | null = null;
  dialogVisible = false;
  first = 0;
  rows = 5;
  activeNav: NavId = 'dashboard';
  readonly menuCollapsed = signal(false);

  readonly navItems: NavItem[] = [
    { id: 'dashboard', labelKey: 'designSystem.nav.dashboard', icon: 'home' },
    { id: 'projects', labelKey: 'designSystem.nav.projects', icon: 'account_tree', expandable: true },
    { id: 'employees', labelKey: 'designSystem.nav.employees', icon: 'group', expandable: true },
    { id: 'reports', labelKey: 'designSystem.nav.reports', icon: 'monitoring', expandable: true },
    { id: 'settings', labelKey: 'designSystem.nav.settings', icon: 'settings' },
  ];

  readonly kpis: KpiTile[] = [
    {
      labelKey: 'designSystem.kpi.activeProjects',
      value: '24',
      deltaKey: 'designSystem.kpi.activeProjectsDelta',
      deltaPositive: true,
    },
    {
      labelKey: 'designSystem.kpi.openTasks',
      value: '186',
      deltaKey: 'designSystem.kpi.openTasksDelta',
      deltaPositive: false,
    },
    {
      labelKey: 'designSystem.kpi.budgetUsed',
      value: '1,842,500.00 ر.س',
      deltaKey: 'designSystem.kpi.budgetUsedDelta',
      deltaPositive: true,
    },
  ];

  readonly activity: ActivityItem[] = [
    {
      titleKey: 'designSystem.activity.payment',
      metaKey: 'designSystem.activity.paymentMeta',
      amount: '+42,500.00 ر.س',
      tone: 'in',
    },
    {
      titleKey: 'designSystem.activity.refund',
      metaKey: 'designSystem.activity.refundMeta',
      amount: '-3,200.00 ر.س',
      tone: 'out',
    },
    {
      titleKey: 'designSystem.activity.milestone',
      metaKey: 'designSystem.activity.milestoneMeta',
      amount: '—',
      tone: 'neutral',
    },
  ];

  readonly cities: CityOption[] = [
    { labelKey: 'designSystem.cities.riyadh', value: 'riyadh' },
    { labelKey: 'designSystem.cities.jeddah', value: 'jeddah' },
    { labelKey: 'designSystem.cities.dammam', value: 'dammam' },
    { labelKey: 'designSystem.cities.madinah', value: 'madinah' },
    { labelKey: 'designSystem.cities.abha', value: 'abha' },
  ];

  readonly employees = signal<EmployeeRow[]>([
    {
      name: 'عبدالله محمد العتيبي',
      city: 'الرياض',
      role: 'مدير مشاريع',
      status: 'active',
    },
    {
      name: 'نورة سعد القحطاني',
      city: 'جدة',
      role: 'محلل أعمال',
      status: 'active',
    },
    {
      name: 'خالد فهد الشمري',
      city: 'الدمام',
      role: 'مهندس نظم',
      status: 'pending',
    },
    {
      name: 'سارة أحمد الغامدي',
      city: 'المدينة المنورة',
      role: 'منسق مشاريع',
      status: 'suspended',
    },
    {
      name: 'فيصل عبدالرحمن الحربي',
      city: 'أبها',
      role: 'أخصائي مالية',
      status: 'active',
    },
  ]);

  ngOnInit(): void {
    this.locale.init();
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.locale.setLanguage(lang);
  }

  setNav(id: NavId): void {
    this.activeNav = id;
  }

  toggleMenu(): void {
    this.menuCollapsed.update((collapsed) => !collapsed);
  }

  logout(): void {
    this.messages.add({
      severity: 'info',
      summary: this.translate.instant('designSystem.logout'),
      detail: this.translate.instant('designSystem.logoutNotice'),
      life: 2500,
    });
  }

  openDialog(): void {
    this.dialogVisible = true;
  }

  showToast(): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('designSystem.toast.summary'),
      detail: this.translate.instant('designSystem.toast.detail'),
      life: 3000,
    });
  }

  onPage(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 5;
  }

  statusClass(status: EmployeeRow['status']): string {
    switch (status) {
      case 'active':
        return 'status-badge status-badge--success';
      case 'suspended':
        return 'status-badge status-badge--warning';
      case 'pending':
        return 'status-badge status-badge--neutral';
    }
  }

  statusLabelKey(status: EmployeeRow['status']): string {
    return `designSystem.status.${status}`;
  }

  activityToneClass(tone: ActivityItem['tone']): string {
    return `ds-activity-amount is-${tone}`;
  }
}
