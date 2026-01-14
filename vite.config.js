import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import { config as dotenvConfig } from 'dotenv'

// Load .env file for server-side variables (AWS credentials)
dotenvConfig()

// Custom plugin to handle API routes during development
function apiRoutesPlugin() {
  return {
    name: 'api-routes',
    configureServer(server) {
      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'bizscreen-media';
      const CDN_URL = process.env.AWS_CLOUDFRONT_URL;

      // Allowed content types
      const ALLOWED_TYPES = {
        'image/jpeg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'image/webp': 'image',
        'image/svg+xml': 'image',
        'video/mp4': 'video',
        'video/webm': 'video',
        'video/quicktime': 'video',
        'video/x-msvideo': 'video',
        'audio/mpeg': 'audio',
        'audio/wav': 'audio',
        'audio/ogg': 'audio',
        'audio/mp4': 'audio',
        'application/pdf': 'document',
        'application/msword': 'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
        'application/vnd.ms-powerpoint': 'document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
        'application/vnd.ms-excel': 'document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
      };

      // Handle /api/media/presign
      server.middlewares.use('/api/media/presign', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { filename, contentType, folder = 'uploads' } = JSON.parse(body);

            if (!filename || !contentType) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing filename or contentType' }));
              return;
            }

            const mediaType = ALLOWED_TYPES[contentType];
            if (!mediaType) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'File type not allowed', allowedTypes: Object.keys(ALLOWED_TYPES) }));
              return;
            }

            const extension = filename.split('.').pop().toLowerCase();
            const uniqueId = uuidv4();
            const key = `${folder}/${mediaType}/${uniqueId}.${extension}`;

            const command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
              ContentType: contentType,
              Metadata: {
                'original-filename': encodeURIComponent(filename),
                'upload-date': new Date().toISOString(),
              },
            });

            const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

            const fileUrl = CDN_URL
              ? `${CDN_URL}/${key}`
              : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              uploadUrl,
              fileUrl,
              key,
              mediaType,
              bucket: BUCKET_NAME,
            }));
          } catch (error) {
            console.error('Error generating presigned URL:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to generate upload URL' }));
          }
        });
      });

      // Handle /api/health
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    apiRoutesPlugin(),
    // Bundle analyzer - generates reports in /perf-reports
    visualizer({
      filename: 'perf-reports/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // or 'sunburst', 'network'
    }),
  ],
  build: {
    // Increase warning limit since we have intentionally large pages
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks for better caching and parallel loading
        manualChunks: {
          // React and router in their own chunk (rarely changes)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client (medium-sized, rarely changes)
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI icons (large, rarely changes)
          'vendor-icons': ['lucide-react'],
          // Animation library (load on-demand)
          'vendor-motion': ['framer-motion'],
          // QR code generation (used for screen pairing)
          'vendor-qrcode': ['qrcode'],
        },
      },
    },
  },
})
