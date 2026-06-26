"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType =
  | "engine"
  | "brakes"
  | "suspension"
  | "electrical"
  | "diagnostics"
  | "general"
  | "other";

interface Mechanic {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  aseCertified: boolean;
  services: ServiceType[];
  zipCode: string;
  city: string;
  state: string;
  distance: number; // miles
  mobileAvailable: boolean;
  shopAvailable: boolean;
  availableToday: boolean;
  bio: string;
  languages: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MECHANICS: Mechanic[] = [
  {
    id: "m1",
    name: "Carlos Rivera",
    avatar: "CR",
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 12,
    aseCertified: true,
    services: ["engine", "diagnostics", "electrical"],
    zipCode: "90210",
    city: "Beverly Hills",
    state: "CA",
    distance: 2.3,
    mobileAvailable: true,
    shopAvailable: false,
    availableToday: true,
    bio: "ASE-certified with 12 years specializing in engine diagnostics and electrical systems. I come to you.",
    languages: ["English", "Spanish"],
  },
  {
    id: "m2",
    name: "Priya Nair",
    avatar: "PN",
    rating: 4.8,
    reviewCount: 89,
    yearsExperience: 8,
    aseCertified: true,
    services: ["brakes", "suspension", "general"],
    zipCode: "90211",
    city: "Los Angeles",
    state: "CA",
    distance: 4.1,
    mobileAvailable: false,
    shopAvailable: true,
    availableToday: true,
    bio: "Brake and suspension expert. Clear pricing, no surprises. Shop-based service in LA.",
    languages: ["English", "Hindi"],
  },
  {
    id: "m3",
    name: "James O'Brien",
    avatar: "JO",
    rating: 4.7,
    reviewCount: 214,
    yearsExperience: 18,
    aseCertified: false,
    services: ["general", "engine", "brakes"],
    zipCode: "90024",
    city: "Westwood",
    state: "CA",
    distance: 6.8,
    mobileAvailable: true,
    shopAvailable: true,
    availableToday: false,
    bio: "18 years of hands-on experience. Honest advice, fair prices. Mobile and shop service available.",
    languages: ["English"],
  },
  {
    id: "m4",
    name: "Sofia Mendez",
    avatar: "SM",
    rating: 5.0,
    reviewCount: 43,
    yearsExperience: 5,
    aseCertified: true,
    services: ["electrical", "diagnostics"],
    zipCode: "90035",
    city: "Culver City",
    state: "CA",
    distance: 8.2,
    mobileAvailable: true,
    shopAvailable: false,
    availableToday: true,
    bio: "Specialist in modern vehicle electrical systems and OBD diagnostics. Fast turnaround.",
    languages: ["English", "Spanish"],
  },
  {
    id: "m5",
    name: "Derek Washington",
    avatar: "DW",
    rating: 4.6,
    reviewCount: 176,
    yearsExperience: 14,
    aseCertified: true,
    services: ["engine", "suspension", "general", "brakes"],
    zipCode: "90045",
    city: "Inglewood",
    state: "CA",
    distance: 10.5,
    mobileAvailable: false,
    shopAvailable: true,
    availableToday: false,
    bio: "Full-service shop with 14 years of experience. Specializing in domestic and import vehicles.",
    languages: ["English"],
  },
  {
    id: "m6",
    name: "Mei Lin",
    avatar: "ML",
    rating: 4.9,
    reviewCount: 62,
    yearsExperience: 9,
    aseCertified: true,
    services: ["diagnostics", "electrical", "engine"],
    zipCode: "90028",
    city: "Hollywood",
    state: "CA",
    distance: 3.7,
    mobileAvailable: true,
    shopAvailable: false,
    availableToday: true,
    bio: "Certified diagnostic specialist focused on hybrid and EV systems. Transparent and thorough.",
    languages: ["English", "Mandarin"],
  },
];

const SERVICE_LABELS: Record<ServiceType, string> = {
  engine: "Engine",
  brakes: "Brakes",
  suspension: "Suspension",
  electrical: "Electrical",
  diagnostics: "Diagnostics",
  general: "General Maintenance",
  other: "Other",
};

const ALL_SERVICES: ServiceType[] = [
  "engine",
  "brakes",
  "suspension",
  "electrical",
  "diagnostics",
  "general",
];


// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={rating >= star ? "#ffa270" : rating >= star - 0.5 ? "url(#half)" : "none"}
          stroke="#ffa270"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#ffa270" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, variant = "default" }: { label: string; variant?: "default" | "orange" | "green" | "gray" }) {
  const styles: Record<string, string> = {
    default: "bg-[#f0f0f0] text-[#555]",
    orange: "bg-[#fff3ee] text-[#ffa270] border border-[#ffa270]",
    green: "bg-[#edf7f0] text-[#2d9e5a] border border-[#2d9e5a]",
    gray: "bg-[#f5f5f5] text-[#888]",
  };
  return (
    <span className={`inline-block text-[11px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold px-2 py-[3px] rounded-full ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ─── Mechanic Card ────────────────────────────────────────────────────────────

function MechanicCard({ mechanic, onBook }: { mechanic: Mechanic; onBook: (id: string) => void }) {
  return (
    <article className="bg-white rounded-[16px] border border-[#ececec] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-[52px] h-[52px] rounded-full bg-[#ffa270] flex items-center justify-center shrink-0 select-none"
          aria-hidden="true"
        >
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-white text-[16px]">{mechanic.avatar}</span>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[17px] text-black">{mechanic.name}</h3>
            {mechanic.aseCertified && <Badge label="ASE Certified" variant="orange" />}
            {mechanic.availableToday && <Badge label="Available Today" variant="green" />}
          </div>
          <p className="text-[13px] text-[#888] font-['Albert_Sans:Regular',sans-serif] mt-[2px]">
            {mechanic.city}, {mechanic.state} · {mechanic.distance} mi away
          </p>
          <div className="flex items-center gap-2 mt-[4px]">
            <StarRating rating={mechanic.rating} />
            <span className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] text-black">{mechanic.rating.toFixed(1)}</span>
            <span className="text-[13px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif]">({mechanic.reviewCount} reviews)</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444] leading-[1.6] line-clamp-2">{mechanic.bio}</p>

      {/* Service badges */}
      <div className="flex flex-wrap gap-[6px]">
        {mechanic.services.map((s) => (
          <Badge key={s} label={SERVICE_LABELS[s]} />
        ))}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-[#f5f5f5]">
        <div className="flex items-center gap-3 text-[13px] text-[#666] font-['Albert_Sans:Regular',sans-serif]">
          <span>{mechanic.yearsExperience} yrs exp</span>
          {mechanic.mobileAvailable && <span>· Mobile</span>}
          {mechanic.shopAvailable && <span>· Shop</span>}
        </div>
        <button
          onClick={() => onBook(mechanic.id)}
          className="bg-[#ffa270] hover:bg-[#ff8f52] active:scale-95 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[13px] px-4 py-[8px] rounded-[10px] transition-all duration-200 select-none cursor-pointer"
          aria-label={`Book ${mechanic.name}`}
        >
          Book Now
        </button>
      </div>
    </article>
  );
}


// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface Filters {
  zip: string;
  minRating: number;
  aseCertifiedOnly: boolean;
  services: ServiceType[];
  availableTodayOnly: boolean;
  maxDistance: number;
  serviceType: "all" | "mobile" | "shop";
}

const DEFAULT_FILTERS: Filters = {
  zip: "",
  minRating: 0,
  aseCertifiedOnly: false,
  services: [],
  availableTodayOnly: false,
  maxDistance: 50,
  serviceType: "all",
};

function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const toggleService = (s: ServiceType) => {
    const next = filters.services.includes(s)
      ? filters.services.filter((x) => x !== s)
      : [...filters.services, s];
    onChange({ services: next });
  };

  return (
    <aside className="bg-white rounded-[16px] border border-[#ececec] p-5 flex flex-col gap-5 shadow-sm h-fit sticky top-[24px]" aria-label="Filter mechanics">
      <div className="flex items-center justify-between">
        <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black">Filters</h2>
        <button
          onClick={onReset}
          className="text-[12px] font-['Albert_Sans:SemiBold',sans-serif] text-[#ffa270] hover:underline cursor-pointer select-none"
          aria-label="Reset all filters"
        >
          Reset all
        </button>
      </div>

      {/* ZIP Code */}
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-zip" className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black">
          ZIP Code
        </label>
        <input
          id="filter-zip"
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={filters.zip}
          onChange={(e) => onChange({ zip: e.target.value.replace(/\D/g, "") })}
          placeholder="e.g. 90210"
          className="border border-[#e0e0e0] rounded-[10px] px-3 py-[9px] text-[14px] font-['Albert_Sans:Regular',sans-serif] outline-none focus:border-[#ffa270] transition-colors duration-200 w-full"
        />
      </div>

      {/* Min Rating */}
      <div className="flex flex-col gap-2">
        <label className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black">
          Minimum Rating
        </label>
        <div className="flex gap-2 flex-wrap">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => onChange({ minRating: r })}
              className={`text-[12px] font-['Albert_Sans:SemiBold',sans-serif] px-3 py-[6px] rounded-full border transition-colors duration-200 cursor-pointer select-none ${
                filters.minRating === r
                  ? "bg-[#ffa270] border-[#ffa270] text-black"
                  : "border-[#e0e0e0] text-[#555] hover:border-[#ffa270]"
              }`}
              aria-pressed={filters.minRating === r}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Service Type */}
      <div className="flex flex-col gap-2">
        <label className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black">
          Service Location
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["all", "mobile", "shop"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ serviceType: t })}
              className={`text-[12px] font-['Albert_Sans:SemiBold',sans-serif] px-3 py-[6px] rounded-full border transition-colors duration-200 cursor-pointer select-none capitalize ${
                filters.serviceType === t
                  ? "bg-[#ffa270] border-[#ffa270] text-black"
                  : "border-[#e0e0e0] text-[#555] hover:border-[#ffa270]"
              }`}
              aria-pressed={filters.serviceType === t}
            >
              {t === "all" ? "All" : t === "mobile" ? "Mobile" : "Shop"}
            </button>
          ))}
        </div>
      </div>

      {/* Max Distance */}
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-distance" className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black">
          Max Distance: <span className="text-[#ffa270]">{filters.maxDistance} mi</span>
        </label>
        <input
          id="filter-distance"
          type="range"
          min={5}
          max={50}
          step={5}
          value={filters.maxDistance}
          onChange={(e) => onChange({ maxDistance: Number(e.target.value) })}
          className="w-full accent-[#ffa270] cursor-pointer"
          aria-valuemin={5}
          aria-valuemax={50}
          aria-valuenow={filters.maxDistance}
          aria-label={`Maximum distance: ${filters.maxDistance} miles`}
        />
        <div className="flex justify-between text-[11px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif]">
          <span>5 mi</span>
          <span>50 mi</span>
        </div>
      </div>

      {/* Service Categories */}
      <div className="flex flex-col gap-2">
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black">Service Type</p>
        <div className="flex flex-col gap-[10px]">
          {ALL_SERVICES.map((s) => (
            <label key={s} className="flex items-center gap-[10px] cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={filters.services.includes(s)}
                onChange={() => toggleService(s)}
                className="w-4 h-4 accent-[#ffa270] cursor-pointer"
                aria-label={`Filter by ${SERVICE_LABELS[s]}`}
              />
              <span className="font-['Albert_Sans:Regular',sans-serif] text-[13px] text-[#444] group-hover:text-black transition-colors">
                {SERVICE_LABELS[s]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ASE Certified */}
      <label className="flex items-center gap-[10px] cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={filters.aseCertifiedOnly}
          onChange={(e) => onChange({ aseCertifiedOnly: e.target.checked })}
          className="w-4 h-4 accent-[#ffa270] cursor-pointer"
          aria-label="Show only ASE Certified mechanics"
        />
        <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black group-hover:text-[#ffa270] transition-colors">
          ASE Certified Only
        </span>
      </label>

      {/* Available Today */}
      <label className="flex items-center gap-[10px] cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={filters.availableTodayOnly}
          onChange={(e) => onChange({ availableTodayOnly: e.target.checked })}
          className="w-4 h-4 accent-[#ffa270] cursor-pointer"
          aria-label="Show only mechanics available today"
        />
        <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[13px] text-black group-hover:text-[#ffa270] transition-colors">
          Available Today
        </span>
      </label>
    </aside>
  );
}


// ─── Sort Controls ────────────────────────────────────────────────────────────

type SortOption = "distance" | "rating" | "reviews" | "experience";

const SORT_LABELS: Record<SortOption, string> = {
  distance: "Nearest",
  rating: "Top Rated",
  reviews: "Most Reviewed",
  experience: "Most Experienced",
};

function SortBar({
  sort,
  onSort,
  resultCount,
}: {
  sort: SortOption;
  onSort: (s: SortOption) => void;
  resultCount: number;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
        <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-black">{resultCount}</span>{" "}
        mechanic{resultCount !== 1 ? "s" : ""} found
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-['Albert_Sans:SemiBold',sans-serif] text-[13px] text-[#888]">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
          <button
            key={s}
            onClick={() => onSort(s)}
            className={`text-[12px] font-['Albert_Sans:SemiBold',sans-serif] px-3 py-[6px] rounded-full border transition-colors duration-200 cursor-pointer select-none ${
              sort === s
                ? "bg-black border-black text-white"
                : "border-[#e0e0e0] text-[#555] hover:border-black"
            }`}
            aria-pressed={sort === s}
          >
            {SORT_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile Filter Drawer ─────────────────────────────────────────────────────

function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onReset: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col md:hidden" role="dialog" aria-modal="true" aria-label="Filter options">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-t-[20px] p-5 overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black">Filters</h2>
          <button
            onClick={onClose}
            className="text-[22px] text-black cursor-pointer hover:opacity-60 transition-opacity select-none"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
        <FilterPanel filters={filters} onChange={onChange} onReset={onReset} />
        <button
          onClick={onClose}
          className="w-full mt-5 bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] py-[14px] rounded-[12px] transition-colors duration-200 cursor-pointer select-none"
        >
          Show Results
        </button>
      </div>
    </div>
  );
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] gap-4 text-center">
      <div className="w-[64px] h-[64px] rounded-full bg-[#f5f5f5] flex items-center justify-center" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black">No mechanics found</p>
      <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666] max-w-[280px]">
        Try adjusting your filters to see more results.
      </p>
      <button
        onClick={onReset}
        className="mt-2 text-[14px] font-['Albert_Sans:SemiBold',sans-serif] text-[#ffa270] hover:underline cursor-pointer select-none"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function FindMechanic() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("distance");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchZip, setSearchZip] = useState("");

  const updateFilter = (partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchZip("");
  };

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...MOCK_MECHANICS];

    if (filters.zip) {
      list = list.filter((m) => m.zipCode.startsWith(filters.zip));
    }
    if (filters.minRating > 0) {
      list = list.filter((m) => m.rating >= filters.minRating);
    }
    if (filters.aseCertifiedOnly) {
      list = list.filter((m) => m.aseCertified);
    }
    if (filters.availableTodayOnly) {
      list = list.filter((m) => m.availableToday);
    }
    if (filters.maxDistance < 50) {
      list = list.filter((m) => m.distance <= filters.maxDistance);
    }
    if (filters.services.length > 0) {
      list = list.filter((m) =>
        filters.services.every((s) => m.services.includes(s))
      );
    }
    if (filters.serviceType === "mobile") {
      list = list.filter((m) => m.mobileAvailable);
    } else if (filters.serviceType === "shop") {
      list = list.filter((m) => m.shopAvailable);
    }

    // Sort
    list.sort((a, b) => {
      if (sort === "distance") return a.distance - b.distance;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "reviews") return b.reviewCount - a.reviewCount;
      if (sort === "experience") return b.yearsExperience - a.yearsExperience;
      return 0;
    });

    return list;
  }, [filters, sort]);

  const handleBook = (_id: string) => {
    router.push("/public");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ zip: searchZip });
  };

  const activeFilterCount = [
    filters.zip ? 1 : 0,
    filters.minRating > 0 ? 1 : 0,
    filters.aseCertifiedOnly ? 1 : 0,
    filters.availableTodayOnly ? 1 : 0,
    filters.maxDistance < 50 ? 1 : 0,
    filters.services.length > 0 ? 1 : 0,
    filters.serviceType !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#f8f8f8] min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      {/* Hero / Search bar */}
      <div className="bg-black w-full py-[40px] md:py-[56px] px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4 px-6">
          <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] md:text-[42px] text-white tracking-[0.1px]">
            Find a Verified Mechanic
          </h1>
          <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] md:text-[18px] text-white/70">
            Browse mechanics near you — certified, reviewed, and ready to help.
          </p>

          {/* ZIP search */}
          <form onSubmit={handleSearchSubmit} className="mt-2 flex gap-2 w-full max-w-[480px]" role="search" aria-label="Search mechanics by ZIP code">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your ZIP code"
              className="flex-1 bg-white border-none outline-none rounded-[12px] px-4 py-[13px] font-['Albert_Sans:Regular',sans-serif] text-[15px] text-black placeholder:text-[#aaa]"
              aria-label="ZIP code"
            />
            <button
              type="submit"
              className="bg-[#ffa270] hover:bg-[#ff8f52] active:scale-95 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] px-6 py-[13px] rounded-[12px] transition-all duration-200 cursor-pointer select-none whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Body */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 py-8 md:py-10" id="mechanic-results">
        {/* Mobile filter toggle */}
        <div className="flex md:hidden items-center gap-3 mb-5">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-2 border border-[#e0e0e0] bg-white rounded-[10px] px-4 py-[9px] text-[14px] font-['Albert_Sans:SemiBold',sans-serif] text-black cursor-pointer select-none hover:border-[#ffa270] transition-colors"
            aria-label="Open filters"
            aria-expanded={mobileFilterOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#ffa270] text-black text-[11px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center" aria-label={`${activeFilterCount} active filters`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-6 items-start">
          {/* Desktop sidebar */}
          <div className="hidden md:block w-[260px] shrink-0">
            <FilterPanel filters={filters} onChange={updateFilter} onReset={resetFilters} />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            <SortBar sort={sort} onSort={setSort} resultCount={filtered.length} />
            {filtered.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((m) => (
                  <MechanicCard key={m.id} mechanic={m} onBook={handleBook} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onChange={updateFilter}
        onReset={resetFilters}
      />

      <Footer />
    </div>
  );
}
