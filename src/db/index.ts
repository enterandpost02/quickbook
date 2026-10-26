import path from "node:path";
import postgres from "postgres";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type AppDatabase =
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

type GlobalDbCache = {
  dbInstance?: AppDatabase;
  migrationPromise?: Promise<void>;
  pgliteClient?: PGlite;
};

const globalForDb = globalThis as unknown as GlobalDbCache;

function createDatabase(): { db: AppDatabase; isLocalPglite: boolean } {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) {
    // prepare: false ensures compatibility with Supabase Supavisor transaction pooler (port 6543)
    const client = postgres(connectionString, { prepare: false });
    const db = drizzlePostgres(client, { schema });
    return { db, isLocalPglite: false };
  }

  const dataDir =
    process.env.PGLITE_DATA_DIR || path.join(process.cwd(), ".local-db");
  const pglite = globalForDb.pgliteClient ?? new PGlite(dataDir);
  globalForDb.pgliteClient = pglite;
  const db = drizzlePglite(pglite, { schema });
  return { db, isLocalPglite: true };
}

/**
 * Returns the initialized Drizzle PostgreSQL database instance, ensuring
 * migrations from `./drizzle` are applied when running on local PGlite.
 */
export async function getDb(): Promise<AppDatabase> {
  if (!globalForDb.dbInstance) {
    const { db, isLocalPglite } = createDatabase();
    globalForDb.dbInstance = db;

    if (isLocalPglite && !globalForDb.migrationPromise) {
      const migrationsFolder = path.join(process.cwd(), "drizzle");
      globalForDb.migrationPromise = migratePglite(
        db as PgliteDatabase<typeof schema>,
        { migrationsFolder }
      );
    }
  }

  if (globalForDb.migrationPromise) {
    await globalForDb.migrationPromise;
  }

  return globalForDb.dbInstance;
}

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) {
    const migrationClient = postgres(connectionString, { max: 1, prepare: false });
    const db = drizzlePostgres(migrationClient, { schema });
    await migratePostgres(db, { migrationsFolder });
    await migrationClient.end();
    return;
  }

  const db = await getDb();
  await migratePglite(db as PgliteDatabase<typeof schema>, { migrationsFolder });
}
