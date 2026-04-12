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
        <img
          src="/favicon.ico"
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
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
