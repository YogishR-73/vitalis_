"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock } from "lucide-react";

interface PrivacyNoticeModalProps {
  open: boolean;
  onClose: () => void;
}

/** Static demo copy for the footer “Privacy” control — no backend. */
export default function PrivacyNoticeModal({ open, onClose }: PrivacyNoticeModalProps) {
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
          aria-labelledby="privacy-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            aria-label="Close privacy notice"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            className="relative z-10 w-full max-w-lg rounded-[36px] glass hologram-border shadow-2xl p-8"
          >
            <div className="flex justify-between items-start gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Lock className="w-8 h-8 text-v-cyan" />
                <h2 id="privacy-title" className="text-xl font-black italic uppercase">
                  Privacy <span className="text-v-cyan font-light not-italic">Core</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl border border-white/10 text-v-muted hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="text-sm text-v-muted font-light space-y-4 leading-relaxed">
              <p>
                This demonstration runs primarily in your browser. Biometric samples processed via Web APIs
                stay on-device unless you explicitly connect external services.
              </p>
              <p>
                Triage chat sends messages to your configured FastAPI backend; do not enter real protected
                health information unless your deployment is HIPAA-ready and contracted accordingly.
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="mt-8 w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-widest hover:border-v-cyan/30"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
