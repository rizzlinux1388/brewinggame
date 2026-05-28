import 'dotenv/config' // Ensures your .env file variables load properly
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// 1. Create a native PostgreSQL connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
})

// 2. Wrap it inside the Prisma 7 PostgreSQL driver adapter
const adapter = new PrismaPg(pool)

// 3. Instantiate the Prisma Client with your adapter
export const prisma = new PrismaClient({ adapter })

