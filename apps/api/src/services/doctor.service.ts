/**
 * Doctor service functions
 * Handles doctor management business logic
 */

import { query, Prisma, UserRole as PrismaUserRole } from "@app/db";
import { Doctor, CreateDoctorInput, UpdateDoctorInput } from "@medbook/types";
import {
  createNotFoundError,
  createConflictError,
  createValidationError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import {
  getDepartmentBySlug,
  searchDepartmentsByQuery,
} from "./department.service";
import {
  getDoctorIdsWithScheduleInRange,
  getDoctorIdsWithFutureSchedule,
  getNextUpcomingScheduleByDoctorIds,
} from "./schedule.service";

/**
 * Gets doctor by ID
 * @param doctorId Doctor ID
 * @returns Doctor data with user information
 * @throws AppError if doctor not found
 */
const doctorIncludeUser = {
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  },
  department: {
    select: { id: true, name: true, slug: true },
  },
} as const;

function mapDoctorRowToDoctor(doctor: {
  id: string;
  userId: string;
  departmentId?: string | null;
  specialization?: string | null;
  department?: { id: string; name: string; slug: string } | null;
  bio?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  yearsOfExperience?: number | null;
  education?: string | null;
  profilePictureUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
  };
}): Doctor {
  const department = doctor.department;
  return {
    id: doctor.id,
    userId: doctor.userId,
    departmentId: doctor.departmentId ?? department?.id ?? undefined,
    specialization: department?.name ?? doctor.specialization ?? undefined,
    department: department
      ? { id: department.id, name: department.name, slug: department.slug }
      : undefined,
    bio: doctor.bio ?? undefined,
    licenseNumber: doctor.licenseNumber ?? undefined,
    address: doctor.address ?? undefined,
    city: doctor.city ?? undefined,
    state: doctor.state ?? undefined,
    zipCode: doctor.zipCode ?? undefined,
    yearsOfExperience: doctor.yearsOfExperience ?? undefined,
    education: doctor.education ?? undefined,
    profilePictureUrl: doctor.profilePictureUrl ?? undefined,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    userEmail: doctor.user?.email,
    userFirstName: doctor.user?.firstName ?? undefined,
    userLastName: doctor.user?.lastName ?? undefined,
    userPhoneNumber: doctor.user?.phoneNumber ?? undefined,
  };
}

export async function getDoctorById(doctorId: string): Promise<Doctor> {
  const doctor = await query<Prisma.DoctorGetPayload<{
    include: typeof doctorIncludeUser & {
      user: {
        select: {
          id: true;
          email: true;
          role: true;
          firstName: true;
          lastName: true;
          phoneNumber: true;
        };
      };
    };
  }> | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        ...doctorIncludeUser,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  return mapDoctorRowToDoctor(doctor) as Doctor;
}

/**
 * Gets doctor by user ID
 * @param userId User ID
 * @returns Doctor data
 * @throws AppError if doctor not found
 */
export async function getDoctorByUserId(userId: string): Promise<Doctor> {
  const doctor = await query<Prisma.DoctorGetPayload<{
    include: {
      user: { select: { id: true; email: true; role: true } };
      department: { select: { id: true; name: true; slug: true } };
    };
  }> | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, role: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  return mapDoctorRowToDoctor(doctor);
}

/**
 * Gets all doctors with optional pagination and search
 * @param options Query options (page, limit, search, specialization, hasAvailability, city, state, sortBy, sortOrder)
 * @returns List of doctors and pagination info
 */
