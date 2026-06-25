const config = {
    // Exclude test files: Tailwind's JIT scans content as raw text and emits a utility
    // for any bare word matching a class name (e.g. a `collapse` variable/description in
    // a test), which then collides with Bootstrap's runtime `.collapse` class and hides
    // collapsed accordions/navbars. Tests must not influence the generated CSS.
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,scss,css}',
        '!./src/**/*.{test,spec}.{js,ts,jsx,tsx}',
        '!./src/**/__tests__/**',
    ],
    theme: {
        extend: {
            colors: {
                pink: '#FF2E8C',
                pinkSlate: 'rgba(255,46,140,0.5)',
                black: '#180931',
                green: '#40E72D',
                red: '#FF6C6C',
                yellow: '#F5F505',
                blue: '#00A7E1',
            },
        },
        screens: {
            'sm': '576px',
            'md': '768px',
            'lg': '992px',
            'xl': '1200px',
            'xxl': '1400px'
        }
    },
    plugins: [],
    important: true,
};

export default config;
