"use client";

import { useState } from "react";

// Placeholder interactive element; proves hydration works under the CSP.
export function ClickProbe() {
  const [n, setN] = useState(0);
  return (
    <button
      type="button"
      data-testid="probe"
      onClick={() => setN((v) => v + 1)}
      className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm"
    >
      Clicked {n} times
    </button>
  );
}
