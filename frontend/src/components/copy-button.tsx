import { Check, Copy } from "lucide-react";
import { useState } from "react";
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

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const Icon = copied ? Check : Copy;
  const dimension = size === "sm" ? "size-3.5" : "size-4";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        "size-7 text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={label ? `Copy ${label}` : "Copy"}
    >
      <Icon className={dimension} />
    </Button>
  );
}