export async function getAllDoctors(options?: {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: string;
  departmentId?: string;
  doctorId?: string;
  hasAvailability?: boolean;
  /** When true, return all doctors (no availability filter) with computed hasSchedule and nextAvailableSlotAt */
  includeNoSchedule?: boolean;
  city?: string;
  state?: string;
  sortBy?: "name" | "specialization" | "yearsOfExperience" | "createdAt";
  sortOrder?: "asc" | "desc";
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options?.search?.trim()?.toLowerCase() || undefined;
  const specialization = options?.specialization?.trim() || undefined;
  const departmentId = options?.departmentId?.trim() || undefined;
  const doctorId = options?.doctorId?.trim() || undefined;
  const includeNoSchedule = options?.includeNoSchedule ?? false;
  // When includeNoSchedule=true, don't filter by availability; otherwise use hasAvailability
  const hasAvailability = includeNoSchedule
    ? false
    : (options?.hasAvailability ?? false);
  const city = options?.city?.trim() || undefined;
  const state = options?.state?.trim() || undefined;
  const sortBy = options?.sortBy ?? "createdAt";
  const sortOrder = options?.sortOrder ?? "desc";

  const now = new Date();

  // Build where clause for search
  // Using 'any' for complex Prisma nested types
  const where: Prisma.DoctorWhereInput = {};

  if (doctorId) {
    where.id = doctorId;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  } else if (specialization) {
    // Resolve specialization (slug or name) to departmentId when possible
    const slug = toSlug(specialization);
    if (slug) {
      const dep = await getDepartmentBySlug(slug);
      if (dep) {
        where.departmentId = dep.id;
      } else {
        where.specialization = {
          contains: specialization,
          mode: "insensitive",
        };
      }
    } else {
      where.specialization = { contains: specialization, mode: "insensitive" };
    }
  }

  // Enhanced search: search by name (firstName, lastName), email
  const searchConditions: Prisma.DoctorWhereInput[] = [];
  if (search) {
    searchConditions.push({
      OR: [
        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  // Location filtering
  if (city) {
    where.city = {
      contains: city,
      mode: "insensitive",
    };
  }

  if (state) {
    where.state = {
      contains: state,
      mode: "insensitive",
    };
  }

  // Filter by availability: when showAll=false (default), return only doctors with at least one
  // upcoming capacity schedule. No dependency on Slot or Availability tables for discovery.
  // Root cause of "No doctors found" with capacity-only: previously we required slots/availabilities
  // OR capacity; now we use only capacity schedules (Schedule table) for default listing.
  let doctorIdsWithFutureSchedule: Set<string> = new Set();
  if (hasAvailability) {
    doctorIdsWithFutureSchedule = await getDoctorIdsWithFutureSchedule();
    // Restrict to doctors who have an upcoming capacity schedule (id in set; empty set => no doctors)
    searchConditions.push({
      id: { in: Array.from(doctorIdsWithFutureSchedule) },
    });
  }

  // Combine all conditions with AND
  if (searchConditions.length > 0) {
    where.AND = searchConditions;
  }

  // Build orderBy clause based on sortBy
  let orderBy: Prisma.DoctorOrderByWithRelationInput;
  if (sortBy === "name") {
    // Sort by firstName, then lastName
    orderBy = {
      user: {
        firstName: sortOrder,
      },
    };
  } else if (sortBy === "specialization") {
    orderBy = {
      department: {
        name: sortOrder === "asc" ? "asc" : "desc",
      },
    };
  } else if (sortBy === "yearsOfExperience") {
    orderBy = {
      yearsOfExperience: sortOrder === "asc" ? "asc" : "desc",
    };
  } else {
    // Default: createdAt
    orderBy = {
      createdAt: sortOrder,
    };
  }

  // Determine what to include in the query based on whether we need availability filtering
  const includeOptions: Prisma.DoctorInclude = {
    user: {
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    },
    department: {
      select: { id: true, name: true, slug: true },
    },
  };

  // When filtering by availability we use only capacity schedules (no Slot/Availability includes needed).
  // Standard pagination at DB level since filter is id IN (doctorIdsWithFutureSchedule).
  let doctors: Prisma.DoctorGetPayload<{
    include: typeof includeOptions;
  }>[];
  let total: number;

  try {
    [doctors, total] = await Promise.all([
      query<
        Prisma.DoctorGetPayload<{
          include: typeof includeOptions;
        }>[]
      >((prisma) =>
        prisma.doctor.findMany({
          where,
          skip,
          take: limit,
          include: includeOptions,
          orderBy,
        })
      ),
      query<number>((prisma) => prisma.doctor.count({ where })),
    ]);
  } catch (error) {
    logger.error("Error in getAllDoctors query", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      options: {
        page,
        limit,
        search,
        specialization,
        hasAvailability,
        city,
        state,
        sortBy,
        sortOrder,
      },
    });
    throw error;
  }

  // When includeNoSchedule, compute hasSchedule from capacity schedules (same source as booking page)
  let doctorIdsWithSchedules: Set<string> = new Set();
  if (includeNoSchedule && doctors.length > 0) {
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 90);
    doctorIdsWithSchedules = await getDoctorIdsWithScheduleInRange(
      doctors.map((d) => d.id),
      now,
      rangeEnd
    );
  }

  // Next upcoming capacity schedule per doctor (for "Next available" and booking default date)
  const nextSchedules =
    doctors.length > 0
      ? await getNextUpcomingScheduleByDoctorIds(doctors.map((d) => d.id))
      : new Map();

  return {
    doctors: doctors.map((doctor) => {
      const base = mapDoctorRowToDoctor(doctor);
      const next = nextSchedules.get(doctor.id);
      const nextScheduleDate = next
        ? next.date.toISOString().slice(0, 10)
        : undefined;
      const nextScheduleStartTime = next?.startTime;
      const nextScheduleEndTime = next?.endTime;
      const remainingTokens = next?.remaining;

      if (includeNoSchedule) {
        return {
          ...base,
          hasSchedule: doctorIdsWithSchedules.has(doctor.id),
          nextAvailableSlotAt: undefined,
          nextScheduleDate,
          nextScheduleStartTime,
          nextScheduleEndTime,
          remainingTokens,
        };
      }
      return {
        ...base,
        nextScheduleDate,
        nextScheduleStartTime,
        nextScheduleEndTime,
        remainingTokens,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Compute hasSchedule and nextAvailableSlotAt from doctor's slots/availabilities */
function computeScheduleInfo(
  doctor: {
    slots?: { id: string; status: string; startTime: Date }[];
    availabilities?: {
      isRecurring: boolean;
      startTime: Date;
      endTime: Date;
      validFrom: Date | null;
      validTo: Date | null;
    }[];
    slotTemplate?: { durationMinutes: number | null } | null;
  },
  now: Date
): { hasSchedule: boolean; nextAvailableSlotAt: Date | null } {
  const slots = doctor.slots && Array.isArray(doctor.slots) ? doctor.slots : [];
  if (slots.length > 0) {
    const earliest = slots
      .map((s) => new Date(s.startTime))
      .filter((d) => d >= now)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return { hasSchedule: true, nextAvailableSlotAt: earliest ?? null };
  }

  const slotDurationMinutes = doctor.slotTemplate?.durationMinutes ?? 30;
  const minSlotDurationMs = slotDurationMinutes * 60 * 1000;
  const minSlotEndTime = new Date(now.getTime() + minSlotDurationMs);

  const availabilities =
    doctor.availabilities && Array.isArray(doctor.availabilities)
      ? doctor.availabilities
      : [];
  for (const availability of availabilities) {
    if (!availability.isRecurring) {
      if (new Date(availability.endTime) >= minSlotEndTime) {
        return {
          hasSchedule: true,
          nextAvailableSlotAt: new Date(availability.startTime),
        };
      }
    } else {
      const hasValidTimeRange =
        !availability.validTo ||
        new Date(availability.validTo) >= minSlotEndTime;
      if (hasValidTimeRange) {
        const availStart = new Date(availability.startTime);
        const availEnd = new Date(availability.endTime);
        const availDurationMs = availEnd.getTime() - availStart.getTime();
        if (availDurationMs >= minSlotDurationMs) {
          return {
            hasSchedule: true,
            nextAvailableSlotAt: availStart,
          };
        }
      }
    }
  }
  return { hasSchedule: false, nextAvailableSlotAt: null };
}

/** Slug for department/specialization: lowercase, hyphenated */
function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface SearchSuggestionDepartment {
  label: string;
  slug: string;
  /** When matched by alias only: the keyword(s) that matched (e.g. "chest pain") */
  matchReason?: string;
}

export interface SearchSuggestionDoctor {
  id: string;
  name: string;
  department: string;
}

export interface SearchSuggestionsResult {
  departments: SearchSuggestionDepartment[];
  doctors: SearchSuggestionDoctor[];
}

/**
 * Get search suggestions (departments/specializations + doctors) for typeahead.
 * Departments are matched by: (a) department name, (b) department alias keywords.
 * Name matches rank above alias matches. Doctor suggestions unchanged (name/specialization).
 */
export async function getSearchSuggestions(
  q: string
): Promise<SearchSuggestionsResult> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) {
    return { departments: [], doctors: [] };
  }

  const [departmentMatches, doctors] = await Promise.all([
    searchDepartmentsByQuery(term),
    query<
      Prisma.DoctorGetPayload<{
        include: {
          user: { select: { firstName: true; lastName: true } };
          department: { select: { name: true } };
        };
      }>[]
    >((prisma) =>
      prisma.doctor.findMany({
        where: {
          OR: [
            { specialization: { contains: term, mode: "insensitive" } },
            {
              department: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { slug: { contains: term, mode: "insensitive" } },
                ],
              },
            },
            {
              user: {
                OR: [
                  { firstName: { contains: term, mode: "insensitive" } },
                  { lastName: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
        take: 15,
        orderBy: { department: { name: "asc" } },
        include: {
          user: { select: { firstName: true, lastName: true } },
          department: { select: { name: true } },
        },
      })
    ),
  ]);

  const departmentsFromTable: SearchSuggestionDepartment[] =
    departmentMatches.map((d) => ({
      label: d.name,
      slug: d.slug,
      ...(d.matchReason ? { matchReason: d.matchReason } : {}),
    }));

  const slugFromTable = new Set(departmentsFromTable.map((d) => d.slug));
  const departmentMap = new Map<string, { label: string; slug: string }>();
  for (const d of doctors) {
    const spec = d.specialization?.trim();
    if (spec && spec.toLowerCase().includes(term)) {
      const slug = toSlug(spec);
      if (slug && !slugFromTable.has(slug) && !departmentMap.has(slug)) {
        departmentMap.set(slug, { label: spec, slug });
      }
    }
  }
  const departmentsFromDoctors: SearchSuggestionDepartment[] = Array.from(
    departmentMap.values()
  );

  const departments: SearchSuggestionDepartment[] = [
    ...departmentsFromTable,
    ...departmentsFromDoctors,
  ];

  const doctorsList: SearchSuggestionDoctor[] = doctors.map((d) => ({
    id: d.id,
    name: `Dr. ${d.user.firstName} ${d.user.lastName}`.trim(),
    department: d.department?.name ?? d.specialization ?? "",
  }));

  return { departments, doctors: doctorsList };
}

/**
 * Creates a new doctor profile
 * @param input Doctor creation input
 * @returns Created doctor data
 * @throws AppError if user not found, user is not a doctor, or doctor already exists
 */
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  const {
    userId,
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
  } = input;

  // Verify user exists and has DOCTOR role
  const user = await query<{
    id: string;
    role: PrismaUserRole;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    })
  );

  if (!user) {
    throw createNotFoundError("User");
  }

  if (user.role !== "DOCTOR") {
    throw createValidationError(
      "User must have DOCTOR role to create a doctor profile"
    );
  }

  // Check if doctor profile already exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
    specialization: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
    })
  );

  if (existingDoctor) {
    throw createConflictError("Doctor profile already exists for this user");
  }

  // Resolve specialization from department when only departmentId is provided
  let specializationValue = specialization?.trim() || null;
  if (departmentId && !specializationValue) {
    const dep = await query((prisma) =>
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      })
    );
    if (dep) specializationValue = dep.name;
  }

  // Create doctor profile
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: { select: { id: true; email: true; role: true } };
          department: { select: { id: true; name: true; slug: true } };
        };
      }>
    >((prisma) =>
      prisma.doctor.create({
        data: {
          userId,
          departmentId: departmentId?.trim() || null,
          specialization: specializationValue,
          bio: bio?.trim() || null,
          licenseNumber: licenseNumber?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zipCode: zipCode?.trim() || null,
          yearsOfExperience: yearsOfExperience || null,
          education: education?.trim() || null,
          profilePictureUrl: profilePictureUrl?.trim() || null,
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          department: { select: { id: true, name: true, slug: true } },
        },
      })
    );

    logger.info("Doctor profile created", { doctorId: doctor.id, userId });

    return mapDoctorRowToDoctor(doctor);
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw createConflictError("Doctor profile already exists for this user");
    }
    throw error;
  }
}

