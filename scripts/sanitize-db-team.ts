import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { getDb } from "../src/db";
import { organizationLedgerState } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Checking and sanitizing team members in PostgreSQL database...");
  const db = await getDb();
  const snapshots = await db.select().from(organizationLedgerState);

  for (const snap of snapshots) {
    if (snap.stateJson && snap.stateJson.teamMembers) {
      let changed = false;
      for (const m of snap.stateJson.teamMembers) {
        if (m.name === "Craig Carlson" || m.email.includes("craig")) {
          m.name = "Enter & Post Admin";
          m.email = "enterandpost02@gmail.com";
          changed = true;
        }
      }
      if (changed) {
        console.log(`Sanitized snapshot for organization: ${snap.organizationId}`);
        await db
          .update(organizationLedgerState)
          .set({ stateJson: snap.stateJson })
          .where(eq(organizationLedgerState.organizationId, snap.organizationId));
      }
    }
  }

  console.log("Database sanitization complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sanitization error:", err);
  process.exit(1);
});
