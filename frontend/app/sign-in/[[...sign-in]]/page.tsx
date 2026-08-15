import { SignIn } from "@clerk/nextjs";

// Demo mode bypasses Clerk entirely — no sign-in UI.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export default function SignInPage() {
  if (DEMO_MODE) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a2540] p-4">
        <p className="text-sm text-slate-300">
          โหมด demo ไม่ต้องเข้าสู่ระบบ — กลับไปที่หน้าแรกเพื่อใช้งาน
        </p>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a2540] p-4">
      <SignIn />
    </main>
  );
}