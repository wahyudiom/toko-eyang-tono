import { redirect } from "next/navigation";
import { getSession, getHomeForRole } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (session) {
    redirect(getHomeForRole(session.role));
  }
  redirect("/login");
}
