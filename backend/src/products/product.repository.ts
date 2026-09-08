import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { products } from '../db/schema';
import type { ProductRow } from '../db/schema';

// A UUID-shaped slug would resolve as an id, not a slug — the two id
// spaces aren't namespaced apart.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProductRepository {
  async findBySlugOrId(idOrSlug: string): Promise<ProductRow | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(UUID_RE.test(idOrSlug) ? eq(products.id, idOrSlug) : eq(products.slug, idOrSlug));

    return row ?? null;
  }
}
