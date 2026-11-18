import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "./session";

/** Solo le email in ADMIN_EMAILS (separate da virgola). Tutti gli altri vedono un 404. */
export async function requireAdmin() {
  const { user } = await getSession();
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) notFound();
  return user;
}
