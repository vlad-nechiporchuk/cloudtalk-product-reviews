import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1).max(2000),
  photoUrls: z
    .array(z.url({ protocol: /^https?$/ }))
    .max(3)
    .default([]),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
