import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        proxy: {
            '/api/steam': {
                target: 'https://api.steampowered.com',
                changeOrigin: true,
                rewrite: (path) => {
                    const url = new URL(path, 'http://localhost');
                    return url.searchParams.get('url')?.replace('https://api.steampowered.com', '') ?? path;
                },
            },
        },
    },
});
