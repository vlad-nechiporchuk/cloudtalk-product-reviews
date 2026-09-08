import { z } from 'zod';
import { sortModeSchema } from '../cursor';

export const listReviewsQuerySchema = z.object({
  sort: sortModeSchema.default('newest'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  // .transform() after .optional(), not before: an absent param must stay
  // `undefined` ("no filter"), not collapse into the same `false` an
  // explicit ?verified=false would produce ("only unverified").
  verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().max(512).optional(),
});

export type ListReviewsQueryDto = z.infer<typeof listReviewsQuerySchema>;
