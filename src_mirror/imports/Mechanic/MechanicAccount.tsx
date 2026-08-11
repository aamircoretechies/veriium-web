"use client";

import { useEffect, useRef, useState } from "react";
import MechanicTopNav from "./MechanicTopNav";
import Footer from "../../../app/components/Footer";
import { useMechanicAuth } from "./MechanicAuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import type {
  MechanicDashboardProfile,
  MechanicDashboardServiceSetup,
} from "@/types/api/mechanic-dashboard";
import type { MechanicsLanguages } from "@/types/airtable/generated/enums";
import { MECHANICS_LANGUAGES } from "@/types/airtable/generated/enums";

const TOKEN_KEY = "veriium_mechanic_token";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatCertifiedStatus(
  status: MechanicDashboardProfile["certifiedStatus"],
): string {
  switch (status) {
    case "certified":
      return "Yes";
    case "pending_review":
      return "Pending review";
    default:
      return "No";
  }
}

function parseExperience(certifications?: string): string {
  if (!certifications) return "—";
  const match = certifications.match(/Years experience:\s*(\d+)/i);
  return match ? `${match[1]} years` : "—";
}

function parseOtherCerts(certifications?: string): string {
  if (!certifications) return "—";
  const lines = certifications
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.match(/^Years experience:/i) &&
        !line.match(/^(Driver license|ASE certification|Insurance):/i),
    );
  return lines.length > 0 ? lines.join(", ") : "—";
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function ProfessionalEditModal({
  bio,
  languages,
  saving,
  error,
  onClose,
  onSave,
}: {
  bio: string;
  languages: MechanicsLanguages[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (bio: string, languages: MechanicsLanguages[]) => void;
}) {
  const [draftBio, setDraftBio] = useState(bio);
  const [draftLanguages, setDraftLanguages] =
    useState<MechanicsLanguages[]>(languages);

  const toggleLanguage = (lang: MechanicsLanguages) => {
    setDraftLanguages((prev) =>
      prev.includes(lang)
        ? prev.filter((value) => value !== lang)
        : [...prev, lang],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[12px] shadow-xl border border-[#D2D2D2] w-full max-w-[520px] p-[32px] flex flex-col gap-[20px]">
        <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
          Edit Professional Info
        </h2>

        <label className="flex flex-col gap-2 text-[15px] text-black">
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Bio
          </span>
          <textarea
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value.slice(0, 250))}
            rows={4}
            className="border border-[#D2D2D2] rounded-[8px] p-3 resize-none"
          />
          <span className="text-[13px] text-[#666]">
            {draftBio.length}/250 characters
          </span>
        </label>

        <fieldset className="flex flex-col gap-2 text-[15px] text-black border-none p-0 m-0">
          <legend className="font-['Albert_Sans:Bold',sans-serif] font-bold mb-2">
            Languages
          </legend>
          {MECHANICS_LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draftLanguages.includes(lang)}
                onChange={() => toggleLanguage(lang)}
              />
              <span>{lang}</span>
            </label>
          ))}
        </fieldset>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="py-2 px-4 rounded-[8px] border border-[#D2D2D2] bg-white cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draftBio, draftLanguages)}
            disabled={saving}
            className="py-2 px-4 rounded-[8px] bg-[#ffa270] border-none cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MechanicAccount() {
  const { mechanic, hydrated } = useMechanicAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<MechanicDashboardProfile | null>(
    null,
  );
  const [serviceSetup, setServiceSetup] =
    useState<MechanicDashboardServiceSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isAvailable = mechanic?.availabilityOn ?? false;

  useEffect(() => {
    if (!hydrated || !mechanic) {
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/mechanics/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.warn(
            `[MechanicAccount] /api/mechanics/me returned ${res.status}`,
          );
        } else {
          const data = (await res.json()) as {
            profile: MechanicDashboardProfile;
            serviceSetup: MechanicDashboardServiceSetup;
          };
          if (!cancelled) {
            setProfile(data.profile);
            setServiceSetup(data.serviceSetup);
          }
        }
      } catch (error) {
        console.warn("[MechanicAccount] Failed to load account:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [hydrated, mechanic]);

  async function patchProfile(
    body: Record<string, unknown>,
  ): Promise<MechanicDashboardProfile> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error("You are not signed in.");
    }

    const res = await fetch("/api/mechanics/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }

    const data = (await res.json()) as {
      profile: MechanicDashboardProfile;
    };
    return data.profile;
  }

  const handlePhotoSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoUploading(true);
    setPhotoError("");

    try {
      const photoUrl = await uploadToCloudinary(file);
      const updated = await patchProfile({ photoUrl });
      setProfile(updated);
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Failed to update photo.",
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleProfessionalSave = async (
    bio: string,
    languages: MechanicsLanguages[],
  ) => {
    setEditSaving(true);
    setEditError("");

    try {
      const updated = await patchProfile({ bio, languages });
      setProfile(updated);
      setEditOpen(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to save changes.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const displayName = mechanic?.name ?? "—";
  const displayPhone = mechanic?.phone ?? "—";
  const displayEmail = mechanic?.email || "—";
  const languagesLabel =
    profile && profile.languages.length > 0
      ? profile.languages.join(", ")
      : "—";
  const categoriesLabel =
    serviceSetup && serviceSetup.categoryLabels.length > 0
      ? serviceSetup.categoryLabels.join(", ")
      : "—";
  const primaryZip = serviceSetup?.zipCodes[0] ?? "—";
  const allZips =
    serviceSetup && serviceSetup.zipCodes.length > 0
      ? serviceSetup.zipCodes.join(", ")
      : "—";

  return (
    <div
      className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen font-['Albert_Sans:Regular',sans-serif]"
      data-name="Mechanic Account"
    >
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="account" />

        <div className="w-full pt-[10px] pb-[10px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">
            Account
          </h1>
        </div>

        {loading ? (
          <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
            Loading account…
          </p>
        ) : null}

        <div className="w-full flex flex-col gap-[32px]">
          <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[32px]">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
              Profile Picture
            </h2>

            <div className="flex justify-center w-full">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={displayName}
                  className="w-[180px] h-[180px] rounded-full object-cover border-4 border-black"
                />
              ) : (
                <div className="w-[180px] h-[180px] rounded-full border-4 border-black bg-[#ffa270] flex items-center justify-center">
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[48px] text-black">
                    {initialsFromName(displayName)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center items-center mt-2 px-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePhotoSelect(e)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none p-0 disabled:opacity-60"
              >
                {photoUploading ? "Uploading…" : "Change"}
              </button>
            </div>

            {photoError ? (
              <p className="text-sm text-red-600 text-center">{photoError}</p>
            ) : null}
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-[32px]">
            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Personal Info
                </h2>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Name:
                  </span>{" "}
                  {displayName}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Phone:
                  </span>{" "}
                  {displayPhone}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Email:
                  </span>{" "}
                  {displayEmail}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Professional Info
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditError("");
                    setEditOpen(true);
                  }}
                  className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0"
                >
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Experience:
                  </span>{" "}
                  {parseExperience(profile?.certifications)}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Bio:
                  </span>{" "}
                  {profile?.bio || "—"}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Languages:
                  </span>{" "}
                  {languagesLabel}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    ASE Certified:
                  </span>{" "}
                  {profile
                    ? formatCertifiedStatus(profile.certifiedStatus)
                    : "—"}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Other Certs:
                  </span>{" "}
                  {parseOtherCerts(profile?.certifications)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Service Information
                </h2>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Categories:
                  </span>{" "}
                  {categoriesLabel}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Mobile Mechanic Available:
                  </span>{" "}
                  {serviceSetup?.mobileAvailable ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Shop-Based Service Available:
                  </span>{" "}
                  {serviceSetup?.shopAvailable ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Service Area & Availability
                </h2>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Primary ZIP Code:
                  </span>{" "}
                  {primaryZip}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Service ZIPs:
                  </span>{" "}
                  {allZips}
                </p>
                <p>
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Shop Address:
                  </span>{" "}
                  {serviceSetup?.shopAddress ?? "N/A"}
                </p>
                <div className="h-px bg-gray-200 my-1 w-full" />
                <div className="flex items-center justify-between">
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                    Accepting Jobs:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full font-semibold text-sm ${
                      isAvailable
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isAvailable ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && profile ? (
        <ProfessionalEditModal
          bio={profile.bio}
          languages={profile.languages as MechanicsLanguages[]}
          saving={editSaving}
          error={editError}
          onClose={() => setEditOpen(false)}
          onSave={(bio, languages) => void handleProfessionalSave(bio, languages)}
        />
      ) : null}

      <Footer />
    </div>
  );
}
