export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: { colors: {
    bg: 'rgb(var(--bg) / <alpha-value>)', card: 'rgb(var(--card) / <alpha-value>)',
    fg: 'rgb(var(--fg) / <alpha-value>)', muted: 'rgb(var(--muted) / <alpha-value>)',
    accent: 'rgb(var(--accent) / <alpha-value>)' } } },
  plugins: []
}
