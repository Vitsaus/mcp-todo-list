import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Enforce port 3000 for the Vite dev server. strictPort: true will make Vite
// fail if the port is already in use instead of falling back to another port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
});
