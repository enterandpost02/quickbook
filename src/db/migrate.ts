import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { runMigrations } from "./index";
import { loadQboStoreFromDb } from "../lib/qbo-db";

async function main() {
  console.log("Running PostgreSQL migrations from ./drizzle...");
  await runMigrations();
  console.log("Migrations applied successfully.");

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
