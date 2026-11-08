import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 800,
      ignored: ['**/*.glb', '**/*.obj', '**/*.ogg', '**/.git/**']
    }
  }
});
