import { redirect } from "next/navigation";

export default function LegacyConfirmationPage() {
  redirect("/public?error=invalid_link");
}
