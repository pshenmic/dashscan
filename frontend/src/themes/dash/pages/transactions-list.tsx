import { useStore } from "@tanstack/react-store";
import type { PageSize } from "@/lib/pagination";
import { appStore } from "@/lib/store";
import type { TransactionTypeFilter } from "@/lib/transaction-types";
import type { TableViewMode } from "@/lib/use-table-view-mode";
import { TransactionsListTable } from "@/themes/dash/components/transactions-list-table";
import { TransactionsOverview } from "@/themes/dash/components/transactions-overview";

export interface TransactionsListSearch {
  page: number;
  limit: PageSize;
  order: "asc" | "desc";
  view?: TableViewMode;
  hash?: string;
  transaction_type?: TransactionTypeFilter;
  coinjoin?: boolean;
  multisig?: boolean;
  block_height?: number;
}

export default function TransactionsListPage(search: TransactionsListSearch) {
  const network = useStore(appStore, (state) => state.network);
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
      <TransactionsOverview network={network} />
      <TransactionsListTable key={network} network={network} search={search} />
    </main>
  );
}
