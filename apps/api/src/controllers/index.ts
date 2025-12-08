/**
 * Controller exports
 * All controllers will be exported from here
 */

// TODO: Add controller exports as they are created
export * from "./auth.controller";
export * from "./user.controller";
// Export admin controller functions with explicit names to avoid conflicts
export {
  listUsers,
  getUser as getAdminUser,
  updateRole,
  removeUser,
  getStats,
  registerDoctor as adminRegisterDoctor,
  listDoctors as adminListDoctors,
  getDoctor as adminGetDoctor,
  updateDoctorProfile as adminUpdateDoctorProfile,
  removeDoctor,
  getDoctorStatistics,
} from "./admin.controller";
// Export doctor controller functions
export {
  getDoctors,
  getDoctor,
  getDoctorByUser,
  registerDoctor,
  updateDoctorProfile,
} from "./doctor.controller";
// export * from './appointments.controller';
// export * from './availability.controller';
