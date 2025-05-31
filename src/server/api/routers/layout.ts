import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { nanoid } from "nanoid";

export const layoutRouter = createTRPCRouter({
  // Get all saved layouts
  getAll: publicProcedure.query(async () => {
    return await db.layout.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // Save current layout as a template
  save: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Layout name is required"),
        tv1Url: z.string().nullable(),
        tv2Url: z.string().nullable(),
        tv3Url: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.layout.create({
        data: {
          id: nanoid(),
          name: input.name,
          tv1Url: input.tv1Url,
          tv2Url: input.tv2Url,
          tv3Url: input.tv3Url,
        },
      });
    }),

  // Restore a saved layout
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const layout = await db.layout.findUnique({
        where: { id: input.id },
      });

      if (!layout) {
        throw new Error("Layout not found");
      }

      // Update all TVs with the layout configuration
      await db.$transaction([
        db.tv.update({
          where: { id: "1" },
          data: { imageUrl: layout.tv1Url },
        }),
        db.tv.update({
          where: { id: "2" },
          data: { imageUrl: layout.tv2Url },
        }),
        db.tv.update({
          where: { id: "3" },
          data: { imageUrl: layout.tv3Url },
        }),
      ]);

      return await db.tv.findMany({
        orderBy: { position: "asc" },
      });
    }),

  // Delete a saved layout
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.layout.delete({
        where: { id: input.id },
      });
    }),

  // Update layout name
  updateName: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Layout name is required"),
      })
    )
    .mutation(async ({ input }) => {
      return await db.layout.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
});
