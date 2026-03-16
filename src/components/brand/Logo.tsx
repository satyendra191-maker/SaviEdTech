import Image from 'next/image';

export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoVariant = 'light' | 'dark';

export interface LogoProps {
  size?: LogoSize;
  /**
   * Background context where the logo is rendered.
   * - `light`: logo sits on light/neutral backgrounds
   * - `dark`: logo sits on dark/colored backgrounds
   */
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const LOGO_SRC = '/brand/logo.png';
const LOGO_ASPECT_RATIO = 670 / 199;

const HEIGHTS: Record<LogoSize, number> = {
  sm: 32,
  md: 44,
  lg: 60,
};

export function Logo({
  size = 'md',
  variant = 'light',
  className,
  priority = false,
  alt = 'SaviEduTech Official Logo',
}: LogoProps) {
  const height = HEIGHTS[size];
  const width = Math.round(height * LOGO_ASPECT_RATIO);
  const sizes = `${width}px`;

  const containerClassName = [
    'inline-flex items-center justify-center',
    variant === 'dark' ? 'rounded-md bg-white/95 p-2 shadow-sm ring-1 ring-black/5' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName}>
      <Image
        src={LOGO_SRC}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className="block h-auto w-auto"
      />
    </div>
  );
}
