Probable client components (add "use client" when migrating):

- app/components/ui/sidebar.tsx  (uses `useEffect`, `document`, `window`)
- app/components/ui/use-mobile.ts (already `use client`)
- app/components/ui/carousel.tsx (uses `useEffect`, embla-carousel)
- app/components/ui/chart.tsx (uses hooks, context, Recharts)
- app/components/ui/command.tsx (uses dialog + client-only primitives)
- app/components/ui/form.tsx (uses react-hook-form Controller/context)
- app/components/ui/input-otp.tsx (uses OTPInput library)
- app/components/ui/scroll-area.tsx (radix primitives often client)

Notes:
- Many Radix primitives and interactive components are already marked with `use client`.
- After copying, scan each file for `useState`, `useEffect`, DOM access (`window`, `document`) or third-party hooks that require the browser, and add `"use client"` at the top.
