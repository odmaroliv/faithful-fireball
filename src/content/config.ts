// src/content/config.ts
import { defineCollection, z } from "astro:content";

export const collections = {
  blog: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      updatedDate: z.date().optional(),
      heroImage: z.string().optional(),
      tags: z.array(z.string()).default(["baja"]),
      author: z.string().default("Baja Pacific Team"),
      featured: z.boolean().default(false),
      destination: z.string(),
    }),
  }),
};
