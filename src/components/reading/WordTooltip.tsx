"use client";

import { useState } from "react";

export function WordTooltip({
  word,
  definition,
}: {
  word: string;
  definition: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-help rounded border-b border-dotted border-primary text-primary underline-offset-2"
      >
        {word}
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span className="absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
            {definition}
          </span>
        </>
      )}
    </span>
  );
}