/**
 * Updates doctor profile
 * @param doctorId Doctor ID
 * @param input Update input
 * @returns Updated doctor data
 * @throws AppError if doctor not found
 */
export async function updateDoctor(
  doctorId: string,
  input: UpdateDoctorInput
): Promise<Doctor> {
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
  } = input;

  // Check if doctor exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
    specialization: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
    })
  );

  if (!existingDoctor) {
    throw createNotFoundError("Doctor");
  }

  // When departmentId is set, sync specialization from department name if not provided
  let specializationValue: string | null | undefined = specialization;
  if (departmentId !== undefined && specialization === undefined) {
    const dep = await query((prisma) =>
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      })
    );
    specializationValue = dep?.name ?? null;
  } else if (specialization !== undefined) {
    specializationValue = specialization.trim() || null;
  }

  // Update doctor
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: { select: { id: true; email: true; role: true } };
          department: { select: { id: true; name: true; slug: true } };
        };
      }>
    >((prisma) =>
      prisma.doctor.update({
        where: { id: doctorId },
        data: {
          ...(departmentId !== undefined && {
            departmentId: departmentId?.trim() || null,
          }),
          ...(specializationValue !== undefined && {
            specialization: specializationValue,
          }),
          ...(bio !== undefined && { bio: bio.trim() || null }),
          ...(licenseNumber !== undefined && {
            licenseNumber: licenseNumber.trim() || null,
          }),
          ...(address !== undefined && { address: address.trim() || null }),
          ...(city !== undefined && { city: city.trim() || null }),
          ...(state !== undefined && { state: state.trim() || null }),
          ...(zipCode !== undefined && { zipCode: zipCode.trim() || null }),
          ...(yearsOfExperience !== undefined && {
            yearsOfExperience: yearsOfExperience || null,
          }),
          ...(education !== undefined && {
            education: education.trim() || null,
          }),
          ...(profilePictureUrl !== undefined && {
            profilePictureUrl: profilePictureUrl.trim() || null,
          }),
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          department: { select: { id: true, name: true, slug: true } },
        },
      })
    );

    logger.info("Doctor profile updated", { doctorId });

    return mapDoctorRowToDoctor(doctor);
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Doctor");
    }
    throw error;
  }
}

