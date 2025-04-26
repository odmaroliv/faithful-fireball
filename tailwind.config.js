/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "brand-bg": "#f5f0ea",
        "brand-primary": "#21343A",
        "brand-secondary": "#D2C3A7",
        "brand-accent": "#E8DFCA",
        "brand-light": "#F9F6F0",
        "brand-gray": "#8A9294",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
