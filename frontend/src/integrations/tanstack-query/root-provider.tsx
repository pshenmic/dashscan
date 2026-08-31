import { QueryClient } from "@tanstack/react-query";

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: typeof window === "undefined" ? 0 : 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  return {
    queryClient,
  };
}
