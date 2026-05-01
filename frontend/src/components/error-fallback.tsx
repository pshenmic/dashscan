import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error;
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Alert variant="destructive" className="mx-auto max-w-lg">
        <AlertTriangle />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => router.invalidate()}>
              <RotateCcw className="size-4" />
              Retry
            </Button>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </main>
  );
}
