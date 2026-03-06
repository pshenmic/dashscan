import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorFallbackProps {
  error: Error;
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-destructive/20 text-destructive">
            <AlertTriangle className="size-7" />
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.invalidate()}>
              <RotateCcw className="size-4" />
              Retry
            </Button>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
