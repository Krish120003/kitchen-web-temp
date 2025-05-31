import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Define supported image extensions
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];

// Helper function to check if a file is an image
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

// Helper function to get the data directory path
function getDataDirectory(): string {
  // In Docker/production, images are stored in /data/images
  // For local development, you might want to use a different path
  return process.env.NODE_ENV === "production"
    ? "/data/images"
    : "./data/images";
}

// Helper function to generate a UUID-based filename
function generateUUIDFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
}

export const imagesRouter = createTRPCRouter({
  // Get all images from the data directory
  getAll: publicProcedure.query(async () => {
    try {
      const dataDir = getDataDirectory();

      // Check if directory exists, create it if it doesn't
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
        return [];
      }

      const files = await fs.readdir(dataDir);

      // Filter only image files and get their stats
      const imageFiles = [];
      for (const file of files) {
        if (isImageFile(file)) {
          const filePath = path.join(dataDir, file);
          const stats = await fs.stat(filePath);

          imageFiles.push({
            name: file,
            size: stats.size,
            lastModified: stats.mtime,
            // Always use /api/images/ for serving images
            url: `/api/images/${encodeURIComponent(file)}`,
          });
        }
      }

      // Sort by last modified date (newest first)
      return imageFiles.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      console.error("Error reading images directory:", error);
      throw new Error("Failed to read images directory");
    }
  }),

  // Get a specific image by name
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      try {
        const dataDir = getDataDirectory();
        const filePath = path.join(dataDir, input.name);

        // Security check: ensure the file is within the data directory
        const resolvedPath = path.resolve(filePath);
        const resolvedDataDir = path.resolve(dataDir);
        if (!resolvedPath.startsWith(resolvedDataDir)) {
          throw new Error("Invalid file path");
        }

        // Check if file exists and is an image
        if (!isImageFile(input.name)) {
          throw new Error("File is not a valid image");
        }

        const stats = await fs.stat(filePath);

        return {
          name: input.name,
          size: stats.size,
          lastModified: stats.mtime,
          url: `/api/images/${encodeURIComponent(input.name)}`,
        };
      } catch (error) {
        console.error("Error reading image file:", error);
        throw new Error("Image not found");
      }
    }),

  // Upload a new image (receives base64 data)
  upload: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        data: z.string(), // base64 encoded image data
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const dataDir = getDataDirectory();

        // Ensure directory exists
        await fs.mkdir(dataDir, { recursive: true });

        // Validate MIME type
        const validMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
          "image/bmp",
        ];

        if (!validMimeTypes.includes(input.mimeType)) {
          throw new Error("Invalid image type");
        }

        // Generate a UUID-based filename
        const uuidFilename = generateUUIDFilename(input.filename);
        const filePath = path.join(dataDir, uuidFilename);

        // Remove the data URL prefix if present (e.g., "data:image/png;base64,")
        const base64Data = input.data.replace(/^data:image\/\w+;base64,/, "");

        // Convert base64 to buffer and save
        const imageBuffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(filePath, imageBuffer);

        const stats = await fs.stat(filePath);

        return {
          name: uuidFilename,
          originalName: input.filename,
          size: stats.size,
          lastModified: stats.mtime,
          url: `/api/images/${encodeURIComponent(uuidFilename)}`,
        };
      } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image");
      }
    }),

  // Delete an image
  delete: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const dataDir = getDataDirectory();
        const filePath = path.join(dataDir, input.name);

        // Security check: ensure the file is within the data directory
        const resolvedPath = path.resolve(filePath);
        const resolvedDataDir = path.resolve(dataDir);
        if (!resolvedPath.startsWith(resolvedDataDir)) {
          throw new Error("Invalid file path");
        }

        // Check if file exists and is an image
        if (!isImageFile(input.name)) {
          throw new Error("File is not a valid image");
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          throw new Error("Image not found");
        }

        // Delete the file
        await fs.unlink(filePath);

        return { success: true, message: "Image deleted successfully" };
      } catch (error) {
        console.error("Error deleting image:", error);
        throw new Error("Failed to delete image");
      }
    }),

  // Get images with pagination
  getPaginated: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const dataDir = getDataDirectory();

        // Check if directory exists
        try {
          await fs.access(dataDir);
        } catch {
          await fs.mkdir(dataDir, { recursive: true });
          return {
            images: [],
            total: 0,
            page: input.page,
            limit: input.limit,
            totalPages: 0,
          };
        }

        const files = await fs.readdir(dataDir);

        // Filter and collect image files with stats
        const imageFiles = [];
        for (const file of files) {
          if (isImageFile(file)) {
            const filePath = path.join(dataDir, file);
            const stats = await fs.stat(filePath);

            imageFiles.push({
              name: file,
              size: stats.size,
              lastModified: stats.mtime,
              url: `/api/images/${encodeURIComponent(file)}`,
            });
          }
        }

        // Sort by last modified date (newest first)
        const sortedImages = imageFiles.sort(
          (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
        );

        const total = sortedImages.length;
        const totalPages = Math.ceil(total / input.limit);
        const startIndex = (input.page - 1) * input.limit;
        const endIndex = startIndex + input.limit;
        const paginatedImages = sortedImages.slice(startIndex, endIndex);

        return {
          images: paginatedImages,
          total,
          page: input.page,
          limit: input.limit,
          totalPages,
        };
      } catch (error) {
        console.error("Error reading images directory:", error);
        throw new Error("Failed to read images directory");
      }
    }),
});
