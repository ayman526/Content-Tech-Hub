import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F8FA" }}>
      <header className="px-8 py-5 border-b" style={{ borderColor: "#E5EAF0", background: "#FFFFFF" }}>
        <Link href="/" className="inline-flex items-center group">
          <span className="block text-2xl font-bold tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: "#33475B" }}>
            Contentech
          </span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
      <footer className="px-8 py-5 text-center text-sm border-t" style={{ borderColor: "#E5EAF0", color: "#99ACC2" }}>
        &copy; {new Date().getFullYear()} Contentech &middot;{" "}
        <Link href="/privacy" className="hover:underline" style={{ color: "#516F90" }}>Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:underline" style={{ color: "#516F90" }}>Terms</Link>
      </footer>
    </div>
  );
}
