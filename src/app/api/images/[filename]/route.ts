import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Define supported image extensions and their MIME types
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

// Helper function to get the data directory path
function getDataDirectory(): string {
  return process.env.NODE_ENV === "production"
    ? "/data/images"
    : "./data/images";
}

// Helper function to check if a file is an image
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext in IMAGE_MIME_TYPES;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security check: ensure the filename doesn't contain path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    // Check if file is an image
    if (!isImageFile(filename)) {
      return new NextResponse("File is not a valid image", { status: 400 });
    }

    const dataDir = getDataDirectory();
    const filePath = path.join(dataDir, filename);

    // Additional security check: ensure the file is within the data directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDataDir = path.resolve(dataDir);
    if (!resolvedPath.startsWith(resolvedDataDir)) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Get the appropriate MIME type
    const ext = path.extname(filename).toLowerCase();
    const mimeType = IMAGE_MIME_TYPES[ext] || "application/octet-stream";

    // Return the image with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
