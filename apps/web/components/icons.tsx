import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.75V21h14V9.75" />
      <path d="M9 21v-6h6v6" />
    </Icon>
  );
}

export function GaugeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 13a8 8 0 1116 0" />
      <path d="M12 13l4-4" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 7.5A2.5 2.5 0 015.5 5H10l2 2h6.5A2.5 2.5 0 0121 9.5v8A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5z" />
    </Icon>
  );
}

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="15" r="3" />
      <path d="M10.5 13.5L21 3" />
      <path d="M18 3h3v3" />
      <path d="M15 6l3 3" />
    </Icon>
  );
}

export function FundingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" />
      <path d="M17 7.5c0-1.9-2.24-3.5-5-3.5S7 5.6 7 7.5 9.24 11 12 11s5 1.6 5 3.5S14.76 18 12 18s-5-1.6-5-3.5" />
    </Icon>
  );
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 19h16" />
      <path d="M7 15v-4" />
      <path d="M12 15V8" />
      <path d="M17 15v-7" />
    </Icon>
  );
}

export function ServerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01" />
      <path d="M7 17h.01" />
    </Icon>
  );
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 4h12a2 2 0 012 2v12H7a2 2 0 00-2 2z" />
      <path d="M5 4v16a2 2 0 012-2h12" />
    </Icon>
  );
}

export function PulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 12h4l2.2-5 3.6 10L15 12h6" />
    </Icon>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </Icon>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 7.5A2.5 2.5 0 015.5 5h12A2.5 2.5 0 0120 7.5v9A2.5 2.5 0 0117.5 19h-12A2.5 2.5 0 013 16.5z" />
      <path d="M16 12h4" />
      <path d="M16 9.5h4v5h-4a2.5 2.5 0 010-5z" />
    </Icon>
  );
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
      <path d="M5 18l.8 1.8L7.5 21l-1.7.8L5 23.5l-.8-1.7L2.5 21l1.7-.8z" />
      <path d="M18.5 15l1 2.2 2.2 1-2.2 1-1 2.3-1-2.3-2.3-1 2.3-1z" />
    </Icon>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 18h.01" />
    </Icon>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Icon>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Icon>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="M4.9 4.9l1.6 1.6" />
      <path d="M17.5 17.5l1.6 1.6" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="M4.9 19.1l1.6-1.6" />
      <path d="M17.5 6.5l1.6-1.6" />
    </Icon>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M18 15.8A7.5 7.5 0 018.2 6a8.6 8.6 0 1010 9.8z" />
    </Icon>
  );
}

export function XSocialIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2H21l-6.013 6.872L22 22h-5.58l-4.37-6.377L6.47 22H3.71l6.43-7.35L2 2h5.72l3.95 5.94zm-.978 18h1.53L6.89 3.895H5.25z" />
    </svg>
  );
}

export function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.54 5.34A16.4 16.4 0 0015.5 4l-.2.41a15.04 15.04 0 013.67 1.41 13.9 13.9 0 00-6.97-1.83 13.9 13.9 0 00-6.97 1.83A15.05 15.05 0 018.7 4.41L8.5 4a16.4 16.4 0 00-4.04 1.34C1.9 9.14 1.24 12.85 1.57 16.5A16.62 16.62 0 006.52 19l.9-1.48a10.66 10.66 0 01-1.41-.69l.34-.26a11.97 11.97 0 0011.3 0l.34.26c-.45.27-.92.5-1.42.69l.9 1.48a16.62 16.62 0 004.95-2.5c.4-4.23-.68-7.9-2.88-11.16zM8.97 14.2c-.94 0-1.7-.86-1.7-1.93s.75-1.93 1.7-1.93 1.71.87 1.7 1.93-.76 1.93-1.7 1.93zm6.06 0c-.94 0-1.7-.86-1.7-1.93s.75-1.93 1.7-1.93 1.71.87 1.7 1.93-.75 1.93-1.7 1.93z" />
    </svg>
  );
}

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.46 4.61a1.7 1.7 0 00-1.8-.24L3.1 10.78a1.27 1.27 0 00.08 2.38l4.13 1.35 1.6 4.97a1.27 1.27 0 002.16.45l2.3-2.35 4.51 3.31a1.7 1.7 0 002.68-1.01l2.38-13.49a1.7 1.7 0 00-.48-1.78zM9.32 14.01l8.58-6.21-6.56 7.12-.3 3.06z" />
    </svg>
  );
}

export function TransactionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Icon>
  );
}
