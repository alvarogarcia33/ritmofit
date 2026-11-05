import "dotenv/config";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  closeFitPool,
  findFitUserByUsername,
  initializeFitDatabase,
  insertFitUser,
} from "./fit-db";
import { hashFitPassword } from "./fit";

const ADMIN_USERNAME = "administrador";
const ACCESS_FILE = "/home/ubuntu/ritmofit-admin-access.txt";

async function writeAccessFile(password: string, email: string): Promise<void> {
  await mkdir(path.dirname(ACCESS_FILE), { recursive: true, mode: 0o700 });
  const handle = await open(ACCESS_FILE, "wx", 0o600);
  try {
    await handle.writeFile(
      [
        "Ritmo Fit — acceso administrativo",
        `username=${ADMIN_USERNAME}`,
        `email=${email}`,
        `password=${password}`,
        "",
      ].join("\n"),
      "utf8"
    );
  } finally {
    await handle.close();
  }
  await chmod(ACCESS_FILE, 0o600);
}

async function main(): Promise<void> {
  const email = (process.env.RITMO_FIT_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error(
      "RITMO_FIT_ADMIN_EMAIL is required; no fictitious admin account will be created"
    );
  }

  await initializeFitDatabase();
  const existing = await findFitUserByUsername(ADMIN_USERNAME);
  if (existing) {
    if (existing.role !== "admin") {
      throw new Error(
        "The reserved username administrador already belongs to a non-admin user; no changes made"
      );
    }
    console.log(
      `Admin user already exists; password unchanged. Credentials file: ${ACCESS_FILE}`
    );
    return;
  }

  const password = randomBytes(36).toString("base64url");
  const passwordHash = await hashFitPassword(password);
  await insertFitUser({
    username: ADMIN_USERNAME,
    email,
    fullName: "Administrador Ritmo Fit",
    passwordHash,
    role: "admin",
    level: "beginner",
    startDate: new Date().toISOString().slice(0, 10),
    timezone: process.env.RITMO_FIT_ADMIN_TIMEZONE?.trim() || "UTC",
  });
  await writeAccessFile(password, email);
  console.log(`Admin user created. Credentials saved only at ${ACCESS_FILE}.`);
}

main()
  .catch(error => {
    console.error(
      "create-admin failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFitPool();
  });
