import React from 'react';

interface VeboLogoProps {
  className?: string;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  iconSize?: number;
}

export default function VeboLogo({ 
  className = '', 
  showText = true, 
  textSize = 'md',
  iconSize = 44
}: VeboLogoProps) {
  // Determine pixel sizes for text size presets
  const getTextSizeClasses = () => {
    switch (textSize) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-lg';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-4xl';
      default: return 'text-lg';
    }
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`} dir="rtl">
      {/* Icon Logo Part */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 200 160" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        {/* Dynamic Dark Blue Wave Swoosh */}
        <path 
          d="M30 60 C50 60, 65 85, 90 110 C100 120, 115 125, 125 120 C155 110, 180 85, 160 115 C145 135, 110 145, 80 135 C50 125, 30 100, 31 82" 
          stroke="#0f4c81" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Secondary Dark Blue Swoop under */}
        <path 
          d="M40 60 C80 60, 100 115, 105 118" 
          stroke="#0f4c81" 
          strokeWidth="12" 
          strokeLinecap="round" 
        />

        {/* Cyan Stylized Shopping Bag Body */}
        <path 
          d="M106 115 C115 105, 150 63, 164 58 C166 57, 168 59, 167 61 L145 115 C143 120, 137 124, 132 124 L103 124 C97 124, 95 119, 98 115 Z" 
          fill="#00cccc" 
        />

        {/* Dynamic Cyan Swoop and Bag Border overlapping with transparency/blend */}
        <path 
          d="M30 110 C45 80, 80 85, 100 110 C125 75, 150 58, 165 58" 
          stroke="#00cccc" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Shopping Bag Handle in Cyan */}
        <path 
          d="M132 60 C132 40, 154 40, 154 60" 
          stroke="#00cccc" 
          strokeWidth="7" 
          strokeLinecap="round" 
        />
      </svg>

      {/* Typography Text Part */}
      {showText && (
        <span className={`font-black tracking-tight leading-none text-right flex items-center justify-end ${getTextSizeClasses()}`}>
          {/* veb component in dark blue */}
          <span className="text-[#0f4c81]">veb</span>
          {/* o component with arrow in cyan */}
          <span className="text-[#00cccc] relative inline-flex items-center">
            o
            {/* The Arrow pointing Top-Right */}
            <svg 
              className="absolute -top-1.5 -right-2 w-3 h-3 text-[#00cccc]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="5" y1="19" x2="19" y2="5"></line>
              <polyline points="12 5 19 5 19 12"></polyline>
            </svg>
          </span>
        </span>
      )}
    </div>
  );
}
