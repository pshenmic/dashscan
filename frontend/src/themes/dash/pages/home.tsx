import { HomeAddresses } from "@/themes/dash/components/home-addresses";
import { HomeAssets } from "@/themes/dash/components/home-assets";
import { HomeBackground } from "@/themes/dash/components/home-background";
import { HomeBlocks } from "@/themes/dash/components/home-blocks";
import { HomeCoinJoin } from "@/themes/dash/components/home-coinjoin";
import { HomeDao } from "@/themes/dash/components/home-dao";
import { HomeGeneralStats } from "@/themes/dash/components/home-general-stats";
import { HomeHero } from "@/themes/dash/components/home-hero";
import { HomeMasternodes } from "@/themes/dash/components/home-masternodes";
import { HomeNetwork } from "@/themes/dash/components/home-network";
import { HomeTransactions } from "@/themes/dash/components/home-transactions";

export default function HomePage() {
  return (
    <main className="dash-home relative isolate mx-auto max-w-[1440px] px-4 pb-16 sm:px-8 lg:pb-24">
      <HomeBackground />
      <HomeHero />
      <div data-grid-content className="flex flex-col gap-16 lg:gap-24">
        <HomeGeneralStats />
        <HomeBlocks />
        <HomeTransactions />
        <HomeAddresses />
        <HomeDao />
        <HomeAssets />
        <HomeCoinJoin />
        <HomeMasternodes />
        <HomeNetwork />
      </div>
    </main>
  );
}
