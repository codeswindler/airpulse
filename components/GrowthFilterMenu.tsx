'use client';

import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardPeriodKey,
  type DashboardPeriodWindow,
} from '@/lib/dashboardMetrics';

let activeMenuId: string | null = null;
const menuListeners = new Set<() => void>();

function emitMenuChange(nextValue: string | null) {
  activeMenuId = nextValue;
  for (const listener of menuListeners) {
    listener();
  }
}

function subscribeMenu(listener: () => void) {
  menuListeners.add(listener);
  return () => {
    menuListeners.delete(listener);
  };
}

function getPeriodHref(periodKey: DashboardPeriodKey) {
  return periodKey === '30d' ? '/' : `/?period=${encodeURIComponent(periodKey)}`;
}

export default function GrowthFilterMenu({ period }: { period: DashboardPeriodWindow }) {
  const menuId = useId();
  const activeId = useSyncExternalStore(subscribeMenu, () => activeMenuId, () => null);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = activeId === menuId;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!open) {
        return;
      }

      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        emitMenuChange(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`growth-menu${open ? ' growth-menu--open' : ''}`}>
      <button
        type="button"
        className="growth-menu__trigger"
        onClick={() => emitMenuChange(open ? null : menuId)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>growth</span>
        <ChevronDown size={12} />
      </button>

      {open ? (
        <div className="growth-menu__panel" role="menu" aria-label="Compare with">
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
                  role="menuitem"
                  onClick={() => emitMenuChange(null)}
                >
                  <span>{option.label}</span>
                  {active ? <Check size={12} /> : <span style={{ width: 12 }} />}
                </Link>
              );
            })}
          </div>

          <div className="growth-menu__helper">Applies to Airtime Sold, Orders Completed, and Earnings.</div>
        </div>
      ) : null}
    </div>
  );
}
