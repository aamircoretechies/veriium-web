"use client";
import { useRouter } from "next/navigation";
import ContactUs from "../../../src_mirror/imports/Contact/ContactUs";

export default function ContactPage() {
  const router = useRouter();
  return <ContactUs onBack={() => router.back()} />;
}
