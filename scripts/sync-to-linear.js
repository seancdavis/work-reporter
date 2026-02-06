// Calls the sync-to-linear endpoint on the local dev server.
// Requires `npm run dev` to be running in another terminal.
//
// Usage (via npm scripts):
//   npm run sync:dry-run   — preview what would be synced
//   npm run sync:run       — actually sync to Linear

const dryRun = process.argv.includes("--dry-run");
const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

if (!adminEmail) {
  console.error("ERROR: ADMIN_EMAILS env var not set. Run via: npm run sync:dry-run");
  process.exit(1);
}

const url = `http://localhost:8888/api/research/sync-to-linear${dryRun ? "?dry_run=true" : ""}`;

console.log(dryRun ? "\n=== DRY RUN — no changes will be made ===\n" : "\n=== SYNCING TO LINEAR ===\n");

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "sync-script",
      "x-user-email": adminEmail,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Request failed (${response.status}):`, err);
    process.exit(1);
  }

  const result = await response.json();

  console.log(`Synced:   ${result.synced}`);
  console.log(`Skipped:  ${result.skipped}`);
  console.log(`Errors:   ${result.errors}`);
  console.log("\nDetails:");
  for (const line of result.details) {
    console.log(`  ${line}`);
  }
  console.log();
} catch (err) {
  if (err.cause?.code === "ECONNREFUSED") {
    console.error("ERROR: Could not connect to localhost:8888. Is `npm run dev` running?");
  } else {
    console.error("ERROR:", err.message);
  }
  process.exit(1);
}
