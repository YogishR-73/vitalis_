"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Fingerprint } from "lucide-react";

interface DemoAccountModalProps {
  open: boolean;
  onClose: () => void;
}

/** Explains the decorative “authenticated” nav chip — demo-only, no credentials. */
export default function DemoAccountModal({ open, onClose }: DemoAccountModalProps) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-account-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative z-10 w-full max-w-sm rounded-[32px] glass hologram-border p-8 shadow-2xl"
          >
            <div className="flex justify-between items-start mb-4">
              <Fingerprint className="w-10 h-10 text-v-cyan" />
              <button type="button" onClick={onClose} className="text-v-muted hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <h2 id="demo-account-title" className="text-lg font-black uppercase italic mb-2">
              Demo <span className="text-v-cyan font-light not-italic">session</span>
            </h2>
            <p className="text-sm text-v-muted font-light leading-relaxed">
              Identifier <span className="font-mono text-v-text/80">P_PN_402</span> is a visual placeholder. There is no
              sign-in in this build—triage uses your local FastAPI backend when configured.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-2xl bg-v-cyan text-v-bg text-xs font-bold uppercase tracking-widest"
            >
              Understood
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
