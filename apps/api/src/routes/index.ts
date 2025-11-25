import { Router, type IRouter } from "express";
import { checkDatabaseHealth } from "@app/db";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";

/**
 * Main router aggregator
 * All routes will be registered here
 */
const router: IRouter = Router();

// Health check route (can also be in app.ts, but keeping here for future expansion)
router.get("/health", async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  const status = dbHealthy ? 200 : 503;

  res.status(status).json({
    status: dbHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbHealthy ? "connected" : "disconnected",
  });
});

// Register route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
// router.use('/doctors', doctorRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/availability', availabilityRoutes);

export default router;
