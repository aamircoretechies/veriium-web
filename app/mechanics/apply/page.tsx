import Link from "next/link";
import ApplyAsMechanic from "../../../src_mirror/imports/Mechanic/ApplyAsMechanic";

export default function MechanicsApplyPage() {
  return (
    <>
      <div className="w-full bg-white border-b border-[#eee]">
        <div className="max-w-3xl mx-auto px-5 py-3 flex justify-end">
          <p className="text-sm text-gray-600 font-['Albert_Sans:Regular',sans-serif]">
            Already applied?{" "}
            <Link
              href="/m/signin"
              className="text-[#ffa270] font-semibold hover:underline"
            >
              Sign in to your account
            </Link>
          </p>
        </div>
      </div>
      <ApplyAsMechanic />
    </>
  );
}
