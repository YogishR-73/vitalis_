"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Shield, Cpu, Activity, Lock } from "lucide-react";

interface ProtocolOverviewModalProps {
  open: boolean;
  onClose: () => void;
}

const phases = [
  {
    title: "Protocol Zero",
    body: "Baseline neural handshake, encrypted channel negotiation, and integrity verification before any clinical payload is exchanged.",
    icon: Lock,
  },
  {
    title: "Telemetry Ingest",
    body: "Structured biometric and symptomatic signals are normalized, tagged, and routed to the triage core with full audit metadata.",
    icon: Activity,
  },
  {
    title: "Inference & Triage",
    body: "The cognitive layer synthesizes context-aware guidance while preserving session memory for coherent multi-turn diagnostics.",
    icon: Cpu,
  },
  {
    title: "Governance",
    body: "Access is segmented by role; outbound integrations require explicit policy tokens. This demo runs in a local trust boundary.",
    icon: Shield,
  },
];

/**
 * Protocol overview — informational modal opened from the hero secondary CTA
 * or footer “Protocol” links. Keeps the cinematic glass / motion language of the hero.
 */
export default function ProtocolOverviewModal({ open, onClose }: ProtocolOverviewModalProps) {
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
          aria-labelledby="protocol-overview-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            aria-label="Close protocol overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[40px] glass hologram-border shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 p-8 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-v-cyan/10 border border-v-cyan/20">
                  <Database className="w-7 h-7 text-v-cyan" />
                </div>
                <div>
                  <h2
                    id="protocol-overview-title"
                    className="text-xl md:text-2xl font-black italic tracking-tight uppercase"
                  >
                    Protocol <span className="text-v-cyan font-light not-italic">Overview</span>
                  </h2>
                  <p className="text-[10px] font-mono text-v-muted uppercase tracking-[0.25em] mt-1">
                    Vitalis_Core // Disclosure_Layer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl glass border border-white/10 text-v-muted hover:text-white hover:border-v-cyan/30 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6 scrollbar-hide">
              <p className="text-v-muted text-sm leading-relaxed font-light">
                The following phases describe how the Vitalis demo coordinates trust, data, and AI-assisted
                triage. Production deployments extend this with your own identity, storage, and policy
                engines.
              </p>
              <ul className="space-y-4">
                {phases.map((p, i) => (
                  <motion.li
                    key={p.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-4 p-5 rounded-[28px] bg-white/[0.03] border border-white/5"
                  >
                    <div className="shrink-0 p-2.5 rounded-xl bg-v-cyan/10">
                      <p.icon className="w-5 h-5 text-v-cyan" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-white mb-1">{p.title}</h3>
                      <p className="text-xs text-v-muted leading-relaxed font-light">{p.body}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/30">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-v-cyan text-v-bg font-bold uppercase tracking-[0.2em] text-xs"
              >
                Acknowledge
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
