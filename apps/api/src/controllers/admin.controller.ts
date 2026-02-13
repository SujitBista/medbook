/**
 * Admin controller
 * Handles HTTP requests for admin-only endpoints
 */

import { Response, NextFunction } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getSystemStats,
  getAppointmentStats,
  getSystemHealth,
  createDoctorUser,
  UpdateUserRoleInput,
  CreateDoctorUserInput,
} from "../services/admin.service";
import {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorStats,
} from "../services/doctor.service";
import {
  getCommissionSettingsByDoctorId,
  createCommissionSettings,
  updateCommissionSettings,
} from "../services/commission.service";
import {
  UpdateDoctorInput,
  CreateCommissionSettingsInput,
  UpdateCommissionSettingsInput,
  ScheduleExceptionType,
} from "@medbook/types";
import {
  createScheduleException,
  listScheduleExceptions,
  deleteScheduleException,
  getScheduleExceptionById,
} from "../services/exception.service";
import {
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from "../services/schedule.service";
import { createManualBooking } from "../services/booking.service";
import {
  getAllDepartments,
  getDepartmentById as getDepartmentByIdService,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  parseKeywordString,
} from "../services/department.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get all users (admin only)
 * GET /api/v1/admin/users
 */
export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await getAllUsers();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID (admin only)
 * GET /api/v1/admin/users/:id
 */
export async function getUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    const user = await getUserById(id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user role (admin only)
 * PUT /api/v1/admin/users/:id/role
 */
export async function updateRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!id) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    if (!role) {
      const error = createValidationError("Role is required");
      next(error);
      return;
    }

    // Prevent admin from changing their own role
    if (req.user.id === id) {
      const error = createValidationError("You cannot change your own role");
      next(error);
      return;
    }

    const input: UpdateUserRoleInput = {
      role,
    };

    const user = await updateUserRole(id, input);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user (admin only)
 * DELETE /api/v1/admin/users/:id
 */
export async function removeUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const { id } = req.params;

    if (!id) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      const error = createValidationError("You cannot delete your own account");
      next(error);
      return;
    }

    await deleteUser(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get system statistics (admin only)
 * GET /api/v1/admin/stats
 */
export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getSystemStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new doctor user (admin only)
 * POST /api/v1/admin/doctors
 */
export async function registerDoctor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      departmentId,
      specialization,
      bio,
      licenseNumber,
      address,
      city,
      state,
      zipCode,
      yearsOfExperience,
      education,
      profilePictureUrl,
    } = req.body;

    // Validate required fields
    const fieldErrors: Record<string, string> = {};
    if (!email) {
      fieldErrors.email = "Email is required";
    }
    if (!password) {
      fieldErrors.password = "Password is required";
    }
    if (!firstName || !firstName.trim()) {
      fieldErrors.firstName = "First name is required";
    }
    if (!lastName || !lastName.trim()) {
      fieldErrors.lastName = "Last name is required";
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      fieldErrors.phoneNumber = "Phone number is required";
    }
    if (!departmentId || !String(departmentId).trim()) {
      fieldErrors.departmentId = "Department is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      const error = createValidationError(
        "Please fill in all required fields",
        {
          errors: fieldErrors,
        }
      );
      next(error);
      return;
    }

    const input: CreateDoctorUserInput = {
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      departmentId: String(departmentId).trim(),
      specialization,
      bio,
      licenseNumber,
      address,
      city,
      state,
      zipCode,
      yearsOfExperience,
      education,
      profilePictureUrl,
    };

    const result = await createDoctorUser(input);

    res.status(201).json({
      success: true,
      user: result.user,
      doctor: result.doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all doctors (admin only)
 * GET /api/v1/admin/doctors
 */
export async function listDoctors(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100; // Admin can see more doctors at once
    const search = req.query.search as string | undefined;
    const specialization = req.query.specialization as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      const error = createValidationError("Page must be greater than 0");
      next(error);
      return;
    }

    if (limit < 1 || limit > 1000) {
      const error = createValidationError("Limit must be between 1 and 1000");
      next(error);
      return;
    }

    const result = await getAllDoctors({
      page,
      limit,
      search,
      specialization,
      departmentId,
    });

    res.status(200).json({
      success: true,
      data: result.doctors,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get doctor by ID (admin only)
 * GET /api/v1/admin/doctors/:id
 */
export async function getDoctor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    const doctor = await getDoctorById(id);

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update doctor profile (admin only)
 * PUT /api/v1/admin/doctors/:id
 */
export async function updateDoctorProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      departmentId,
      specialization,
      bio,
      licenseNumber,
      address,
      city,
      state,
      zipCode,
      yearsOfExperience,
      education,
      profilePictureUrl,
    } = req.body;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Validate that at least one field is provided
    const hasAnyField =
      departmentId !== undefined ||
      specialization !== undefined ||
      bio !== undefined ||
      licenseNumber !== undefined ||
      address !== undefined ||
      city !== undefined ||
      state !== undefined ||
      zipCode !== undefined ||
      yearsOfExperience !== undefined ||
      education !== undefined ||
      profilePictureUrl !== undefined;

    if (!hasAnyField) {
      const error = createValidationError(
        "At least one field must be provided"
      );
      next(error);
      return;
    }

    const input: UpdateDoctorInput = {
      ...(departmentId !== undefined && { departmentId }),
      ...(specialization !== undefined && { specialization }),
      ...(bio !== undefined && { bio }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(yearsOfExperience !== undefined && { yearsOfExperience }),
      ...(education !== undefined && { education }),
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
    };

    const doctor = await updateDoctor(id, input);

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete doctor (admin only)
 * DELETE /api/v1/admin/doctors/:id
 */
export async function removeDoctor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    await deleteDoctor(id);

    res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get doctor statistics (admin only)
 * GET /api/v1/admin/doctors/stats
 */
export async function getDoctorStatistics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getDoctorStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get appointment statistics (admin only)
 * GET /api/v1/admin/appointments/stats
 */
export async function getAppointmentStatistics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getAppointmentStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get system health status (admin only)
 * GET /api/v1/admin/health
 */
export async function getSystemHealthStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const health = await getSystemHealth();

    res.status(200).json({
      success: true,
      health,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get commission settings for a doctor (admin only)
 * GET /api/v1/admin/doctors/:doctorId/commission-settings
 */
export async function getCommissionSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    const settings = await getCommissionSettingsByDoctorId(doctorId);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create commission settings for a doctor (admin only)
 * POST /api/v1/admin/doctors/:doctorId/commission-settings
 */
export async function createCommissionSettingsForDoctor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;
    const { commissionRate, appointmentPrice } = req.body;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    if (commissionRate === undefined || appointmentPrice === undefined) {
      const error = createValidationError(
        "Commission rate and appointment price are required"
      );
      next(error);
      return;
    }

    const input: CreateCommissionSettingsInput = {
      doctorId,
      commissionRate: Number(commissionRate),
      appointmentPrice: Number(appointmentPrice),
    };

    const settings = await createCommissionSettings(input);

    res.status(201).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update commission settings for a doctor (admin only)
 * PUT /api/v1/admin/doctors/:doctorId/commission-settings
 */
export async function updateCommissionSettingsForDoctor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;
    const { commissionRate, appointmentPrice } = req.body;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Validate that at least one field is provided
    if (commissionRate === undefined && appointmentPrice === undefined) {
      const error = createValidationError(
        "At least one field (commissionRate or appointmentPrice) must be provided"
      );
      next(error);
      return;
    }

    const input: UpdateCommissionSettingsInput = {
      ...(commissionRate !== undefined && {
        commissionRate: Number(commissionRate),
      }),
      ...(appointmentPrice !== undefined && {
        appointmentPrice: Number(appointmentPrice),
      }),
    };

    const settings = await updateCommissionSettings(doctorId, input);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create schedule exception(s) (admin only)
 * POST /api/v1/admin/scheduling/exceptions
 */
export async function createSchedulingException(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const body = req.body;
    const scope = body.scope as "ALL_DOCTORS" | "SELECTED_DOCTORS" | undefined;
    const doctorIds = body.doctorIds as string[] | undefined;
    const dateFrom = body.dateFrom as string | undefined;
    const dateTo = body.dateTo as string | undefined;
    const isFullDay = body.isFullDay as boolean | undefined;
    const startTime = body.startTime as string | null | undefined;
    const endTime = body.endTime as string | null | undefined;
    const type = body.type as ScheduleExceptionType | undefined;
    const reason = body.reason as string | undefined;
    const label = body.label as string | null | undefined;

    if (!scope || !dateFrom) {
      const error = createValidationError("scope and dateFrom are required");
      next(error);
      return;
    }

    if (
      type !== ScheduleExceptionType.AVAILABLE &&
      type !== ScheduleExceptionType.UNAVAILABLE
    ) {
      const error = createValidationError(
        "type must be AVAILABLE or UNAVAILABLE"
      );
      next(error);
      return;
    }

    const created = await createScheduleException(
      {
        scope,
        doctorIds,
        dateFrom,
        dateTo,
        isFullDay,
        startTime,
        endTime,
        type,
        reason:
          reason ??
          (type === ScheduleExceptionType.UNAVAILABLE
            ? "HOLIDAY"
            : "EXTRA_HOURS"),
        label,
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List schedule exceptions (admin only)
 * GET /api/v1/admin/scheduling/exceptions
 */
export async function listSchedulingExceptions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doctorId = req.query.doctorId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const type = req.query.type as ScheduleExceptionType | undefined;

    const exceptions = await listScheduleExceptions({
      doctorId,
      startDate,
      endDate,
      type,
    });

    res.status(200).json({
      success: true,
      data: exceptions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete schedule exception (admin only)
 * DELETE /api/v1/admin/scheduling/exceptions/:id
 */
export async function deleteSchedulingException(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Exception ID is required");
      next(error);
      return;
    }

    await deleteScheduleException(id);

    res.status(200).json({
      success: true,
      message: "Schedule exception deleted",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get schedule exception by ID (admin only)
 * GET /api/v1/admin/scheduling/exceptions/:id
 */
export async function getSchedulingException(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Exception ID is required");
      next(error);
      return;
    }

    const exception = await getScheduleExceptionById(id);

    res.status(200).json({
      success: true,
      data: exception,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a capacity schedule (admin only)
 * POST /api/v1/admin/schedules
 */
export async function createScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId, date, startTime, endTime, maxPatients } = req.body;

    if (!doctorId || !date || !startTime || !endTime || maxPatients == null) {
      const error = createValidationError(
        "doctorId, date, startTime, endTime, and maxPatients are required"
      );
      next(error);
      return;
    }

    const schedule = await createSchedule(
      {
        doctorId,
        date: String(date),
        startTime: String(startTime),
        endTime: String(endTime),
        maxPatients: Number(maxPatients),
      },
      req.user?.id
    );

    res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List capacity schedules (admin only)
 * GET /api/v1/admin/schedules?doctorId=&date= or startDate=&endDate=
 */
export async function getSchedulesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doctorId = req.query.doctorId as string | undefined;
    const date = req.query.date as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const schedules = await getSchedules({
      doctorId,
      date,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a capacity schedule (admin only)
 * PATCH /api/v1/admin/schedules/:id
 */
export async function updateScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scheduleId = req.params.id;
    const { date, startTime, endTime, maxPatients } = req.body;

    if (!scheduleId || !date || !startTime || !endTime || maxPatients == null) {
      const error = createValidationError(
        "date, startTime, endTime, and maxPatients are required"
      );
      next(error);
      return;
    }

    const schedule = await updateSchedule(scheduleId, {
      date: String(date),
      startTime: String(startTime),
      endTime: String(endTime),
      maxPatients: Number(maxPatients),
    });

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a capacity schedule (admin only)
 * DELETE /api/v1/admin/schedules/:id
 */
export async function deleteScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scheduleId = req.params.id;
    if (!scheduleId) {
      const error = createValidationError("Schedule ID is required");
      next(error);
      return;
    }
    await deleteSchedule(scheduleId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/bookings/manual
 * Create manual (walk-in/cash/eSewa) booking with token assignment
 * Body: { scheduleId, patientId, paymentProvider: CASH|ESEWA, note? }
 */
export async function createManualBookingHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { scheduleId, patientId, paymentProvider, note } = req.body;

    if (!scheduleId || !patientId || !paymentProvider) {
      const error = createValidationError(
        "scheduleId, patientId, and paymentProvider are required"
      );
      next(error);
      return;
    }
    if (paymentProvider !== "CASH" && paymentProvider !== "ESEWA") {
      const error = createValidationError(
        "paymentProvider must be CASH or ESEWA"
      );
      next(error);
      return;
    }

    const result = await createManualBooking({
      scheduleId: String(scheduleId),
      patientId: String(patientId),
      paymentProvider,
      note: note != null ? String(note) : undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List departments (admin only)
 * GET /api/v1/admin/departments
 */
export async function listDepartments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const departments = await getAllDepartments();
    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get department by ID (admin only)
 * GET /api/v1/admin/departments/:id
 */
export async function getDepartment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      next(createValidationError("Department ID is required"));
      return;
    }
    const department = await getDepartmentByIdService(id);
    if (!department) {
      res
        .status(404)
        .json({ success: false, error: { message: "Department not found" } });
      return;
    }
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

/**
 * Create department (admin only)
 * POST /api/v1/admin/departments
 * Body: { name: string, searchKeywords?: string } (comma-separated)
 */
export async function createDepartmentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, searchKeywords } = req.body ?? {};
    if (!name || typeof name !== "string" || !name.trim()) {
      next(createValidationError("Department name is required"));
      return;
    }
    const keywords = searchKeywords
      ? parseKeywordString(
          typeof searchKeywords === "string"
            ? searchKeywords
            : String(searchKeywords)
        )
      : [];
    const department = await createDepartment({ name: name.trim(), keywords });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

/**
 * Update department (admin only)
 * PUT /api/v1/admin/departments/:id
 * Body: { name?: string, searchKeywords?: string } (comma-separated)
 */
export async function updateDepartmentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, searchKeywords } = req.body ?? {};
    if (!id) {
      next(createValidationError("Department ID is required"));
      return;
    }
    const input: { name?: string; keywords?: string[] } = {};
    if (name !== undefined)
      input.name = typeof name === "string" ? name.trim() : "";
    if (searchKeywords !== undefined)
      input.keywords = parseKeywordString(
        typeof searchKeywords === "string"
          ? searchKeywords
          : String(searchKeywords)
      );
    const department = await updateDepartment(id, input);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete department (admin only)
 * DELETE /api/v1/admin/departments/:id
 */
export async function deleteDepartmentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      next(createValidationError("Department ID is required"));
      return;
    }
    await deleteDepartment(id);
    res.status(200).json({ success: true, message: "Department deleted" });
  } catch (error) {
    next(error);
  }
}
