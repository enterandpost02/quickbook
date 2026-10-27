import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { ensureAdminUserInDb, DEFAULT_ADMIN } from "../src/lib/auth";

async function main() {
  console.log("Seeding primary admin user into PostgreSQL...");
  const result = await ensureAdminUserInDb();
  console.log("Success! Admin user verified:");
  console.log(`- Email: ${result.user.email}`);
  console.log(`- Full Name: ${result.user.fullName}`);
  console.log(`- Organization: ${result.org.name} (${result.org.id})`);
  console.log(`- Password configured: ${DEFAULT_ADMIN.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed admin user:", err);
  process.exit(1);
});
