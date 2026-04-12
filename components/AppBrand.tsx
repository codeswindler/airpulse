type AppBrandProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
};

const SIZE_MAP = {
  sm: {
    text: 16,
  },
  md: {
    text: 20,
  },
  lg: {
    text: 24,
  },
} as const;

export default function AppBrand({
  className,
  size = 'md',
  text = '₪ AirPulse',
}: AppBrandProps) {
  const preset = SIZE_MAP[size];

  return (
    <div
      className={`app-brand${className ? ` ${className}` : ''}`}
    >
      <span
        className="app-brand__wordmark"
        style={{
          fontSize: preset.text,
          letterSpacing: '1px',
        }}
      >
        {text}
      </span>
    </div>
  );
}
