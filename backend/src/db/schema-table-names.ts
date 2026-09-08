import { getTableName, isTable } from 'drizzle-orm';
import * as schema from './schema';

// Every physical table this schema defines, by its Postgres name — so a
// script that needs "every table" (a TRUNCATE list, e.g.) reads it from
// schema.ts instead of hand-maintaining a second list that can drift from it.
export const ALL_TABLE_NAMES: string[] = Object.values(schema)
  .filter(isTable)
  .map((table) => getTableName(table));
