/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5f9",
          100: "#e2e8f0",
          600: "#334155",
          700: "#1e293b",
          800: "#14213d",
          900: "#0b1530",
        },
        brand: {
          50: "#effcfb",
          100: "#cff7f3",
          500: "#14a39a",
          600: "#0f857e",
          700: "#0d6b66",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,21,48,0.04), 0 4px 16px rgba(11,21,48,0.06)",
      },
    },
  },
  plugins: [],
};
