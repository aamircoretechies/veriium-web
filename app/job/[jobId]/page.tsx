import { redirect } from "next/navigation";

/** Legacy route without signed URL — redirect to public entry. */
export default function JobPage() {
  redirect("/public?error=invalid_link");
}
