/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // 温暖日记主题色彩
        primary: {
          50: '#fdf6f6',
          100: '#fbeaea',
          200: '#f5d0d0',
          300: '#ecaaaa',
          400: '#e17979',
          500: '#C58787', // 豆沙红主色
          600: '#b66b6b',
          700: '#975757',
          800: '#7e4a4a',
          900: '#6a4242',
        },
        warm: {
          bg: '#F8F5F2',        // 米白背景
          paper: '#FEFBF6',     // 纸莎白
          text: '#333333',      // 炭灰文字
          muted: '#E0E0E0',     // 浅灰辅助
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        serif: ['LXGW WenKai GB', 'Source Han Serif CN', 'Noto Serif SC', 'serif'], // 标题保留原有字体
        sans: ['LXGW WenKai GB', 'Inter', 'PingFang SC', 'Source Han Sans CN', 'sans-serif'], // 正文使用霞鹜文楷
        mono: ['LXGW WenKai Mono GB', 'JetBrains Mono', 'Fira Code', 'monospace'], // 等宽字体
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "heart-beat": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "heart-beat": "heart-beat 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}