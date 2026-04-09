import type { StatusTone } from '@/lib/transactionDisplay';

const toneStyles: Record<StatusTone, { color: string; backgroundColor: string; borderColor: string }> = {
  success: {
    color: 'var(--success-color)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  warning: {
    color: 'var(--warning-color)',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  danger: {
    color: 'var(--danger-color)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  info: {
    color: 'var(--accent-color)',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  neutral: {
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
};

export default function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const style = toneStyles[tone];

  return (
    <span
      style={{
        color: style.color,
        backgroundColor: style.backgroundColor,
        border: `1px solid ${style.borderColor}`,
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
