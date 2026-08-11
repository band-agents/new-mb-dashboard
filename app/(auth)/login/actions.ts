"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/clients" });
    return { error: undefined };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // next-auth throws a redirect internally on success — rethrow anything that isn't our own error
    throw err;
  }
}
