"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Loader2, CheckCircle2, Mail, User } from "lucide-react";

interface AccessInviteModalProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "vitalis_access_invite_submissions";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Frontend-only access request flow: validates input, simulates submission latency,
 * persists to localStorage for demo continuity, and shows a Framer Motion success state.
 * Replace the simulated submit with a real API when a backend waitlist exists.
 */
export default function AccessInviteModal({ open, onClose }: AccessInviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setEmail("");
    setOrg("");
    setError(null);
    setLoading(false);
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    },
    [onClose, loading]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const em = email.trim();
    if (n.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!isValidEmail(em)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    try {
      const prev = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const list = prev ? (JSON.parse(prev) as unknown[]) : [];
      list.push({
        name: n,
        email: em,
        organization: org.trim() || undefined,
        at: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* non-fatal demo storage */
    }
    setLoading(false);
    setSuccess(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-invite-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Close access request"
            disabled={loading}
            onClick={() => !loading && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative z-10 w-full max-w-md rounded-[40px] glass hologram-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-v-cyan" />
                <div>
                  <h2 id="access-invite-title" className="text-lg font-black italic uppercase tracking-tight">
                    Request <span className="text-v-cyan font-light not-italic">Access</span>
                  </h2>
                  <p className="text-[9px] font-mono text-v-muted uppercase tracking-widest">
                    Invite_Queue // Demo
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => !loading && onClose()}
                className="p-2 rounded-xl border border-white/10 text-v-muted hover:text-white disabled:opacity-40"
              >
                <X size={22} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-10 text-center space-y-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-v-emerald mx-auto drop-shadow-[0_0_24px_rgba(0,255,136,0.35)]" />
                  </motion.div>
                  <p className="text-lg font-bold text-white tracking-tight">Request received</p>
                  <p className="text-sm text-v-muted font-light leading-relaxed">
                    Your invite is queued for review. In production this would trigger email verification and
                    account provisioning.
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-v-cyan text-v-bg font-bold uppercase tracking-[0.2em] text-xs"
                  >
                    Close
                  </motion.button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={(e) => void handleSubmit(e)}
                  className="p-8 space-y-5"
                >
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-v-muted block mb-2">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-v-muted" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-v-cyan/40"
                        placeholder="Ada Lovelace"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-v-muted block mb-2">
                      Work email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-v-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-v-cyan/40"
                        placeholder="you@organization.com"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-v-muted block mb-2">
                      Organization <span className="text-v-muted/60">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-v-cyan/40"
                      placeholder="Hospital or lab name"
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-v-red font-mono uppercase tracking-wide" role="alert">
                      {error}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-4 rounded-2xl bg-v-cyan text-v-bg font-black uppercase tracking-[0.25em] text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit request"
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
