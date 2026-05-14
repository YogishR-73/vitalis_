"use client";

import { motion } from "framer-motion";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Activity, Heart, Thermometer, Droplets, Zap, ShieldAlert } from "lucide-react";

const data = Array.from({ length: 20 }).map((_, i) => ({
  time: i,
  heartRate: 65 + Math.random() * 20,
  oxygen: 95 + Math.random() * 5,
  stress: 20 + Math.random() * 40,
}));

export default function HealthDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Real-time Monitor */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 glass rounded-[32px] p-8 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold italic tracking-tight">NEURAL_TELEMETRY</h3>
            <p className="text-xs font-mono text-v-muted">SYNC_STATUS: ENCRYPTED_LINK_ACTIVE</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse" />
                <span className="text-[10px] font-mono uppercase">Live_Stream</span>
             </div>
             <ShieldAlert className="w-5 h-5 text-v-cyan opacity-50" />
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip 
                contentStyle={{ background: '#020408', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                itemStyle={{ color: '#00d4ff' }}
              />
              <Area 
                type="monotone" 
                dataKey="heartRate" 
                stroke="#00d4ff" 
                fillOpacity={1} 
                fill="url(#colorHr)" 
                strokeWidth={2}
                animationDuration={2000}
              />
              <Area 
                type="monotone" 
                dataKey="oxygen" 
                stroke="#00ff88" 
                fillOpacity={0.1} 
                fill="#00ff88" 
                strokeWidth={2}
                animationDuration={2500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-v-cyan/5 blur-[60px]" />
      </motion.div>

      {/* Side Stats */}
      <div className="space-y-6">
        {[
          { label: "AI_HEALTH_SCORE", value: "98.4", unit: "P_INDEX", icon: Zap, color: "text-v-cyan" },
          { label: "STRESS_LOAD", value: "24", unit: "%_NOMINAL", icon: Activity, color: "text-v-emerald" },
          { label: "RECOVERY_PROJ", value: "8H 42M", unit: "ESTIMATED", icon: Droplets, color: "text-v-blue" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-[24px] p-6 flex items-center justify-between group hover:bg-v-cyan/[0.03] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-v-muted uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-black italic">{stat.value}</h4>
                  <span className="text-[8px] font-mono text-v-muted">{stat.unit}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Heart Rate Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="glass-cyan rounded-[32px] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <Heart className="text-v-red animate-heartbeat mb-4" size={40} />
          <h4 className="text-4xl font-black italic mb-1">72</h4>
          <p className="text-xs font-mono text-v-cyan tracking-[0.4em] uppercase">BPM_NOMINAL</p>
          <div className="absolute inset-0 bg-v-red/5 animate-pulse pointer-events-none" />
        </motion.div>
      </div>
    </div>
  );
}
