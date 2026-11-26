import { getCpcbCategory } from '../utils/aqi';

interface AqiPillProps {
  aqi: number;
  prefix?: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export function AqiPill({
  aqi,
  prefix,
  size = 'md',
  showValue = true,
}: AqiPillProps) {
  const category = getCpcbCategory(aqi);
  const label = prefix
    ? `${prefix} ${category.label}`
    : category.label;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap shrink-0 tabular-nums ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      }`}
      style={{
        backgroundColor: category.pillBg,
        border: `1px solid ${category.pillBorder}`,
        color: category.textHex,
      }}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: category.rimColor,
          boxShadow: `0 0 8px ${category.rimColor}`,
        }}
      />
      <span>
        {label}
        {showValue ? ` — ${aqi}` : ''}
      </span>
    </span>
  );
}
