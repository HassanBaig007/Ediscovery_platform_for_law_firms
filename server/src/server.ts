import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import { getServiceContainer } from './components/ServiceContainer';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize ServiceContainer
(async () => {
    try {
        const serviceContainer = getServiceContainer();
        await serviceContainer.initialize();
        console.log('ServiceContainer initialized successfully');
    } catch (error) {
        console.error('Failed to initialize ServiceContainer:', error);
        // Continue server startup even if ServiceContainer fails
        // This allows the server to run without enhanced features
    }
})();

// Middleware
// CORS must be applied BEFORE helmet so that Access-Control-* headers are set
// before helmet's restrictive Cross-Origin defaults can interfere.
const devAllowedOrigin = (origin?: string) => {
    if (!origin) return true; // allow curl/postman
    if (process.env.CORS_ORIGIN) return origin === process.env.CORS_ORIGIN;
    // Allow any localhost/127.0.0.1 port during dev (Vite can shift ports)
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};
app.use(cors({
    origin: (origin, callback) => {
        callback(null, devAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
    // Disable crossOriginResourcePolicy — its default 'same-origin' blocks
    // cross-origin API responses (e.g. Vite dev server on a different port).
    crossOriginResourcePolicy: false,
}));
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Public health check must be mounted before generic /api routers that apply auth middleware.
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Server operational',
        timestamp: new Date().toISOString()
    });
});

// Routes
import authRoutes from './routes/authRoutes';
import caseRoutes from './routes/case.routes';
import custodianRoutes from './routes/custodian.routes';
import documentRoutes from './routes/document.routes';
import tagRoutes from './routes/tag.routes';
import reviewRoutes from './routes/review.routes';
import productionRoutes from './routes/production.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import auditLogRoutes from './routes/auditLog.routes';
import enhancedRoutes from './routes/enhanced.routes';
import adminSettingsRoutes from './routes/adminSettings.routes';
import clientPortalRoutes from './routes/clientPortal.routes';

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api', custodianRoutes);
app.use('/api', documentRoutes);
app.use('/api', tagRoutes);
app.use('/api', reviewRoutes);
app.use('/api', productionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/admin', adminSettingsRoutes);
app.use('/api/client-portal', clientPortalRoutes);
// Enhanced routes already declare `/api/*` paths internally.
// Mount at root so they resolve to expected frontend URLs.
app.use('/', enhancedRoutes);

// Root Route
app.get('/', (req: Request, res: Response) => {
    res.send('e-Discovery Platform API is running...');
});

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server if not a module (for testing/serverless)
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Global error handlers to attempt graceful shutdown
    process.on('unhandledRejection', async (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        try {
            await mongoose.connection.close(false);
            console.log('Mongoose connection closed after unhandledRejection');
        } catch (closeErr) {
            console.error('Error closing mongoose after unhandledRejection:', closeErr);
        }
        server.close(() => process.exit(1));
    });

    process.on('uncaughtException', async (err) => {
        console.error('Uncaught Exception:', err);
        try {
            await mongoose.connection.close(false);
            console.log('Mongoose connection closed after uncaughtException');
        } catch (closeErr) {
            console.error('Error closing mongoose after uncaughtException:', closeErr);
        }
        server.close(() => process.exit(1));
    });
}

export default app;
