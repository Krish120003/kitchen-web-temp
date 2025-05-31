import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// In-memory storage for screen configurations
// In a real app, this would be stored in a database
interface ScreenConfig {
  id: string;
  position: number;
  imageUrl: string | null;
  updatedAt: Date;
}

// Helper function to get base URL (in production, this would be more sophisticated)
function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

let screens: ScreenConfig[] = [
  {
    id: "1",
    position: 1,
    imageUrl: "/image1.png",
    updatedAt: new Date(),
  },
  {
    id: "2",
    position: 2,
    imageUrl: "/image2.png",
    updatedAt: new Date(),
  },
  {
    id: "3",
    position: 3,
    imageUrl: "/image3.png",
    updatedAt: new Date(),
  },
];

export const screenRouter = createTRPCRouter({
  getAll: publicProcedure.query(() => {
    return screens.sort((a, b) => a.position - b.position);
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
    .mutation(({ input }) => {
      for (const update of input) {
        const screen = screens.find((s) => s.id === update.id);
        if (screen) {
          screen.position = update.position;
          screen.updatedAt = new Date();
        }
      }
      return screens.sort((a, b) => a.position - b.position);
    }),

  updateImage: publicProcedure
    .input(
      z.object({
        id: z.string(),
        imageUrl: z.string().url().nullable(),
      })
    )
    .mutation(({ input }) => {
      const screen = screens.find((s) => s.id === input.id);
      if (screen) {
        screen.imageUrl = input.imageUrl;
        screen.updatedAt = new Date();
      }
      return screen;
    }),

  resetImage: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const screen = screens.find((s) => s.id === input.id);
      if (screen) {
        screen.imageUrl = `/image${screen.id}.png`;
        screen.updatedAt = new Date();
      }
      return screen;
    }),

  resetAllImages: publicProcedure.mutation(() => {
    screens.forEach((screen) => {
      screen.imageUrl = `/image${screen.id}.png`;
      screen.updatedAt = new Date();
    });
    return screens.sort((a, b) => a.position - b.position);
  }),

  getUpdates: publicProcedure.input(z.date().optional()).query(({ input }) => {
    const lastCheck = input || new Date(0);
    return screens.filter((screen) => screen.updatedAt > lastCheck);
  }),
});
