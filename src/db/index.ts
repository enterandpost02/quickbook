import path from "node:path";
import postgres from "postgres";
import { sql } from "drizzle-orm";
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
  schemaBootstrapPromise?: Promise<void>;
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

async function ensurePlatformSchemaBootstrap(db: AppDatabase): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "email_otps" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" text NOT NULL UNIQUE,
      "otp_hash" text NOT NULL,
      "full_name" text NOT NULL,
      "password_hash" text NOT NULL,
      "organization_name" text NOT NULL,
      "base_currency" text DEFAULT 'USD' NOT NULL,
      "invite_token" text,
      "attempts" integer DEFAULT 0 NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "team_invitations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "email" text NOT NULL,
      "full_name" text NOT NULL,
      "role" text DEFAULT 'staff' NOT NULL,
      "token" text NOT NULL UNIQUE,
      "invited_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "owner_email" text`);
  await db.execute(sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_suspended" boolean DEFAULT false NOT NULL`);
  await db.execute(sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan_status" text DEFAULT 'active' NOT NULL`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean DEFAULT false NOT NULL`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT true NOT NULL`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_suspended" boolean DEFAULT false NOT NULL`);
}

/**
 * Returns the initialized Drizzle PostgreSQL database instance, ensuring
 * migrations from `./drizzle` are applied when running on local PGlite and
 * new RBAC / OTP tables & columns exist on both PGlite and Supabase PostgreSQL.
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

  if (!globalForDb.schemaBootstrapPromise && globalForDb.dbInstance) {
    globalForDb.schemaBootstrapPromise = ensurePlatformSchemaBootstrap(
      globalForDb.dbInstance
    );
  }
  if (globalForDb.schemaBootstrapPromise) {
    await globalForDb.schemaBootstrapPromise;
  }

  return globalForDb.dbInstance;
}

export async function resetDbInstanceForTests(): Promise<void> {
  if (globalForDb.pgliteClient) {
    try {
      await globalForDb.pgliteClient.close();
    } catch {
      // Ignore close error in test cleanup
    }
  }
  globalForDb.dbInstance = undefined;
  globalForDb.migrationPromise = undefined;
  globalForDb.schemaBootstrapPromise = undefined;
  globalForDb.pgliteClient = undefined;
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
