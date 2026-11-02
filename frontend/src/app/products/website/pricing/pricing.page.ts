import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-site-pricing',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './pricing.page.html',
  styleUrl: './pricing.page.scss',
})
export class PricingPage {
  readonly plans = [
    {
      nameKey: 'site.pricing.basicName',
      priceKey: 'site.pricing.basicPrice',
      bodyKey: 'site.pricing.basicBody',
      featured: false,
    },
    {
      nameKey: 'site.pricing.proName',
      priceKey: 'site.pricing.proPrice',
      bodyKey: 'site.pricing.proBody',
      featured: true,
    },
    {
      nameKey: 'site.pricing.entName',
      priceKey: 'site.pricing.entPrice',
      bodyKey: 'site.pricing.entBody',
      featured: false,
    },
  ];
}
