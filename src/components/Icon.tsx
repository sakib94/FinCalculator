/**
 * A small hand-rolled icon set (24×24, stroke, currentColor).
 * Inline SVG keeps the bundle free of an icon dependency and lets every
 * glyph inherit theme colours without a second stylesheet.
 */

const PATHS = {
  /* App / navigation */
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  star: 'M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z',
  monitor: 'M3 5h18v11H3zM8 21h8M12 16v5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  share: 'M12 15V4M8.5 7.5L12 4l3.5 3.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  printer: 'M7 9V3h10v6M7 19H5a1 1 0 0 1-1-1v-6h16v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  download: 'M12 4v11M8 11l4 4 4-4M4 20h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.6v.4',
  alert: 'M12 8v5M12 16.4v.2M10.3 4.3L2.6 18a1.6 1.6 0 0 0 1.4 2.4h16a1.6 1.6 0 0 0 1.4-2.4L13.7 4.3a1.6 1.6 0 0 0-2.8 0z',
  refresh: 'M20 11a8 8 0 1 0-1.6 6M20 6v5h-5',
  sparkle: 'M12 3.5l1.9 4.8 4.8 1.9-4.8 1.9L12 16.9l-1.9-4.8L5.3 10.2l4.8-1.9zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  calculator: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01',

  /* Calculator glyphs */
  vault: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01M17 20v2M7 20v2',
  umbrella: 'M12 12v7a2.5 2.5 0 0 0 5 0M3 12a9 9 0 0 1 18 0zM12 3V1.6',
  landmark: 'M4 10h16M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18M12 3l9 5H3z',
  trending: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  pie: 'M21 12A9 9 0 1 1 12 3v9h9z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5zM12 15v2',
  palm: 'M12 21V11M12 11c0-3 2-5 5-5M12 11c0-3-2-5-5-5M12 11c1-2.5 3-3.6 5.5-3M12 11C11 8.5 9 7.4 6.5 8M12 11a4 4 0 0 1 4-4',
  arrowUpRight: 'M7 17L17 7M9 7h8v8',
  bank: 'M3 9.5L12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  receiptTax: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9.5 9.5h.01M14.5 14.5h.01M15 9l-6 6',
  wallet: 'M3 7a2 2 0 0 1 2-2h12v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M3 7h16a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5',
  briefcase: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M3 13h18',
  award: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13L7 21l5-2.5L17 21l-1.5-8',
  barChart: 'M5 20V11M12 20V5M19 20v-6M3 20h18',
  calendarCheck: 'M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 3v4M16 3v4M3 11h18M9 16l2 2 4-4',
  calendar: 'M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 3v4M16 3v4M3 11h18M8 15h2M14 15h2M8 18h2M14 18h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.6 3.6-6 8-6s8 2.4 8 6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  percent: 'M19 5L5 19M7.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  tag: 'M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8.2 8.2a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1-.3-.7zM7.5 8h.01',
  handshake: 'M11 17l-2 2-4-4 4.5-4.5M13 17l2 2 4-4-4.5-4.5M5 7l3-2 4 2 4-2 3 2M9 12.5l2 2 2-2 2 2',
  activity: 'M3 12h4l3 7 4-14 3 7h4',
  coins: 'M9 13a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9 5.5v5M15 10.6A6 6 0 1 1 10.6 21M3 18h6',
  zap: 'M13 2L4.5 13.5H11l-1 8.5L19.5 10.5H13z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  hammer: 'M14 6l-3 3M3 21l7.5-7.5M12.5 5.5l3-3 6 6-3 3zM9 8l7 7',
  scale: 'M12 3v18M7 21h10M6 7l-3 7h6zM18 7l-3 7h6zM4 7h16',
  piggy: 'M4 12a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2a3 3 0 0 1-3 3v2h-3v-2h-4v2H7v-2a3 3 0 0 1-3-3zM16 11h.01M3 11V9M14 6V4h-4v2',
  arrowDownCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v8M8.5 12.5L12 16l3.5-3.5',
  clipboard: 'M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
  gauge: 'M12 21a9 9 0 1 1 9-9M12 12l5-4M3 12h2M19 12h2M12 3v2',
  trendingDown: 'M3 7l6 6 4-4 8 8M21 11v6h-6',
  home: 'M3 11l9-7 9 7M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10M9 21v-6h6v6',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9.5-4.8-1.2-8-5-8-9.5V6zM9 12l2 2 4-4',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  layers: 'M12 2.5l9 5-9 5-9-5zM3 12l9 5 9-5M3 16.5l9 5 9-5',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 6.5L12 13l8.5-6.5',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2',
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
}

export function Icon({ name, size = 18, className, strokeWidth = 1.7, filled }: Props) {
  return (
    <svg
      className={className ? `i ${className}` : 'i'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
