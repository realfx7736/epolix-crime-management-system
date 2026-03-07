/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                admin: {
                    primary: '#e11d48', // rose-600
                    dark: '#4c0519', // rose-950
                },
                police: {
                    primary: '#1e1b4b', // indigo-950
                    accent: '#4338ca', // indigo-700
                },
                user: {
                    primary: '#2563eb', // blue-600
                    bg: '#f8fafc', // slate-50
                },
                staff: {
                    primary: '#059669', // emerald-600
                    light: '#ecfdf5', // emerald-50
                }
            },
            animation: {
                'gradient': 'gradient 8s linear infinite',
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                gradient: {
                    '0%, 100%': { 'background-position': '0% 50%' },
                    '50%': { 'background-position': '100% 50%' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
