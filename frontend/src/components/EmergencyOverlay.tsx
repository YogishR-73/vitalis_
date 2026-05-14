"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  PhoneCall,
  Zap,
  X,
  Bell,
  ChevronRight,
  MapPin,
  Activity,
  Radio,
  ShieldCheck,
} from "lucide-react";

interface EmergencyOverlayProps {
  onClose: () => void;
}

type BreathPhase = "inhale" | "hold" | "exhale";
type GeoState = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "timeout";

const BREATH_MS = { inhale: 4000, hold: 2200, exhale: 4500 } as const;
/** V_CORE recommendation sync bar — completes then triggers escalation (seconds). */
const PROGRESS_DURATION_S = 18;

const ESCALATION_LINES = [
  "Analyzing biometric escalation…",
  "Emergency threshold exceeded.",
  "Contacting emergency services…",
  "Dispatching location beacon…",
  "Emergency response locked to current coordinates.",
] as const;

function formatCoord(n: number): string {
  return n.toFixed(3);
}

/**
 * Critical anomaly overlay + optional guided calming + post-sync escalation.
 *
 * Flow:
 * 1. User sees critical state; V_CORE bar fills over PROGRESS_DURATION_S.
 * 2. Admin_Calm_Vapor toggles guided breathing (inhale/hold/exhale), softens reds, protocol badges.
 * 3. When the bar completes, an escalation panel runs a timed copy sequence, requests geolocation once,
 *    then shows dispatch confirmation, simulated ETA, stabilization pulse, and optional cancel.
 * 4. All timers/intervals clear on unmount or when the overlay closes from the parent.
 */
