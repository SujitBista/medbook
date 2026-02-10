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

/**
 * Gets doctor by ID
 * @param doctorId Doctor ID
 * @returns Doctor data with user information
 * @throws AppError if doctor not found
 */
export async function getDoctorById(doctorId: string): Promise<Doctor> {
  const doctor = await query<Prisma.DoctorGetPayload<{
    include: {
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

  return {
    id: doctor.id,
    userId: doctor.userId,
    specialization: doctor.specialization ?? undefined,
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
    // Include user fields for display purposes
    userEmail: doctor.user?.email,
    userFirstName: doctor.user?.firstName ?? undefined,
    userLastName: doctor.user?.lastName ?? undefined,
    userPhoneNumber: doctor.user?.phoneNumber ?? undefined,
  };
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
      user: {
        select: {
          id: true;
          email: true;
          role: true;
        };
      };
    };
  }> | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  return {
    id: doctor.id,
    userId: doctor.userId,
    specialization: doctor.specialization ?? undefined,
    bio: doctor.bio ?? undefined,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
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

  if (specialization) {
    where.specialization = {
      contains: specialization,
      mode: "insensitive",
    };
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

  // Filter by availability if requested
  // This checks for doctors who have actual bookable slots (not just availabilities)
  // A doctor is considered available only if they have slots that can be booked
  // (accounting for minimum slot duration requirement from their slot template)
  if (hasAvailability) {
    searchConditions.push({
      OR: [
        // Has available slots (status = AVAILABLE, startTime >= now)
        {
          slots: {
            some: {
              AND: [
                { status: "AVAILABLE" },
                { startTime: { gte: now } },
                // Only include slots with valid availabilities
                { availability: { isNot: null } },
              ],
            },
          },
        },
        // Has availabilities that might be able to generate valid slots
        // (we'll filter by actual slot template duration in post-processing)
        {
          AND: [
            {
              availabilities: {
                some: {
                  OR: [
                    // One-time availability: endTime must be in the future
                    {
                      AND: [{ isRecurring: false }, { endTime: { gt: now } }],
                    },
                    // Recurring availability: must be active
                    {
                      AND: [
                        { isRecurring: true },
                        {
                          OR: [
                            { validFrom: null },
                            { validFrom: { lte: now } },
                          ],
                        },
                        {
                          OR: [{ validTo: null }, { validTo: { gt: now } }],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            // Ensure no existing available slots (so we know slots need to be generated)
            {
              slots: {
                none: {
                  AND: [{ status: "AVAILABLE" }, { startTime: { gte: now } }],
                },
              },
            },
          ],
        },
      ],
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
      specialization: sortOrder === "asc" ? "asc" : "desc",
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
  };

  // If filtering by availability OR computing hasSchedule (includeNoSchedule), include slotTemplate, slots, and availabilities
  if (hasAvailability || includeNoSchedule) {
    includeOptions.slotTemplate = {
      select: {
        durationMinutes: true,
      },
    };
    includeOptions.slots = {
      where: {
        status: "AVAILABLE",
        startTime: { gte: now },
        availability: { isNot: null },
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        availabilityId: true,
      },
    };
    includeOptions.availabilities = {
      where: {
        OR: [
          {
            AND: [{ isRecurring: false }, { endTime: { gt: now } }],
          },
          {
            AND: [
              { isRecurring: true },
              {
                OR: [{ validFrom: null }, { validFrom: { lte: now } }],
              },
              {
                OR: [{ validTo: null }, { validTo: { gt: now } }],
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        isRecurring: true,
        startTime: true,
        endTime: true,
        validFrom: true,
        validTo: true,
      },
    };
  }

  // When filtering by availability, we need to fetch all doctors first,
  // filter them, then paginate. This is because availability filtering
  // requires checking slot template durations which can't be done at DB level.
  let doctors: Prisma.DoctorGetPayload<{
    include: typeof includeOptions;
  }>[];
  let total: number;

  try {
    if (hasAvailability) {
      // Fetch all doctors that match the base criteria
      const allDoctors = await query<
        Prisma.DoctorGetPayload<{
          include: typeof includeOptions;
        }>[]
      >((prisma) =>
        prisma.doctor.findMany({
          where,
          include: includeOptions,
          orderBy,
        })
      );

      // Post-filter: Filter doctors based on actual slot template duration
      // This ensures doctors only appear if they have enough time for at least one slot
      const filteredDoctors = allDoctors.filter((doctor) => {
        // If doctor has available slots, include them
        if (
          doctor.slots &&
          Array.isArray(doctor.slots) &&
          doctor.slots.length > 0
        ) {
          return true;
        }

        // Otherwise, check if availabilities can generate valid slots
        // Get slot template duration (default to 30 if not set)
        const slotDurationMinutes = doctor.slotTemplate?.durationMinutes ?? 30;
        const minSlotDurationMs = slotDurationMinutes * 60 * 1000;
        const minSlotEndTime = new Date(now.getTime() + minSlotDurationMs);

        // Check if any availability can generate a valid slot
        if (
          !doctor.availabilities ||
          !Array.isArray(doctor.availabilities) ||
          doctor.availabilities.length === 0
        ) {
          return false;
        }

        for (const availability of doctor.availabilities) {
          if (!availability.isRecurring) {
            // One-time: check if endTime is far enough in the future
            if (new Date(availability.endTime) >= minSlotEndTime) {
              return true;
            }
          } else {
            // Recurring: check if validTo is far enough in the future
            // and the time window itself has enough duration
            const hasValidTimeRange =
              !availability.validTo ||
              new Date(availability.validTo) >= minSlotEndTime;

            if (hasValidTimeRange) {
              // Check if the time window itself has enough duration
              const availStart = new Date(availability.startTime);
              const availEnd = new Date(availability.endTime);
              const availDurationMs = availEnd.getTime() - availStart.getTime();
              if (availDurationMs >= minSlotDurationMs) {
                return true;
              }
            }
          }
        }

        return false;
      });

      // Calculate total from filtered results
      total = filteredDoctors.length;

      // Apply pagination to filtered results
      doctors = filteredDoctors.slice(skip, skip + limit);
    } else {
      // When not filtering by availability, use standard pagination
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
    }
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

  return {
    doctors: doctors.map((doctor) => {
      const base = {
        id: doctor.id,
        userId: doctor.userId,
        specialization: doctor.specialization ?? undefined,
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
        // Include user fields for display purposes
        userEmail: doctor.user?.email,
        userFirstName: doctor.user?.firstName ?? undefined,
        userLastName: doctor.user?.lastName ?? undefined,
        userPhoneNumber: doctor.user?.phoneNumber ?? undefined,
      };
      if (includeNoSchedule) {
        const scheduleInfo = computeScheduleInfo(doctor, now);
        return {
          ...base,
          hasSchedule: scheduleInfo.hasSchedule,
          nextAvailableSlotAt: scheduleInfo.nextAvailableSlotAt,
        };
      }
      return base;
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
 * Get search suggestions (departments/specializations + doctors) for typeahead
 * @param q Search query (min 2 chars)
 */
export async function getSearchSuggestions(
  q: string
): Promise<SearchSuggestionsResult> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) {
    return { departments: [], doctors: [] };
  }

  const where: Prisma.DoctorWhereInput = {
    OR: [
      {
        specialization: {
          contains: term,
          mode: "insensitive",
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
  };

  const doctors = await query<
    Prisma.DoctorGetPayload<{
      include: {
        user: { select: { firstName: true; lastName: true } };
      };
    }>[]
  >((prisma) =>
    prisma.doctor.findMany({
      where,
      take: 15,
      orderBy: { specialization: "asc" },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    })
  );

  const departmentMap = new Map<string, string>();
  for (const d of doctors) {
    const spec = d.specialization?.trim();
    if (spec && spec.toLowerCase().includes(term)) {
      const slug = toSlug(spec);
      if (slug && !departmentMap.has(slug)) {
        departmentMap.set(slug, spec);
      }
    }
  }
  const departments: SearchSuggestionDepartment[] = Array.from(
    departmentMap.entries()
  ).map(([slug, label]) => ({ label, slug }));

  const doctorsList: SearchSuggestionDoctor[] = doctors.map((d) => ({
    id: d.id,
    name: `Dr. ${d.user.firstName} ${d.user.lastName}`.trim(),
    department: d.specialization ?? "",
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

  // Create doctor profile
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
              role: true;
            };
          };
        };
      }>
    >((prisma) =>
      prisma.doctor.create({
        data: {
          userId,
          specialization: specialization?.trim() || null,
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
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );

    logger.info("Doctor profile created", { doctorId: doctor.id, userId });

    return {
      id: doctor.id,
      userId: doctor.userId,
      specialization: doctor.specialization ?? undefined,
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
    };
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

  // Update doctor
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
              role: true;
            };
          };
        };
      }>
    >((prisma) =>
      prisma.doctor.update({
        where: { id: doctorId },
        data: {
          ...(specialization !== undefined && {
            specialization: specialization.trim() || null,
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
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );

    logger.info("Doctor profile updated", { doctorId });

    return {
      id: doctor.id,
      userId: doctor.userId,
      specialization: doctor.specialization ?? undefined,
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
    };
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
    }[]
  >((prisma) =>
    prisma.doctor.findMany({
      select: {
        specialization: true,
      },
    })
  );

  const totalDoctors = doctors.length;
  const doctorsBySpecialization: Record<string, number> = {};

  doctors.forEach((doctor) => {
    const specialization = doctor.specialization || "Unspecified";
    doctorsBySpecialization[specialization] =
      (doctorsBySpecialization[specialization] || 0) + 1;
  });

  return {
    totalDoctors,
    doctorsBySpecialization,
  };
}
