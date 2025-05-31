import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// In-memory storage for TV numbers display setting
let showTVNumbers = false;

// In-memory storage for trigger reload functionality
let triggerReload = false;
let triggerReloadTimeout: NodeJS.Timeout | null = null;

// Helper function to get base URL (in production, this would be more sophisticated)
function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Initialize TV entries if they don't exist
async function initializeTVs() {
  const existingTVs = await db.tv.count();

  if (existingTVs === 0) {
    // Create the initial 3 TV entries
    await db.tv.createMany({
      data: [
        {
          id: "1",
          position: 1,
          imageUrl: "/image1.png",
        },
        {
          id: "2",
          position: 2,
          imageUrl: "/image2.png",
        },
        {
          id: "3",
          position: 3,
          imageUrl: "/image3.png",
        },
      ],
    });
  }
}

export const screenRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    await initializeTVs();
    return await db.tv.findMany({
      orderBy: { position: "asc" },
    });
  }),

  updateOrder: publicProcedure
    .input(
      z.array(
        z.object({
          id: z.string(),
          position: z.number(),
        })
      )
    )
    .mutation(async ({ input }) => {
      // Update positions using transactions for consistency
      await db.$transaction(
        input.map((update) =>
          db.tv.update({
            where: { id: update.id },
            data: { position: update.position },
          })
        )
      );

      return await db.tv.findMany({
        orderBy: { position: "asc" },
      });
    }),

  updateImage: publicProcedure
    .input(
      z.object({
        id: z.string(),
        imageUrl: z
          .string()
          .refine(
            (val) => {
              // Allow null/empty values
              if (!val) return true;
              // Allow full URLs
              try {
                new URL(val);
                return true;
              } catch {
                // Allow relative paths starting with '/'
                return val.startsWith("/");
              }
            },
            {
              message:
                "Image URL must be a valid URL or a relative path starting with '/'",
            }
          )
          .nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.tv.update({
        where: { id: input.id },
        data: { imageUrl: input.imageUrl },
      });
    }),

  resetImage: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.tv.update({
        where: { id: input.id },
        data: { imageUrl: `/image${input.id}.png` },
      });
    }),

  resetAllImages: publicProcedure.mutation(async () => {
    // Update all TVs to their default images
    await db.tv.updateMany({
      data: {}, // Empty data object to trigger updatedAt
    });

    // Update each TV with its specific default image
    await db.$transaction([
      db.tv.update({
        where: { id: "1" },
        data: { imageUrl: "/image1.png" },
      }),
      db.tv.update({
        where: { id: "2" },
        data: { imageUrl: "/image2.png" },
      }),
      db.tv.update({
        where: { id: "3" },
        data: { imageUrl: "/image3.png" },
      }),
    ]);

    return await db.tv.findMany({
      orderBy: { position: "asc" },
    });
  }),

  getUpdates: publicProcedure
    .input(z.date().optional())
    .query(async ({ input }) => {
      const lastCheck = input || new Date(0);
      return await db.tv.findMany({
        where: {
          updatedAt: {
            gt: lastCheck,
          },
        },
        orderBy: { position: "asc" },
      });
    }),

  // TV Numbers Control
  setShowTVNumbers: publicProcedure
    .input(z.object({ show: z.boolean() }))
    .mutation(({ input }) => {
      showTVNumbers = input.show;
      return { showTVNumbers };
    }),

  getShowTVNumbers: publicProcedure.query(() => {
    return { showTVNumbers };
  }),

  // Trigger Reload Control
  setTriggerReload: publicProcedure
    .input(z.object({ trigger: z.boolean() }))
    .mutation(({ input }) => {
      triggerReload = input.trigger;

      // If setting to true, set timeout to revert back to false after 5 seconds
      if (input.trigger) {
        // Clear any existing timeout
        if (triggerReloadTimeout) {
          clearTimeout(triggerReloadTimeout);
        }

        triggerReloadTimeout = setTimeout(() => {
          triggerReload = false;
          triggerReloadTimeout = null;
        }, 5000); // 5 seconds
      } else {
        // If manually setting to false, clear any existing timeout
        if (triggerReloadTimeout) {
          clearTimeout(triggerReloadTimeout);
          triggerReloadTimeout = null;
        }
      }

      return { triggerReload };
    }),

  getTriggerReload: publicProcedure.query(() => {
    return { triggerReload };
  }),
});
