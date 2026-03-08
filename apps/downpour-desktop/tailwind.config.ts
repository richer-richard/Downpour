import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#04080f',
        rain: '#4cc9f0',
        puddle: '#0f3b5a',
        neon: '#7df9ff',
        ember: '#ff9f43',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 16px rgba(125, 249, 255, 0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config;
