import type { ReactNode } from "react";
import Footer from "@/themes/classic/components/footer";
import Header from "@/themes/classic/components/header";

export default function ClassicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
