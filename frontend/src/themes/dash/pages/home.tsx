import { HomeAddresses } from "@/themes/dash/components/home-addresses";
import { HomeAssets } from "@/themes/dash/components/home-assets";
import { HomeBlocks } from "@/themes/dash/components/home-blocks";
import { HomeDao } from "@/themes/dash/components/home-dao";
import { HomeGeneralStats } from "@/themes/dash/components/home-general-stats";
import { HomeHero } from "@/themes/dash/components/home-hero";
import { HomeTransactions } from "@/themes/dash/components/home-transactions";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-8">
      <HomeHero />
      <div className="space-y-12">
        <HomeGeneralStats />
        <HomeBlocks />
        <HomeTransactions />
        <HomeAddresses />
        <HomeDao />
        <HomeAssets />
      </div>
    </main>
  );
}