export default function EmergencyOverlay({ onClose }: EmergencyOverlayProps) {
  const mountedRef = useRef(true);
  const calmingRef = useRef(false);
  const progressBarCompleteRef = useRef(false);
  const escalationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [calmingMode, setCalmingMode] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("inhale");
  const [breathCycles, setBreathCycles] = useState(0);

  const [progressSession, setProgressSession] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);

  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationStep, setEscalationStep] = useState(0);
  const [escalationLocked, setEscalationLocked] = useState(false);

  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  calmingRef.current = calmingMode;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearEscalationInterval = useCallback(() => {
    if (escalationIntervalRef.current !== null) {
      clearInterval(escalationIntervalRef.current);
      escalationIntervalRef.current = null;
    }
  }, []);

  const clearBreathTimeout = useCallback(() => {
    if (breathTimeoutRef.current !== null) {
      clearTimeout(breathTimeoutRef.current);
      breathTimeoutRef.current = null;
    }
  }, []);

  /** Guided breathing loop while calming mode is active. */
  useEffect(() => {
    if (!calmingMode) {
      clearBreathTimeout();
      setBreathPhase("inhale");
      return;
    }

    const run = (phase: BreathPhase) => {
      setBreathPhase(phase);
      const ms =
        phase === "inhale" ? BREATH_MS.inhale : phase === "hold" ? BREATH_MS.hold : BREATH_MS.exhale;
      breathTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current || !calmingRef.current) return;
        if (phase === "inhale") run("hold");
        else if (phase === "hold") run("exhale");
        else {
          setBreathCycles((c) => c + 1);
          run("inhale");
        }
      }, ms);
    };

    run("inhale");
    return () => clearBreathTimeout();
  }, [calmingMode, clearBreathTimeout]);

  useEffect(() => {
    progressBarCompleteRef.current = false;
  }, [progressSession]);

  /** When escalation panel opens: advance scripted lines, then lock dispatch + ETA. */
  useEffect(() => {
    if (!showEscalation) {
      clearEscalationInterval();
      return;
    }

    setEscalationStep(0);
    setEscalationLocked(false);
    let step = 0;

    escalationIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      step += 1;
      if (step < ESCALATION_LINES.length) {
        setEscalationStep(step);
      } else {
        clearEscalationInterval();
        setEscalationStep(ESCALATION_LINES.length - 1);
        setEscalationLocked(true);
        setEtaMinutes(3 + Math.floor(Math.random() * 5));
      }
    }, 2200);

    return () => clearEscalationInterval();
  }, [showEscalation, progressSession, clearEscalationInterval]);

  /**
   * Geolocation: requested once when escalation UI opens (after progress completes).
   * Denied/unavailable → graceful copy; no repeated prompts.
   */
  useEffect(() => {
    if (!showEscalation) {
      setGeoState("idle");
      setCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }

    setGeoState("requesting");
    const watchdog = window.setTimeout(() => {
      setGeoState((s) => (s === "requesting" ? "timeout" : s));
    }, 18000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(watchdog);
        if (!mountedRef.current) return;
        setGeoState("ready");
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        window.clearTimeout(watchdog);
        if (!mountedRef.current) return;
        setGeoState("denied");
      },
      { enableHighAccuracy: false, timeout: 14000, maximumAge: 120000 }
    );

    return () => {
      window.clearTimeout(watchdog);
    };
  }, [showEscalation, progressSession]);

  const onProgressAnimationComplete = useCallback(() => {
    if (!mountedRef.current || progressBarCompleteRef.current) return;
    progressBarCompleteRef.current = true;
    setProgressComplete(true);
    setShowEscalation(true);
  }, []);

  const toggleCalming = useCallback(() => {
    setBreathCycles(0);
    setCalmingMode((v) => !v);
  }, []);

  const cancelEscalation = useCallback(() => {
    clearEscalationInterval();
    setShowEscalation(false);
    setEscalationLocked(false);
    setProgressComplete(false);
    progressBarCompleteRef.current = false;
    setEscalationStep(0);
    setEtaMinutes(null);
    setGeoState("idle");
    setCoords(null);
    setProgressSession((s) => s + 1);
  }, [clearEscalationInterval]);

  const protocolStatus = (() => {
    if (showEscalation) return "ESCALATION_PROTOCOL_ACTIVE";
    if (!calmingMode) return "Protocol_Zero_Active";
    if (breathCycles < 2) return "CALMING_PROTOCOL_ACTIVE";
    if (breathCycles < 5) return "BREATH_SYNC_STABLE";
    return "VITAL_RESPONSE_IMPROVING";
  })();

  const breathScale =
    breathPhase === "inhale" ? 1.15 : breathPhase === "hold" ? 1.15 : 0.92;
  const alertSoftness = calmingMode ? 0.35 : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20 overflow-y-auto overflow-x-hidden"
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-3xl"
        animate={{
          backgroundColor: calmingMode ? "rgba(255,34,68,0.06)" : "rgba(255,34,68,0.2)",
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: calmingMode ? 0.12 : 0.28,
        }}
        transition={{ duration: 1 }}
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,34,68,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="hud-grid absolute inset-0 opacity-10 pointer-events-none" />

      <motion.div
        animate={{ opacity: calmingMode ? 0.25 : 1 }}
        className={`absolute top-0 left-0 w-full h-2 bg-v-red ${!calmingMode ? "animate-pulse" : ""}`}
      />
      <motion.div
        animate={{ opacity: calmingMode ? 0.25 : 1 }}
        className={`absolute bottom-0 left-0 w-full h-2 bg-v-red ${!calmingMode ? "animate-pulse" : ""}`}
      />

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass rounded-[60px] border-[#ff2244]/30 w-full max-w-5xl p-12 relative overflow-visible shadow-[0_0_100px_rgba(255,34,68,0.3)] my-auto"
        style={{
          borderColor: calmingMode ? "rgba(255,34,68,0.12)" : "rgba(255,34,68,0.3)",
          boxShadow: calmingMode
            ? "0 0 60px rgba(255,34,68,0.12)"
            : "0 0 100px rgba(255,34,68,0.3)",
          transition: "border-color 1s, box-shadow 1s",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-10 right-10 z-20 p-4 rounded-2xl glass hover:bg-v-red/10 transition-all group"
        >
          <X className="text-v-red group-hover:rotate-90 transition-transform" />
        </button>

        <AnimatePresence>
          {calmingMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1 * alertSoftness, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ scale: breathScale }}
                transition={{
                  duration:
                    breathPhase === "inhale"
                      ? BREATH_MS.inhale / 1000
                      : breathPhase === "hold"
                        ? BREATH_MS.hold / 1000
                        : BREATH_MS.exhale / 1000,
                  ease: breathPhase === "exhale" ? "easeIn" : "easeInOut",
                }}
                className="w-40 h-40 rounded-full border-2 border-v-cyan/40 bg-v-cyan/5 shadow-[0_0_60px_rgba(0,212,255,0.25)] flex items-center justify-center"
              >
                <Activity className="w-12 h-12 text-v-cyan/80" />
              </motion.div>
              <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.4em] text-v-cyan/80">
                {breathPhase === "inhale" && "Inhale"}
                {breathPhase === "hold" && "Hold"}
                {breathPhase === "exhale" && "Exhale"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row gap-16 items-center relative z-[5]">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-v-red/10 border border-v-red/20 mb-8">
              <ShieldAlert className="text-v-red animate-bounce" size={20} />
              <span className="text-xs font-mono text-v-red tracking-[0.25em] uppercase font-bold">
                {protocolStatus}
              </span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-8 leading-none">
              CRITICAL <br />
              <span className="text-v-red font-light not-italic">Anomaly.</span>
            </h2>
            <p className="text-xl text-v-text/80 mb-12 leading-relaxed max-w-md font-light">
              Biometric sync detects extreme systemic stress. Automated emergency response initiated. AI
              Triage suggests immediate cardiovascular assessment.
            </p>

            <div className="space-y-4">
              {["Cardiac Load: 184% Elevation", "Neural Resonance: UNSTABLE", "Oxygen Saturation: 89% Warning"].map(
                (alert, i) => (
                  <motion.div
                    key={alert}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{
                      x: 0,
                      opacity: calmingMode ? 0.45 : 1,
                      borderColor: calmingMode ? "rgba(255,34,68,0.06)" : "rgba(255,34,68,0.1)",
                    }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-v-red/5 border"
                  >
                    <motion.div
                      animate={{ opacity: calmingMode ? 0.35 : 1 }}
                      className={`w-2 h-2 rounded-full bg-v-red shrink-0 ${!calmingMode ? "animate-pulse" : ""}`}
                    />
                    <span className="text-xs font-mono text-v-red uppercase tracking-widest">{alert}</span>
                  </motion.div>
                )
              )}
            </div>
          </div>

          <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.a
              href="tel:911"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-10 rounded-[40px] bg-v-red text-white flex flex-col items-center justify-center text-center gap-4 shadow-2xl no-underline"
            >
              <PhoneCall size={32} className="animate-pulse" />
              <span className="text-sm font-bold tracking-widest uppercase">Contact_Clinician</span>
              <span className="text-[9px] font-mono opacity-70 tracking-widest">Opens device dialer · demo</span>
            </motion.a>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleCalming}
              className={`p-10 rounded-[40px] flex flex-col items-center justify-center text-center gap-4 border transition-colors ${
                calmingMode
                  ? "bg-v-cyan/10 border-v-cyan/40 text-v-cyan"
                  : "glass border-v-red/20 text-v-red"
              }`}
            >
              <Zap size={32} />
              <span className="text-sm font-bold tracking-widest uppercase">Admin_Calm_Vapor</span>
              <span className="text-[9px] font-mono opacity-70 tracking-widest uppercase">
                {calmingMode ? "Tap to end calming" : "Guided breath sync"}
              </span>
            </motion.button>

            <div className="sm:col-span-2 glass rounded-[40px] p-8 border-white/5 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Bell className="text-v-red" size={20} />
                  <span className="text-[10px] font-mono text-v-muted uppercase">V_CORE_Recommendation</span>
                </div>
                <ChevronRight className="text-white/20" size={16} />
              </div>
              <p className="text-sm font-light leading-relaxed">
                Initiating deep sensory override. Please synchronize your breathing with the visual pulse until
                emergency units arrive at your location.
              </p>
              <div className="mt-6 h-1 w-full bg-v-red/10 rounded-full overflow-hidden">
                <motion.div
                  key={progressSession}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: PROGRESS_DURATION_S, ease: "linear" }}
                  onAnimationComplete={onProgressAnimationComplete}
                  className="h-full bg-v-red"
                />
              </div>
              {progressComplete && (
                <p className="mt-3 text-[10px] font-mono text-v-emerald uppercase tracking-widest">
                  Sync channel stable · escalation active
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full scanline opacity-20 pointer-events-none" />
      </motion.div>

      <AnimatePresence>
        {showEscalation && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="escalation-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="relative w-full max-w-lg rounded-[40px] border border-v-red/30 bg-[#0a0508]/95 p-10 shadow-[0_0_80px_rgba(255,34,68,0.25)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,34,68,0.12),transparent_55%)] pointer-events-none" />

              <h3 id="escalation-title" className="relative text-lg font-black uppercase italic tracking-tight mb-6">
                Neural <span className="text-v-red not-italic">Escalation</span>
              </h3>

              <div className="relative space-y-4 min-h-[140px]">
                {ESCALATION_LINES.map((line, idx) => (
                  <motion.p
                    key={line}
                    initial={false}
                    animate={{
                      opacity: idx <= escalationStep ? 1 : 0.2,
                      x: idx === escalationStep ? 0 : idx < escalationStep ? 0 : 8,
                    }}
                    className={`text-sm font-light leading-relaxed ${
                      idx === escalationStep ? "text-v-text" : "text-v-muted"
                    }`}
                  >
                    {idx <= escalationStep ? "› " : ""}
                    {line}
                  </motion.p>
                ))}
              </div>

              <div className="relative mt-8 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-start gap-2 text-xs text-v-muted font-mono">
                  <MapPin className="w-4 h-4 text-v-cyan shrink-0 mt-0.5" />
                  <div>
                    {geoState === "requesting" && <p>Requesting location lock…</p>}
                    {geoState === "ready" && coords && (
                      <p>
                        Secure lock · approx{" "}
                        <span className="text-v-cyan">
                          {formatCoord(coords.lat)}°, {formatCoord(coords.lng)}°
                        </span>
                      </p>
                    )}
                    {(geoState === "denied" || geoState === "timeout") && (
                      <p>Unable to access live coordinates.</p>
                    )}
                    {geoState === "unsupported" && <p>Geolocation unavailable in this environment.</p>}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {escalationLocked && (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative mt-8 space-y-6"
                  >
                    <div className="flex items-center gap-3 text-v-emerald">
                      <ShieldCheck className="w-8 h-8" />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide">Dispatch channel locked</p>
                        <p className="text-xs text-v-muted font-mono mt-1">
                          Simulated response ETA:{" "}
                          <span className="text-v-cyan">{etaMinutes ?? "—"} min</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-v-muted uppercase tracking-widest">
                      <Radio className="w-4 h-4 text-v-cyan animate-pulse" />
                      Pulse stabilization active
                    </div>
                    <motion.div
                      className="absolute -inset-4 rounded-[48px] border border-v-cyan/20 pointer-events-none"
                      animate={{ opacity: [0.2, 0.55, 0.2], scale: [1, 1.02, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="flex flex-col sm:flex-row gap-3 relative z-[1]">
                      <button
                        type="button"
                        onClick={cancelEscalation}
                        className="flex-1 py-3 rounded-2xl border border-white/15 text-xs font-mono uppercase tracking-widest hover:bg-white/5"
                      >
                        Cancel emergency escalation
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl bg-v-cyan text-v-bg text-xs font-bold uppercase tracking-widest"
                      >
                        Close overlay
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
