"use client";

import { useEffect } from "react";
import { Button, ButtonLink, GridLines } from "@/components/ui";

/** Route-level error boundary: keeps the nav and footer, offers a retry. Never shows the error text. */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Logged for the developer console only; the message is never rendered.
    console.error(error.digest ? `HALO error ${error.digest}` : "HALO error");
  }, [error]);
  return (
    <main className="flex flex-1 flex-col">
      <section aria-labelledby="error-title" className="theater-well relative isolate flex flex-1 overflow-hidden border-b border-line text-fg">
        <GridLines corners />
        <div className="container-wide relative flex flex-col gap-6 pb-20 pt-20 sm:pt-28">
          <p className="type-label flex items-center gap-2 text-accent">
            <span aria-hidden="true" className="h-px w-4 bg-accent" />
            Error{error.digest ? ` · ${error.digest.slice(0, 12)}` : ""}
          </p>
          <h1 id="error-title" className="type-display-l max-w-[16ch] text-fg">
            This page lost its flame
          </h1>
          <p className="type-body-l max-w-[46ch] text-fg-2">
            Something went wrong while building this page. Your data is unchanged; trying again usually brings it back.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
