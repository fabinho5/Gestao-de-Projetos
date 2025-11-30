// src/test-connection.ts
import { prisma } from './lib/prisma.js'; 

async function main() {
  console.log('Testing database connection...');

  try {
    // try to count how many users exist (even if it is 0)
    const count = await prisma.user.count();
    console.log(`sucessfully connected to the database.`);
    console.log(`Total users in the database: ${count}`);
  } catch (error) {
    console.error('ERROR: Could not connect.');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();