import type { ReactNode } from "react";
import Footer from "@/themes/dash/components/footer";
import Header from "@/themes/dash/components/header";

export default function ClassicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
