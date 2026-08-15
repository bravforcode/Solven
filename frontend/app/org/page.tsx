import { OrganizationProfile, OrganizationSwitcher, UserButton } from "@clerk/nextjs";

// Demo mode bypasses Clerk entirely — show a placeholder instead of Clerk
// components (which require <ClerkProvider />).
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export default function OrgPage() {
  if (DEMO_MODE) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">องค์กร</h1>
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          โหมด demo ไม่มีการจัดการองค์กร — ต้องตั้งค่า Clerk keys เพื่อใช้หน้านี้
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">องค์กร</h1>
        <div className="flex items-center gap-3">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      </div>
      <OrganizationProfile />
    </main>
  );
}