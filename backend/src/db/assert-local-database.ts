const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

export function assertLocalDatabase(rawUrl: string): void {
  const { hostname } = new URL(rawUrl);
  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `Refusing to run against "${hostname}" — this script only runs against a local database ` +
        `(${LOCAL_HOSTS.join(' or ')}). If DATABASE_URL is set in your shell (not just .env), unset ` +
        `it — dotenv does not override an already-set variable.`,
    );
  }
}
