import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ErrorFallback } from "../components/error-fallback";
import AppDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { ThemeHydrator } from "../themes/Hydrator";
import { THEME_INIT_SCRIPT } from "../themes/init";
import { ThemeShell } from "../themes/ShellDispatcher";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  errorComponent: ErrorFallback,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Dashscan",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon.png",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <ThemeHydrator />
        <ThemeShell>{children}</ThemeShell>
        <Toaster />
        <AppDevtools />
        <Scripts />
      </body>
    </html>
  );
}
