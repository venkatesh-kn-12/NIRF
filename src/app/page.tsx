import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export default async function HomePage() {
  const auth = await getCurrentUser();
  if (auth?.user) {
    redirect("/dashboard");
  }

  // Check if admin setup is needed
  let adminCount = 0;
  try {
    await connectDB();
    adminCount = await User.countDocuments({ role: "DEPARTMENT_ADMIN" });
  } catch (error) {
    console.error("Home page database connection error:", error);
  }

  if (adminCount === 0) {
    redirect("/setup-admin");
  }

  redirect("/login");
}
