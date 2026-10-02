import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import sendOtpHandler from './api/send-otp.js';
import verifyOtpHandler from './api/verify-otp.js';
import googleAuthHandler from './api/google-auth.js';

// Ensure .env is populated into process.env in Vite Dev Server
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        let raw = '';
        req.on('data', chunk => {
          raw += chunk;
        });

        req.on('end', async () => {
          let body = {};
          if (raw) {
            try {
              body = JSON.parse(raw);
            } catch (e) {
              body = {};
            }
          }
          (req as any).body = body;

          const mockRes = {
            statusCode: 200,
            setHeader: (key: string, val: string) => res.setHeader(key, val),
            status: function (code: number) {
              this.statusCode = code;
              return this;
            },
            json: function (data: any) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            end: () => res.end()
          };

          try {
            if (url === '/api/send-otp') {
              await sendOtpHandler(req, mockRes);
            } else if (url === '/api/verify-otp') {
              await verifyOtpHandler(req, mockRes);
            } else if (url === '/api/google-auth') {
              await googleAuthHandler(req, mockRes);
            } else {
              next();
            }
          } catch (err: any) {
            console.error('Dev API Error:', err);
            mockRes.status(500).json({ success: false, error: err.message });
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5174,
    open: false,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-excel': ['xlsx'],
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
});
