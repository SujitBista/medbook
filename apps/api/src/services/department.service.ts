/**
 * Department service functions
 * Handles department and search keyword (alias) management
 */

import { query, withTransaction, Prisma } from "@app/db";
import { createNotFoundError, createConflictError } from "../utils/errors";

/** Slug: lowercase, hyphenated */
function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface DepartmentWithAliases {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  aliases: { id: string; keyword: string }[];
}

export interface CreateDepartmentInput {
  name: string;
  keywords?: string[];
}

export interface UpdateDepartmentInput {
  name?: string;
  keywords?: string[];
}

/**
 * List all departments with their aliases
 */
export async function getAllDepartments(): Promise<DepartmentWithAliases[]> {
  const rows = await query<
    Prisma.DepartmentGetPayload<{
      include: { aliases: { select: { id: true; keyword: true } } };
    }>[]
  >((prisma) =>
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        aliases: { select: { id: true, keyword: true } },
      },
    })
  );
  return rows;
}

/**
 * Get department by ID with aliases
 */
export async function getDepartmentById(
  id: string
): Promise<DepartmentWithAliases | null> {
  const row = await query<Prisma.DepartmentGetPayload<{
    include: { aliases: { select: { id: true; keyword: true } } };
  }> | null>((prisma) =>
    prisma.department.findUnique({
      where: { id },
      include: {
        aliases: { select: { id: true, keyword: true } },
      },
    })
  );
  return row;
}

/**
 * Get department by slug
 */
export async function getDepartmentBySlug(
  slug: string
): Promise<DepartmentWithAliases | null> {
  const row = await query<Prisma.DepartmentGetPayload<{
    include: { aliases: { select: { id: true; keyword: true } } };
  }> | null>((prisma) =>
    prisma.department.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        aliases: { select: { id: true, keyword: true } },
      },
    })
  );
  return row;
}

/**
 * Create a department with optional search keywords (aliases)
 */
export async function createDepartment(
  input: CreateDepartmentInput
): Promise<DepartmentWithAliases> {
  const name = input.name?.trim();
  if (!name) {
    throw createConflictError("Department name is required");
  }
  const slug = toSlug(name);
  if (!slug) {
    throw createConflictError(
      "Department name must contain at least one letter or number"
    );
  }

  const keywords = normalizeKeywords(input.keywords);

  return withTransaction(async (prisma) => {
    const existing = await prisma.department.findUnique({
      where: { slug },
    });
    if (existing) {
      throw createConflictError(
        `Department with slug "${slug}" already exists`
      );
    }

    const department = await prisma.department.create({
      data: {
        name,
        slug,
        updatedAt: new Date(),
      },
    });

    if (keywords.length > 0) {
      await prisma.departmentAlias.createMany({
        data: keywords.map((keyword) => ({
          departmentId: department.id,
          keyword,
        })),
        skipDuplicates: true,
      });
    }

    const created = await prisma.department.findUnique({
      where: { id: department.id },
      include: {
        aliases: { select: { id: true, keyword: true } },
      },
    });
    if (!created) throw createNotFoundError("Department");
    return created;
  });
}

/**
 * Update a department (name and/or keywords). Replaces all aliases when keywords provided.
 */
export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput
): Promise<DepartmentWithAliases> {
  const existing = await query((prisma) =>
    prisma.department.findUnique({ where: { id }, include: { aliases: true } })
  );
  if (!existing) {
    throw createNotFoundError("Department");
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const slug = name ? toSlug(name) : existing.slug;
  const keywords =
    input.keywords !== undefined ? normalizeKeywords(input.keywords) : null;

  return withTransaction(async (prisma) => {
    if (name && slug !== existing.slug) {
      const conflict = await prisma.department.findUnique({
        where: { slug },
      });
      if (conflict) {
        throw createConflictError(
          `Department with slug "${slug}" already exists`
        );
      }
    }

    await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name, slug, updatedAt: new Date() } : {}),
      },
    });

    if (keywords !== null) {
      await prisma.departmentAlias.deleteMany({ where: { departmentId: id } });
      if (keywords.length > 0) {
        await prisma.departmentAlias.createMany({
          data: keywords.map((keyword) => ({ departmentId: id, keyword })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.department.findUnique({
      where: { id },
      include: {
        aliases: { select: { id: true, keyword: true } },
      },
    });
    if (!updated) throw createNotFoundError("Department");
    return updated;
  });
}

/**
 * Delete a department (cascades to aliases)
 */
export async function deleteDepartment(id: string): Promise<void> {
  const existing = await query((prisma) =>
    prisma.department.findUnique({ where: { id } })
  );
  if (!existing) {
    throw createNotFoundError("Department");
  }
  await query((prisma) => prisma.department.delete({ where: { id } }));
}

/**
 * Search departments by name or alias keyword (for suggestions). Returns departments with match type.
 */
export async function searchDepartmentsByQuery(term: string): Promise<
  {
    id: string;
    name: string;
    slug: string;
    matchReason?: string;
    matchedByName: boolean;
  }[]
> {
  if (!term || term.length < 2) return [];

  const departments = await query<
    Prisma.DepartmentGetPayload<{
      include: { aliases: { select: { keyword: true } } };
    }>[]
  >((prisma) =>
    prisma.department.findMany({
      where: {
        OR: [
          {
            name: {
              contains: term,
              mode: "insensitive",
            },
          },
          {
            aliases: {
              some: {
                keyword: {
                  contains: term,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      },
      include: {
        aliases: { select: { keyword: true } },
      },
      orderBy: { name: "asc" },
    })
  );

  const termLower = term.toLowerCase();
  const result: {
    id: string;
    name: string;
    slug: string;
    matchReason?: string;
    matchedByName: boolean;
  }[] = [];

  for (const d of departments) {
    const nameMatch = d.name.toLowerCase().includes(termLower);
    const matchingAliases = d.aliases.filter((a) =>
      a.keyword.toLowerCase().includes(termLower)
    );
    const matchReason =
      !nameMatch && matchingAliases.length > 0
        ? matchingAliases.map((a) => a.keyword).join(", ")
        : undefined;
    result.push({
      id: d.id,
      name: d.name,
      slug: d.slug,
      matchReason,
      matchedByName: nameMatch,
    });
  }

  result.sort((a, b) => {
    if (a.matchedByName && !b.matchedByName) return -1;
    if (!a.matchedByName && b.matchedByName) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

function normalizeKeywords(keywords?: string[]): string[] {
  if (!keywords || !Array.isArray(keywords)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of keywords) {
    const v = k.trim().toLowerCase();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Parse comma-separated keyword string into trimmed, unique array
 */
export function parseKeywordString(value: string): string[] {
  if (!value || typeof value !== "string") return [];
  return normalizeKeywords(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}
