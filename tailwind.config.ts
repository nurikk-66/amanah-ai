import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark minimalist base
        'dark': {
          '950': '#000000',
          '900': '#0a0a0a',
          '850': '#1a1a1a',
          '800': '#262626',
          '700': '#404040',
        },
        // Amanah Green - premium accent
        'amanah': {
          '50': '#f0fffa',
          '100': '#d4fff7',
          '200': '#a8ffef',
          '300': '#6dffe6',
          '400': '#00ffaa', // Primary
          '500': '#00e699',
          '600': '#00b376',
          '700': '#008055',
          '800': '#006644',
          '900': '#004d33',
        },
        // Neutral grays for text
        'neutral': {
          '50': '#fafafa',
          '100': '#f5f5f5',
          '200': '#e5e5e5',
          '300': '#d4d4d4',
          '400': '#a3a3a3',
          '500': '#737373',
          '600': '#525252',
          '700': '#404040',
          '800': '#262626',
          '900': '#171717',
        },
        // Status colors - minimal, sophisticated
        'success': '#00ffaa',
        'warning': '#fbbf24',
        'error': '#ef4444',
        'info': '#60a5fa',
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Geist Sans', 'Inter', 'system-ui'],
      },
      fontSize: {
        // Premium typography scale
        xs: ['12px', { lineHeight: '16px', letterSpacing: '-0.3px' }],
        sm: ['14px', { lineHeight: '20px', letterSpacing: '-0.2px' }],
        base: ['16px', { lineHeight: '24px', letterSpacing: '-0.2px' }],
        lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
        xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.3px' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.4px' }],
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.5px' }],
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.6px' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.4px',
        tight: '-0.2px',
        normal: '0',
        wide: '0.4px',
        wider: '0.8px',
        widest: '1.6px',
      },
      // Glassmorphism effect
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        // Premium, subtle shadows
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        // Glass shadows
        'glass-sm': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
        'glass-lg': '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        // Glow accents
        'amanah-glow': '0 0 20px rgba(0, 255, 170, 0.2)',
      },
      spacing: {
        // Premium spacing scale
        0: '0',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        36: '144px',
        40: '160px',
        44: '176px',
        48: '192px',
        52: '208px',
        56: '224px',
        60: '240px',
        64: '256px',
        72: '288px',
        80: '320px',
        96: '384px',
      },
      borderRadius: {
        // Subtle, premium rounded corners
        none: '0',
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      borderWidth: {
        0: '0',
        1: '1px',
        2: '2px',
      },
      opacity: {
        0: '0',
        5: '0.05',
        10: '0.1',
        20: '0.2',
        25: '0.25',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        75: '0.75',
        80: '0.8',
        90: '0.9',
        95: '0.95',
        100: '1',
      },
      transitionDuration: {
        0: '0ms',
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },
      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.8' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 170, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 255, 170, 0.4)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-in-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function ({ addBase, addComponents, addUtilities, theme }: any) {
      // Base styles
      addBase({
        'body': {
          '@apply bg-dark-950 text-neutral-100': {},
          fontFamily: theme('fontFamily.sans').join(', '),
        },
        'h1, h2, h3, h4, h5, h6': {
          '@apply font-bold tracking-tight': {},
        },
      });

      // Glassmorphism component
      addComponents({
        '.glass': {
          '@apply bg-dark-800/40 backdrop-blur-md border border-neutral-700/20 rounded-xl': {},
        },
        '.glass-sm': {
          '@apply bg-dark-800/40 backdrop-blur-sm border border-neutral-700/20 rounded-lg': {},
        },
        '.glass-lg': {
          '@apply bg-dark-800/50 backdrop-blur-lg border border-neutral-700/30 rounded-2xl': {},
        },

        // Button variants
        '.btn-primary': {
          '@apply px-4 py-2 bg-amanah-400 text-dark-950 font-semibold rounded-lg transition-all duration-200 hover:bg-amanah-500 hover:shadow-amanah-glow active:scale-95': {},
        },
        '.btn-secondary': {
          '@apply px-4 py-2 bg-dark-800 text-neutral-100 border border-neutral-700 font-semibold rounded-lg transition-all duration-200 hover:bg-dark-700 active:scale-95': {},
        },
        '.btn-ghost': {
          '@apply px-4 py-2 text-neutral-300 font-medium rounded-lg transition-colors duration-200 hover:text-neutral-100 hover:bg-dark-800/50': {},
        },

        // Input styles
        '.input-base': {
          '@apply px-3 py-2 bg-dark-800/50 border border-neutral-700/50 rounded-lg text-neutral-100 placeholder-neutral-500 transition-colors duration-200 focus:outline-none focus:border-amanah-400 focus:ring-1 focus:ring-amanah-400/50': {},
        },

        // Card styles
        '.card': {
          '@apply glass p-6 rounded-xl': {},
        },
        '.card-hover': {
          '@apply glass p-6 rounded-xl transition-all duration-300 hover:bg-dark-800/60 hover:border-neutral-600/50 cursor-pointer': {},
        },

        // Badge
        '.badge': {
          '@apply inline-flex items-center px-3 py-1 rounded-full text-sm font-medium': {},
        },
        '.badge-success': {
          '@apply badge bg-amanah-500/20 text-amanah-400': {},
        },
        '.badge-warning': {
          '@apply badge bg-yellow-500/20 text-yellow-400': {},
        },
        '.badge-error': {
          '@apply badge bg-red-500/20 text-red-400': {},
        },
      });

      // Utilities
      addUtilities({
        '.text-gradient': {
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
        '.safe-area': {
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        },
      });
    },
  ],
};

export default config;
