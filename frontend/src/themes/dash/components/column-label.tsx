import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ColumnLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded-sm decoration-dotted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{description}</TooltipContent>
    </Tooltip>
  );
}
