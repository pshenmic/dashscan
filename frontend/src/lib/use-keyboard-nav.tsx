import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NavShortcut = {
  keys: [string, string];
  label: string;
  to: string;
};

export const NAV_SHORTCUTS: NavShortcut[] = [
  { keys: ["g", "d"], label: "Dashboard", to: "/" },
  { keys: ["g", "b"], label: "Blocks", to: "/blocks" },
  { keys: ["g", "t"], label: "Transactions", to: "/transactions" },
  { keys: ["g", "m"], label: "Masternodes", to: "/masternodes" },
  { keys: ["g", "a"], label: "DAO", to: "/dao" },
];

export const GLOBAL_SHORTCUTS = [
  { keys: ["?"], label: "Open this cheatsheet" },
  { keys: ["⌘", "K"], label: "Open search" },
  { keys: ["Esc"], label: "Close dialog" },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function useKeyboardNavState() {
  const [open, setOpen] = useState(false);
  const [leader, setLeader] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let activeLeader: string | null = null;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;

    const clearLeader = () => {
      activeLeader = null;
      setLeader(null);
      if (leaderTimer) {
        clearTimeout(leaderTimer);
        leaderTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
        clearLeader();
        return;
      }

      if (e.key === "Escape") {
        clearLeader();
        return;
      }

      const key = e.key.toLowerCase();

      if (activeLeader === "g") {
        const target = NAV_SHORTCUTS.find((s) => s.keys[1] === key);
        if (target) {
          e.preventDefault();
          // biome-ignore lint/suspicious/noExplicitAny: dynamic route
          navigate({ to: target.to as any });
        }
        clearLeader();
        return;
      }

      if (key === "g") {
        activeLeader = "g";
        setLeader("g");
        if (leaderTimer) clearTimeout(leaderTimer);
        leaderTimer = setTimeout(clearLeader, 1500);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (leaderTimer) clearTimeout(leaderTimer);
    };
  }, [navigate]);

  return { open, setOpen, leader };
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground shadow-[0_1px_0_0_hsla(215,62%,12%,0.06)]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcuts() {
  const { open, setOpen, leader } = useKeyboardNavState();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </h3>
              <ul className="grid gap-1.5">
                {NAV_SHORTCUTS.map((shortcut) => (
                  <li
                    key={shortcut.to}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary"
                  >
                    <span className="text-sm">Go to {shortcut.label}</span>
                    <span className="flex items-center gap-1">
                      <Kbd>{shortcut.keys[0]}</Kbd>
                      <span className="text-muted-foreground">then</span>
                      <Kbd>{shortcut.keys[1]}</Kbd>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Global
              </h3>
              <ul className="grid gap-1.5">
                {GLOBAL_SHORTCUTS.map((shortcut) => (
                  <li
                    key={shortcut.label}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary"
                  >
                    <span className="text-sm">{shortcut.label}</span>
                    <span className="flex items-center gap-1">
                      {shortcut.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {leader === "g" && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-popover/95 px-4 py-2 text-sm shadow-floating backdrop-blur">
          <Kbd>g</Kbd>
          <span className="text-muted-foreground">then</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Kbd>d</Kbd>
            <Kbd>b</Kbd>
            <Kbd>t</Kbd>
            <Kbd>m</Kbd>
            <Kbd>a</Kbd>
          </span>
        </div>
      )}
    </>
  );
}
