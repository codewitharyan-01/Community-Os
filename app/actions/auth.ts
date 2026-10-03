"use server";

import { redirect } from "next/navigation";
import { login, destroySession, rateLimit, AuthError } from "@/lib/auth";
import { loginSchema, zodErrors, type FieldErrors } from "@/lib/validators";

export type LoginState = { error?: string; fieldErrors?: FieldErrors };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  let target = "/resident";
  try {
    rateLimit(`login:${parsed.data.email}`, 10, 60_000);
    const res = await login(parsed.data.email, parsed.data.password);
    if (!res.ok) return { error: res.error };
    target = res.redirect;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Something went wrong. Please try again." };
  }

  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
