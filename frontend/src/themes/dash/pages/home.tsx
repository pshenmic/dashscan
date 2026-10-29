import { HomeBlocks } from "@/themes/dash/components/home-blocks";
import { HomeGeneralStats } from "@/themes/dash/components/home-general-stats";
import { HomeHero } from "@/themes/dash/components/home-hero";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-8">
      <HomeHero />
      <div className="space-y-12">
        <HomeGeneralStats />
        <HomeBlocks />
      </div>
    </main>
  );
}
