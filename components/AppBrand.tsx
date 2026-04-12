type AppBrandProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
};

const SIZE_MAP = {
  sm: {
    mark: 24,
    text: 14,
    gap: 8,
  },
  md: {
    mark: 28,
    text: 16,
    gap: 10,
  },
  lg: {
    mark: 36,
    text: 20,
    gap: 12,
  },
} as const;

export default function AppBrand({
  className,
  size = 'md',
  text = 'AirPulse',
}: AppBrandProps) {
  const preset = SIZE_MAP[size];

  return (
    <div
      className={`app-brand${className ? ` ${className}` : ''}`}
      style={{
        gap: preset.gap,
      }}
    >
      <span
        className="app-brand__mark"
        style={{
          width: preset.mark,
          height: preset.mark,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          className="app-brand__icon"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="32" cy="32" r="30" fill="#050507" />
          <path
            d="M42 20C31 20 24 26.5 24 32C24 37.5 31 44 42 44"
            fill="none"
            stroke="#f8fafc"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6.2"
          />
          <path
            d="M22 20C33 20 40 26.5 40 32C40 37.5 33 44 22 44"
            fill="none"
            stroke="#f8fafc"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6.2"
          />
        </svg>
      </span>
      <span
        className="app-brand__text"
        style={{
          fontSize: preset.text,
          letterSpacing: size === 'lg' ? '-0.04em' : '-0.03em',
        }}
      >
        {text}
      </span>
    </div>
  );
}
