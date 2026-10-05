// script to seed the database with initial data

import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const userData: Prisma.UserCreateInput[] = [
  {
    email: "admin@gmail.com",
    firstName: "Admin",
    lastname: "User1",
    password: "admin123",
    role: "ADMIN",
    status: "ACTIVE",
    privileges: '["CREATE_USER", "DELETE_USER", "UPDATE_USER"]',
  },
  {
    email: "user1@gmail.com",
    firstName: "John1",
    lastname: "Doe",
    password: "user1234",
    role: "USER",
    status: "ACTIVE",
    privileges: '["READ_POST", "CREATE_COMMENT"]',
  },
];

async function main() {
  for (const user of userData) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastname: user.lastname,
        password: hashedPassword,
        role: user.role,
        status: user.status,
        privileges: user.privileges,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastname: user.lastname,
        password: hashedPassword,
        role: user.role,
        status: user.status,
        privileges: user.privileges,
      },
    });
  }

  console.log("Users seeded successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });