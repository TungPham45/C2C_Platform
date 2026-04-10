/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

const devApiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3000';
const allowedHosts = ['localhost', '.ngrok-free.app'];
const proxy = {
  '/api': {
    target: devApiProxyTarget,
    changeOrigin: true,
  },
  '/uploads': {
    target: devApiProxyTarget,
    changeOrigin: true,
  },
};

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
    host: true, // cho phép truy cập từ ngoài (ngrok)
    allowedHosts,
    proxy,
    hmr: {
      port: 4200,
      protocol: 'ws',
      host: 'localhost',
    },
  },

  preview: {
    port: 4200,
    host: true,
    allowedHosts,
    proxy,
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
