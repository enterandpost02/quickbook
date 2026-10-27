import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { runMigrations } from "./index";
import { loadQboStoreFromDb } from "../lib/qbo-db";
import { ensureAdminUserInDb } from "../lib/auth";

async function main() {
  console.log("Running PostgreSQL migrations from ./drizzle...");
  await runMigrations();
  console.log("Migrations applied successfully.");

  console.log("Ensuring admin user (enterandpost02@gmail.com) in PostgreSQL...");
  const adminResult = await ensureAdminUserInDb();
  console.log(`Admin user verified: ${adminResult.user.email} (${adminResult.user.fullName})`);

  console.log("Seeding / verifying QuickBooks sample company in PostgreSQL...");
  const { organizationId, storageMode, state } = await loadQboStoreFromDb();
  console.log(
    `Connected (${storageMode}) — Organization ID: ${organizationId} (${state.companyName}) with ${state.accounts.length} accounts and ${state.journalEntries.length} journal entries.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
