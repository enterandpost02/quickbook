import "dotenv/config";
import { runMigrations } from "./index";

async function main() {
  console.log("Running PostgreSQL migrations from ./drizzle...");
  await runMigrations();
  console.log("Migrations applied successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
