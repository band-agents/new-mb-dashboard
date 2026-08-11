"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function registerAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!orgName || !name || !email || password.length < 8) {
    return { error: "Fill in every field — password needs at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const org = await prisma.organization.create({ data: { name: orgName } });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { organizationId: org.id, email, name, passwordHash, role: "OWNER" },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/clients" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Account created — please sign in." };
    throw err;
  }
  return { error: undefined };
}
