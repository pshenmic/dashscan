import { Link } from "@tanstack/react-router";

type AddressLinkProps = {
  address: string | null | undefined;
  className?: string;
};

export function AddressLink({
  address,
  className = "font-mono text-accent hover:underline",
}: AddressLinkProps) {
  if (!address) {
    return <span className="font-mono text-muted-foreground">—</span>;
  }
  return (
    <Link to="/wallet/$address" params={{ address }} className={className}>
      {address}
    </Link>
  );
}
