/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        surface: 'var(--surface)',
        raised:  'var(--raised)',
        border:  'var(--border)',
        accent:  'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        primary: 'var(--text-primary)',
        muted:   'var(--text-muted)',
        danger:  'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      scale: { 98: '0.98' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
}
