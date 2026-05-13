import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text?: string;
  fallbackUrl?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default";
  iconOnly?: boolean;
}

export function ShareButton({
  title,
  text,
  fallbackUrl,
  className,
  size = "sm",
  variant = "outline",
  iconOnly = false,
}: ShareButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : (fallbackUrl ?? "");
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "size-7 text-muted-foreground hover:text-accent-foreground",
          className,
        )}
        aria-label="Share"
      >
        <Share2 className="size-3.5" />
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant={variant}
      size={size === "icon" ? "sm" : size}
      onClick={handleClick}
      className={cn("gap-1.5", className)}
    >
      <Share2 className="size-3.5" /> Share
    </Button>
  );
}
