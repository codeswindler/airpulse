import Link from 'next/link';
import { ChevronDown, Check } from 'lucide-react';
import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardPeriodKey,
  type DashboardPeriodWindow,
} from '@/lib/dashboardMetrics';

function getPeriodHref(periodKey: DashboardPeriodKey) {
  return periodKey === '30d' ? '/' : `/?period=${encodeURIComponent(periodKey)}`;
}

export default function GrowthFilterMenu({ period }: { period: DashboardPeriodWindow }) {
  return (
    <details className="growth-menu">
      <summary className="growth-menu__summary">
        <span>growth</span>
        <ChevronDown size={12} />
      </summary>

      <div className="growth-menu__panel">
        <div className="growth-menu__eyebrow">Compare with</div>
        <div className="growth-menu__current">Selected: {period.label}</div>

        <div className="growth-menu__options">
          {DASHBOARD_PERIOD_OPTIONS.map((option) => {
            const active = option.key === period.key;

            return (
              <Link
                key={option.key}
                href={getPeriodHref(option.key)}
                className={`growth-menu__option${active ? ' growth-menu__option--active' : ''}`}
              >
                <span>{option.label}</span>
                {active ? <Check size={12} /> : <span style={{ width: 12 }} />}
              </Link>
            );
          })}
        </div>

        <div className="growth-menu__helper">Applies to Airtime Sold, Orders Completed, and Earnings.</div>
      </div>
    </details>
  );
}
