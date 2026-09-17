import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CASHIER" && user.role !== "ADMIN") {
    redirect("/");
  }

  return children;
}