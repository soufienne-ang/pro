import { PrismaClient } from "@prisma/client";
import pkg from "bcryptjs";
const { hash } = pkg;

const prisma = new PrismaClient();

async function main() {
  const accounts: Array<{ email: string; password: string; name: string; role: "SUPER_ADMIN" | "REVIEWER" | "HR_AGENT" | "JURY_MEMBER" }> = [
    { email: "super@promosport.tn", password: "Admin@123456", name: "Super Administrator", role: "SUPER_ADMIN" },
    { email: "hr@promosport.tn", password: "Hr@12345678", name: "Agent RH", role: "HR_AGENT" },
    { email: "jury@promosport.tn", password: "Jury@123456", name: "Membre du Jury", role: "JURY_MEMBER" },
    { email: "reviewer@promosport.tn", password: "Reviewer@12345", name: "Reviewer (legacy)", role: "REVIEWER" },
  ];

  for (const acc of accounts) {
    const hashed = await hash(acc.password, 12);
    await prisma.admin.upsert({
      where: { email: acc.email },
      update: { role: acc.role, name: acc.name, isActive: true },
      create: {
        email: acc.email,
        password: hashed,
        name: acc.name,
        role: acc.role,
        isActive: true,
      },
    });
  }

  console.log("✓ Seed completed successfully");
  console.log("\n=== STAFF ACCOUNTS ===\n");
  for (const acc of accounts) {
    console.log(`${acc.role}`);
    console.log(`  Email:    ${acc.email}`);
    console.log(`  Password: ${acc.password}`);
    console.log();
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
