import { minidenticon } from "minidenticons";
import { type ComponentProps, useMemo } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  username: string;
  saturation?: number;
  lightness?: number;
};

export function Avatar({
  username,
  className,
  saturation = 50,
  lightness = 50,
  ...props
}: AvatarProps) {
  const source = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        minidenticon(username, saturation, lightness),
      )}`,
    [username, saturation, lightness],
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <img src={source} alt={username} className="h-full w-full" {...props} />
    </div>
  );
}
