/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    `./src/pages/**/*.{js,jsx,ts,tsx}`,
    `./src/components/**/*.{js,jsx,ts,tsx}`,
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.1s ease-out',
        'scale-in': 'scale-in 0.1s ease-out',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "100ch",
          },
        },
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
      colors: {
        primary: "var(--color-bg-primary)",
        secondary: "var(--color-bg-secondary)",
        accent: "var(--color-bg-accent)",
        light: "var(--color-bg-light)",
        tertiary: "var(--color-bg-tertiary)",
        "light-blue": "var(--color-bg-light-blue)",
        "magenta-400": "var(--color-magenta-400)",
        "magenta-600": "var(--color-magenta-600)",
        "magenta-700": "var(--color-magenta-700)",
        "magenta-900": "var(--color-magenta-900)",

      },
      textColor: {
        accent: "var(--color-text-accent)",
        primary: "var(--color-text-primary)",
        "primary-active": "var(--color-text-primary-active)",
        secondary: "var(--color-text-secondary)",
        message: "var(--color-text-message)",
        "magenta-900": "var(--color-magenta-900)",
        "purple-900": "var(--color-purple-900)",
      },
      borderColor: {
        accent: "var(--color-border-accent)",
        primary: "var(--color-border-primary)",
        secondary: "var(--color-border-secondary)",
        "magenta-400": "var(--color-magenta-400)",
        "magenta-600": "var(--color-magenta-600)",
        "magenta-700": "var(--color-magenta-700)",
      },
      ringColor: {
        accent: "var(--color-text-accent)",
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    function ({ addBase, theme }) {
      addBase({
        ":root": {
          "--tw-bg-opacity": "1",
          "--tw-text-opacity": "1",
          "--tw-border-opacity": "1",
        },
      });
    },
  ],
};
