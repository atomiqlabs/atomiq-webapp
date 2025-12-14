const config = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,scss,css}'],
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
    },
    plugins: [],
    important: true,
};

export default config;
