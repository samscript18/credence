"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ModalShell({
  children,
  titleId,
  onClose,
  busy = false,
  wide = false,
}: {
  children: ReactNode;
  titleId: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={cn(
        "fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0B0C0E] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-md sm:inset-0 sm:m-auto sm:max-h-[90dvh] sm:rounded-2xl",
        wide ? "sm:max-w-xl" : "sm:max-w-md"
      )}
    >
      {children}
    </dialog>
  );
}
