import { Router, type IRouter } from 'express';

/**
 * Main router aggregator
 * All routes will be registered here
 */
const router: IRouter = Router();

// Health check route (can also be in app.ts, but keeping here for future expansion)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// TODO: Register route modules here
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/doctors', doctorRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/availability', availabilityRoutes);

export default router;

