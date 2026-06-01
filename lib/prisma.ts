// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
import {PrismaClient} from '@/app/generated/prisma/client'
import {PrismaBetterSqlite3} from '@prisma/adapter-better-sqlite3'
import {PrismaPg} from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseProvider() {
  const provider = (process.env.DATABASE_PROVIDER || process.env.DB_PROVIDER || 'postgresql').toLowerCase()
  if (provider === 'pg' || provider === 'postgres') return 'postgresql'
  return provider
}

function getSqliteUrl() {
  return process.env.DATABASE_URL || `file:${process.env.SQLITE_DATABASE_PATH || './data-local/note2.sqlite'}`
}

function createPrismaClient() {
  const provider = getDatabaseProvider()
  if (provider === 'sqlite') {
    const adapter = new PrismaBetterSqlite3({url: getSqliteUrl()})
    return new PrismaClient({adapter})
  }

  const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
  return new PrismaClient({adapter})
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
