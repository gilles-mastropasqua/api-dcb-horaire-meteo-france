import { PrismaClient } from '@prisma/client';

//const prisma = new PrismaClient({ log: ['info', 'query', 'warn', 'error'] });
const prisma = new PrismaClient();

export default prisma;
