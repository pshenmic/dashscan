import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({
  value,
  label,
  className,
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setRippleKey((k) => k + 1);
      toast.success(label ? `${label} copied` : "Copied to clipboard");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const dimension = size === "sm" ? "size-3.5" : "size-4";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        "relative size-7 overflow-hidden text-muted-foreground hover:text-accent-foreground",
        copied && "text-success",
        className,
      )}
      aria-label={label ? `Copy ${label}` : "Copy"}
    >
      <span className="relative inline-flex size-full items-center justify-center">
        {rippleKey > 0 && (
          <span
            key={rippleKey}
            aria-hidden
            className="copy-ripple pointer-events-none absolute inset-0 rounded-full bg-success/40"
          />
        )}
        {copied ? (
          <Check key="check" className={cn(dimension, "copy-check-pop")} />
        ) : (
          <Copy className={dimension} />
        )}
      </span>
    </Button>
  );
}
