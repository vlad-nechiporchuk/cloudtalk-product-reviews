// Redacts the password in a Postgres connection string before it's logged,
// e.g. for "seeding this database" / "migrations applied to" messages.
export function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}
