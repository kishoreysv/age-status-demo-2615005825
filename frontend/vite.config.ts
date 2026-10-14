/** Configure the static React bundle and local development server. */
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(process.env.VITE_DEV_PORT ?? env.VITE_DEV_PORT ?? '5173');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('VITE_DEV_PORT must be an integer from 1 to 65535.');
  }

  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port, strictPort: true },
  };
});
