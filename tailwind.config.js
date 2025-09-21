/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // FASTLIFT AI Brand Colors
      colors: {
        brand: {
          primary: '#3D13B3',    // Deep Forge Indigo - Primary
          accent: '#18E3FF',     // Plasma Cyan pour l'accent
          secondary: '#18E3FF',  // Plasma Cyan - Secondary (alias)
          ember: '#FF7A45',      // Ember Copper
        },
      },
      
      // VisionOS-inspired radius system
      borderRadius: {
        'glass': 'var(--glass-radius-sm, 12px)',
        'glass-lg': 'var(--glass-radius-lg, 22px)',
        'glass-xl': 'var(--glass-radius-xl, 28px)',
      },
      
      // Premium color system with glass variations
      
      // Premium animations
      transitionTimingFunction: {
        'glass': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-gentle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // Luxury shadows
      boxShadow: {
        'glass': 'var(--glass-shadow, 0 2px 10px rgba(0,0,0,0.2), 0 0 20px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1))',
        'glass-lg': '0 4px 20px rgba(0,0,0,0.3), 0 0 30px rgba(255,255,255,0.08)',
        'glass-xl': '0 8px 40px rgba(0,0,0,0.4), 0 0 50px rgba(255,255,255,0.1)',
      },
      
      // Typography scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'xxs': ['0.6875rem', { lineHeight: '1.4' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['clamp(0.875rem, 0.75rem + 0.5vw, 1rem)', { lineHeight: '1.5' }],
        'lg': ['clamp(1rem, 0.875rem + 0.5vw, 1.125rem)', { lineHeight: '1.4' }],
        'xl': ['clamp(1.125rem, 1rem + 0.5vw, 1.25rem)', { lineHeight: '1.4' }],
        '2xl': ['clamp(1.25rem, 1rem + 1vw, 1.5rem)', { lineHeight: '1.3' }],
        '3xl': ['clamp(1.5rem, 1rem + 1.5vw, 1.875rem)', { lineHeight: '1.2' }],
        '4xl': ['clamp(1.875rem, 1.5rem + 2vw, 2.25rem)', { lineHeight: '1.2' }],
        'h1': ['clamp(2rem, 1.5rem + 2vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h2': ['clamp(1.5rem, 1rem + 1.5vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3': ['clamp(1.25rem, 1rem + 1vw, 1.75rem)', { lineHeight: '1.3' }],
      },
      
      // VisionOS Letter Spacing
      letterSpacing: {
        'visionos-tight': '-0.02em',
        'visionos-normal': '-0.01em',
        'visionos-wide': '0.01em',
      },
      
      // 8px spacing grid
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'visionos-xs': '0.25rem',  // 4px
        'visionos-sm': '0.5rem',   // 8px
        'visionos-md': '1rem',     // 16px
        'visionos-lg': '1.5rem',   // 24px
        'visionos-xl': '2rem',     // 32px
      },
      
      // Backdrop blur utilities
      backdropBlur: {
        'glass': 'var(--glass-blur, 12px)',
        'glass-lg': '16px',
        'glass-xl': '24px',
      },
    },
  },
  plugins: [],
};