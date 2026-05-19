import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0056b3',
          dark: '#004494',
          light: '#1a6fc4',
        },
        success: '#28a745',
        danger: '#dc3545',
        muted: '#6c757d',
        border: '#dee2e6',
        surface: '#f8f9fa',
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        panel: '0 4px 6px rgba(0,0,0,0.02)',
        login: '0 10px 25px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
export default config
