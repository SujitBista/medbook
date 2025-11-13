import cors, { CorsOptions } from 'cors';
import { env, isDevelopment } from '../config/env';

/**
 * CORS configuration for Express app
 * Allows frontend to communicate with backend API
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (isDevelopment) {
      const allowedOrigins = [
        env.corsOrigin,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // In production, only allow configured origin
    if (origin === env.corsOrigin) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);

