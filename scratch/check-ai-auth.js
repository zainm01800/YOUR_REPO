// scratch/check-ai-auth.js
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst(); 
  console.log("ENVIRONMENT:");
  console.log("AI_OWNER_EMAIL:", process.env.AI_OWNER_EMAIL);
  console.log("GROQ_API_KEY EXISTS:", !!process.env.GROQ_API_KEY);
  if (user) {
    console.log("FIRST USER IN DB:", user.email);
  } else {
    console.log("NO USERS FOUND IN DB");
  }
}

main().catch(console.error);
