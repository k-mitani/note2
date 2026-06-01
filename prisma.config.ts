import "dotenv/config";
import { defineConfig } from "prisma/config";

function getDatabaseProvider() {
  const provider = (process.env.DATABASE_PROVIDER || process.env.DB_PROVIDER || "postgresql").toLowerCase();
  if (provider === "pg" || provider === "postgres") return "postgresql";
  return provider;
}

function getDatabaseUrl() {
  if (getDatabaseProvider() === "sqlite") {
    return process.env.DATABASE_URL || `file:${process.env.SQLITE_DATABASE_PATH || "./data-local/note2.sqlite"}`;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL.");
  }
  return process.env.DATABASE_URL;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getDatabaseUrl(),
  },
});
