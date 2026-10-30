import type { ReactNode } from "react";
import Footer from "@/themes/dash/components/footer";
import Header from "@/themes/dash/components/header";

export default function ClassicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex-1 pb-12">{children}</div>
      <Footer />
    </div>
  );
}
