export function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}
