import "dotenv/config";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";

const prismaCli = resolve("node_modules/prisma/build/index.js");

function getDatabaseProvider() {
  const provider = (process.env.DATABASE_PROVIDER || process.env.DB_PROVIDER || "postgresql").toLowerCase();
  if (provider === "pg" || provider === "postgres") return "postgresql";
  return provider;
}

function run(command, args) {
  const result = spawnSync(command, args, {stdio: "inherit", shell: false});
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ["commands/prepare-prisma.mjs"]);

if (getDatabaseProvider() === "sqlite") {
  run(process.execPath, [prismaCli, "db", "push"]);
} else {
  run(process.execPath, [prismaCli, "migrate", "deploy"]);
}
