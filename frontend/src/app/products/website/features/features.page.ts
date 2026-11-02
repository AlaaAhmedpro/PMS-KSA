import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-site-features',
  imports: [TranslatePipe],
  templateUrl: './features.page.html',
  styleUrl: './features.page.scss',
})
export class FeaturesPage {
  readonly features = [
    { titleKey: 'site.features.f1Title', bodyKey: 'site.features.f1Body' },
    { titleKey: 'site.features.f2Title', bodyKey: 'site.features.f2Body' },
    { titleKey: 'site.features.f3Title', bodyKey: 'site.features.f3Body' },
    { titleKey: 'site.features.f4Title', bodyKey: 'site.features.f4Body' },
    { titleKey: 'site.features.f5Title', bodyKey: 'site.features.f5Body' },
    { titleKey: 'site.features.f6Title', bodyKey: 'site.features.f6Body' },
  ];
}