/**
 * Deletes a doctor profile and associated user (admin only)
 * @param doctorId Doctor ID
 * @throws AppError if doctor not found
 */
export async function deleteDoctor(doctorId: string): Promise<void> {
  // Check if doctor exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        userId: true,
      },
    })
  );

  if (!existingDoctor) {
    throw createNotFoundError("Doctor");
  }

  try {
    // Delete doctor profile (cascade will handle user deletion if configured)
    // Or delete user which will cascade delete doctor profile
    await query<{
      id: string;
      email: string;
      password: string;
      role: string;
      mustResetPassword: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.delete({
        where: { id: existingDoctor.userId },
      })
    );

    logger.info("Doctor deleted by admin", {
      doctorId,
      userId: existingDoctor.userId,
    });
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Doctor");
    }
    throw error;
  }
}

/**
 * Gets doctor statistics
 * @returns Doctor statistics
 */
export interface DoctorStats {
  totalDoctors: number;
  doctorsBySpecialization: Record<string, number>;
}

export async function getDoctorStats(): Promise<DoctorStats> {
  const doctors = await query<
    {
      specialization: string | null;
      department: { name: string } | null;
    }[]
  >((prisma) =>
    prisma.doctor.findMany({
      select: {
        specialization: true,
        department: { select: { name: true } },
      },
    })
  );

  const totalDoctors = doctors.length;
  const doctorsBySpecialization: Record<string, number> = {};

  doctors.forEach((doctor) => {
    const label =
      doctor.department?.name ?? doctor.specialization ?? "Unspecified";
    doctorsBySpecialization[label] = (doctorsBySpecialization[label] || 0) + 1;
  });

  return {
    totalDoctors,
    doctorsBySpecialization,
  };
}
