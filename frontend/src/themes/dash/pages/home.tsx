import { HomeAddresses } from "@/themes/dash/components/home-addresses";
import { HomeAssets } from "@/themes/dash/components/home-assets";
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
    <main className="relative isolate mx-auto max-w-[1440px] px-4 pb-12 sm:px-8 lg:pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-[88px] bottom-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-0 h-[1132px] w-[1440px] -translate-x-1/2 bg-foreground"
          style={{
            mask: "url(/images/home/grid.svg) center / contain no-repeat",
          }}
        />
      </div>
      <HomeHero />
      <div className="space-y-12">
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
