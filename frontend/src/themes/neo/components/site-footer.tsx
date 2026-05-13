import { Github, MessageCircle, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

const SOCIALS = [
  { href: "https://github.com/pshenmic", label: "GitHub", icon: Github },
  { href: "https://x.com/pshenmic", label: "X / Twitter", icon: Twitter },
  {
    href: "https://discord.gg/dash",
    label: "Discord",
    icon: MessageCircle,
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-background">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4 text-sm sm:px-6 lg:px-8">
        <p className="text-muted-foreground">
          © {new Date().getFullYear()} DashScan Explorer · pshenmic.dev
        </p>
        <div className="flex items-center gap-1">
          {SOCIALS.map((s) => (
            <Button
              key={s.label}
              asChild
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={s.label}
              >
                <s.icon className="size-4" />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
}
