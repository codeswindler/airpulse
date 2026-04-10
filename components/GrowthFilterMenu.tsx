'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  const router = useRouter();
  const menuId = useId();
  const activeId = useSyncExternalStore(subscribeMenu, () => activeMenuId, () => null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = activeId === menuId;
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPanelStyle(null);
      return;
    }

    const updatePosition = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();

      if (!triggerRect) {
        return;
      }

      const viewportPadding = 16;
      const panelWidth = 230;
      const preferredTop = triggerRect.bottom + 10;
      const preferredLeft = Math.min(
        Math.max(triggerRect.left, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
      );

      setPanelStyle({ top: preferredTop, left: preferredLeft });
    };

    updatePosition();
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!open) {
        return;
      }

      const target = event.target as Node | null;
      const clickedTrigger = Boolean(target && rootRef.current && rootRef.current.contains(target));
      const clickedPanel = Boolean(target && panelRef.current && panelRef.current.contains(target));

      if (!clickedTrigger && !clickedPanel) {
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

      {open && panelStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              className="growth-menu__panel"
              role="menu"
              aria-label="Compare with"
              style={{ top: panelStyle.top, left: panelStyle.left }}
            >
              <div className="growth-menu__eyebrow">Compare with</div>
              <div className="growth-menu__current">Selected: {period.label}</div>

              <div className="growth-menu__options">
                {DASHBOARD_PERIOD_OPTIONS.map((option) => {
                  const active = option.key === period.key;
                  const href = getPeriodHref(option.key);

                  return (
                    <button
                      key={option.key}
                      className={`growth-menu__option${active ? ' growth-menu__option--active' : ''}`}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        emitMenuChange(null);
                        router.replace(href, { scroll: false });
                      }}
                    >
                      <span>{option.label}</span>
                      {active ? <Check size={12} /> : <span style={{ width: 12 }} />}
                    </button>
                  );
                })}
              </div>

              <div className="growth-menu__helper">Applies to Airtime Sold, Orders Completed, and Earnings.</div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
