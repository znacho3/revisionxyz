import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/scrapers/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
      },
    },
    
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        manualChunks(id) {
          if (id.endsWith('.json')) {
            const pathParts = id.split('/');
            const filename = pathParts[pathParts.length - 1].replace('.json', '');
            return `json-${filename}`;
          }
          
          if (id.includes('node_modules')) {
            
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
          }

          return undefined;
        },
      },
    },
  },

})
