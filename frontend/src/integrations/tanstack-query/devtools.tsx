import { lazy, Suspense } from "react";

const DevtoolsPanel = import.meta.env.DEV
  ? lazy(async () => {
      const [reactDevtools, routerDevtools, queryDevtools] = await Promise.all([
        import("@tanstack/react-devtools"),
        import("@tanstack/react-router-devtools"),
        import("@tanstack/react-query-devtools"),
      ]);

      function DevelopmentDevtools() {
        return (
          <reactDevtools.TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <routerDevtools.TanStackRouterDevtoolsPanel />,
              },
              {
                name: "Tanstack Query",
                render: <queryDevtools.ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        );
      }

      return { default: DevelopmentDevtools };
    })
  : null;

export default function AppDevtools() {
  if (!DevtoolsPanel) return null;

  return (
    <Suspense fallback={null}>
      <DevtoolsPanel />
    </Suspense>
  );
}
