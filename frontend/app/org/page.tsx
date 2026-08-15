import { OrganizationProfile, OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function OrgPage() {
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