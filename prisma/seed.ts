import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create SUPER_ADMIN account
  const superAdminPassword = await hash("Admin@123456", 12);
  const superAdmin = await prisma.admin.upsert({
    where: { email: "super@promosport.tn" },
    update: {},
    create: {
      email: "super@promosport.tn",
      password: superAdminPassword,
      name: "Super Administrator",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // Create REVIEWER account
  const reviewerPassword = await hash("Reviewer@12345", 12);
  const reviewer = await prisma.admin.upsert({
    where: { email: "reviewer@promosport.tn" },
    update: {},
    create: {
      email: "reviewer@promosport.tn",
      password: reviewerPassword,
      name: "Reviewer",
      role: "REVIEWER",
      isActive: true,
    },
  });

  console.log("✓ Seed completed successfully");
  console.log("\n=== ADMIN ACCOUNTS CREATED ===");
  console.log("\nSUPER ADMIN:");
  console.log(`Email: super@promosport.tn`);
  console.log(`Password: Admin@123456`);
  console.log(`Role: SUPER_ADMIN`);
  console.log("\nREVIEWER:");
  console.log(`Email: reviewer@promosport.tn`);
  console.log(`Password: Reviewer@12345`);
  console.log(`Role: REVIEWER`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
