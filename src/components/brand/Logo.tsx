import React from 'react';

export interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'custom';
  theme?: 'light' | 'dark' | 'auto';
  version?: number;
  className?: string;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'md', 
  theme = 'auto', 
  version = 1,
  className = '',
  height
}) => {
  const sizes = {
    sm: 28, 
    md: 36, 
    lg: 64, 
  };

  const calculatedHeight = height || (size !== 'custom' ? sizes[size as keyof typeof sizes] : 36);
  const textScale = calculatedHeight / 36;
  
  // SECURE CONTRAST: Toggle between navy-blue icon and light-sky-blue icon based on theme
  const isDark = theme === 'dark';
  const iconFileName = isDark ? `logo${version}-icon-light` : `logo${version}-icon`;
  const iconPath = `/branding/logo-set/${iconFileName}.svg`;

  // ACCESSIBLE COLORS:
  // Light Mode Blue: #003366 (Deeper navy for 7:1 contrast)
  // Dark Mode Blue: #ffffff (Pure white) or #7dd3fc (Sky 300)
  // Orange: #f97316 (Vibrant orange for readability)
  
  return (
    <div 
      className={`flex items-center gap-[0.25em] ${className}`} 
      style={{ 
        height: `${calculatedHeight}px`,
        // Ensure no clipping for the whole container
        overflow: 'visible' 
      }}
    >
      {/* The Icon (Image) */}
      <img 
        src={iconPath} 
        alt=""
        style={{ height: '100%', width: 'auto' }}
        className="block shrink-0 filter drop-shadow-sm"
      />
      
      {/* The Wordmark (Live Text) */}
      {variant === 'full' && (
        <div 
          className="font-bold flex items-baseline whitespace-nowrap overflow-visible select-none"
          style={{ 
            fontSize: `${32 * textScale}px`, 
            lineHeight: 1,
            fontFamily: 'Verdana, Geneva, sans-serif',
            paddingRight: '0.1em',
            // SMART SHADOW: Ensures visibility on colored or low-contrast backgrounds
            textShadow: isDark 
              ? '0 2px 4px rgba(0,0,0,0.5)' 
              : '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <span className={isDark ? 'text-white' : 'text-[#003366]'}>Savi</span>
          <span className="text-[#f97316]">Edu</span>
          <span className={isDark ? 'text-white' : 'text-[#003366]'}>Tech</span>
        </div>
      )}
    </div>
  );
};
