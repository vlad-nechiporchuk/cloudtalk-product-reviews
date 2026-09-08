import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(2000),
  photoUrls: z.array(z.url()).max(3).default([]),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
