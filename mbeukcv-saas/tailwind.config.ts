import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f3eee6',
        surface: '#fbf8f3',
        ink: '#1d1916',
        muted: '#5f574e',
        line: '#e0d6c8',
        sidebar: '#26211d',
        accent: '#8d3d24',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        sheet: '0 1px 2px rgba(29, 25, 22, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
