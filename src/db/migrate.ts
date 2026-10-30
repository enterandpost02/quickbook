import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { runMigrations } from "./index";
import { ensureAdminUserInDb } from "../lib/auth";

async function main() {
  console.log("Running PostgreSQL migrations from ./drizzle...");
  await runMigrations();
  console.log("Migrations applied successfully.");

  console.log("Ensuring Platform Super Admin (enterandpost02@gmail.com) in PostgreSQL...");
  const adminResult = await ensureAdminUserInDb();
  console.log(`Super Admin verified: ${adminResult.user.email} (${adminResult.user.fullName})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
