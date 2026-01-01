import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Titillium Web"', 'sans-serif'],
                titillium: ['"Titillium Web"', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
