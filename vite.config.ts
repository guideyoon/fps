import { defineConfig } from 'vite';

export default defineConfig({
    root: './',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                game: 'FPS.html'
            }
        }
    },
    server: {
        host: true,
        port: 3000
    }
});
