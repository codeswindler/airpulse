type AppBrandProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
};

const SIZE_MAP = {
  sm: {
    mark: 28,
    markFont: 11,
    text: 16,
    gap: 8,
  },
  md: {
    mark: 32,
    markFont: 12,
    text: 20,
    gap: 10,
  },
  lg: {
    mark: 40,
    markFont: 14,
    text: 24,
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
    <div className={`app-brand${className ? ` ${className}` : ''}`}>
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
