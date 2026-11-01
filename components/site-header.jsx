import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <Link href="/" className="inline-flex rounded-lg">
        <Logo size={32} />
      </Link>
    </header>
  );
}
