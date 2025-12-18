import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// This route writes to the local filesystem, so it must run on the Node.js runtime.
// Explicitly setting the runtime avoids failures when the default is Edge/serverless.
export const runtime = "nodejs";

/**
 * POST /api/users/profile/upload
 * Upload an image file for the current user's profile picture
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "No file provided" },
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
          },
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "File size exceeds 5MB limit.",
          },
        },
        { status: 400 }
      );
    }

    // Generate unique filename scoped to the user
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `user-${session.user.id}-${timestamp}-${randomString}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "users");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/users/${fileName}`;

    console.log("[UserProfileUpload] File uploaded successfully:", {
      userId: session.user.id,
      fileUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("[UserProfileUpload] Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to upload file",
        },
      },
      { status: 500 }
    );
  }
}
