import "dotenv/config";
import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

const providerAliases = new Map([
  ["pg", "postgresql"],
  ["postgres", "postgresql"],
  ["postgresql", "postgresql"],
  ["sqlite", "sqlite"],
]);

const rawProvider = (process.env.DATABASE_PROVIDER || process.env.DB_PROVIDER || "postgresql").toLowerCase();
const provider = providerAliases.get(rawProvider);

if (!provider) {
  throw new Error(`Unsupported DATABASE_PROVIDER "${rawProvider}". Use "postgresql" or "sqlite".`);
}

const root = resolve(import.meta.dirname, "..");
const templatePath = resolve(root, "prisma/schema.template.prisma");
const schemaPath = resolve(root, "prisma/schema.prisma");
const schema = readFileSync(templatePath, "utf8").replaceAll("__DATABASE_PROVIDER__", provider);

writeFileSync(schemaPath, schema);
console.log(`Prepared Prisma schema for ${provider}.`);
