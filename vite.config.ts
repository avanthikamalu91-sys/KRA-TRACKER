import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs so phones on same Wi-Fi can connect
    port: 5173,
  },
})

