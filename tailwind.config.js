/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // Paleta más llamativa pero manteniendo la identidad Sarnian
        "brand-bg": "#eef5ff", // Fondo azul claro más brillante
        "brand-primary": "#1a3a86", // Azul Sarnian principal ligeramente ajustado para más viveza
        "brand-secondary": "#4779db", // Azul más vibrante para el "Stress-free"
        "brand-accent": "#0055cc", // Azul brillante para botones y elementos destacados
        "brand-light": "#ffffff", // Blanco puro para máximo contraste
        "brand-gray": "#2d3748", // Gris más oscuro para mejor legibilidad
        "brand-blue-light": "#6b99ff", // Azul claro para hover y elementos secundarios
        "brand-blue-dark": "#102a6a", // Azul oscuro para contrastes

        // Escala actualizada con colores más vibrantes
        sarnian: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#b3d1ff",
          300: "#80b0ff",
          400: "#5590ff",
          500: "#3370f8",
          600: "#1a3a86", // El color del logo ajustado
          700: "#102a6a",
          800: "#0a1c45",
          900: "#050e24",
        },

        // Color para bordes y elementos sutiles
        "brand-border": "#c9d8f0",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
      boxShadow: {
        custom:
          "0 10px 25px -5px rgba(26, 58, 134, 0.1), 0 8px 10px -6px rgba(26, 58, 134, 0.1)",
        "custom-lg":
          "0 20px 35px -10px rgba(26, 58, 134, 0.15), 0 10px 15px -5px rgba(26, 58, 134, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
