import { useState, useEffect, useRef, Suspense, Component, lazy, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowUpRight, BarChart3, Shield, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const Hero3D = lazy(() => import("../components/Hero3D"));

class Hero3DErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

const TICKER_ITEMS = [
  { label: "US Elections 2024", vol: "$209M", change: "+12.4%", up: true },
  { label: "Bitcoin > $100K",   vol: "$89M",  change: "+5.2%",  up: true },
  { label: "Fed Rate Cut",       vol: "$45M",  change: "-3.1%",  up: false },
  { label: "Super Bowl Winner",  vol: "$34M",  change: "+8.7%",  up: true },
  { label: "GPT-5 Release",      vol: "$28M",  change: "+22.3%", up: true },
  { label: "Recession in 2025",  vol: "$67M",  change: "-1.8%",  up: false },
  { label: "Trump Win",          vol: "$312M", change: "+4.1%",  up: true },
  { label: "Oil > $100",         vol: "$19M",  change: "-7.2%",  up: false },
];

const FEATURES = [
  { icon: BarChart3,  title: "Real-Time Analytics",  description: "Track every position, P&L swing, and market movement the instant it happens." },
  { icon: Shield,     title: "Oracle Intelligence",   description: "AI-powered signals that surface winning positions before the crowd catches on." },
  { icon: TrendingUp, title: "Portfolio Insights",    description: "Deep analytics on your win rate, volume, and performance trends over time." },
  { icon: Zap,        title: "Instant Access",        description: "No wallet, no signup. Just open the app and see everything instantly." },
];

/* ─── reusable style tokens ───────────────────────────────────────────────── */
const METALLIC_BORDER_CARD = {
  background: "linear-gradient(#0a0a0a, #0a0a0a) padding-box, linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.12) 100%) border-box",
  border: "1px solid transparent",
} as const;

const PLAY_SVG = (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.18 23.76c.35.19.76.19 1.12 0l10.64-6.13-2.37-2.37L3.18 23.76zM.49 1.48C.18 1.84 0 2.38 0 3.07v17.86c0 .69.18 1.23.49 1.59l.08.08 10-10v-.24L.57 1.4l-.08.08zM20.49 10.13l-2.87-1.66-2.66 2.66 2.66 2.66 2.88-1.66c.82-.47.82-1.24-.01-1.7v.7zM4.3.24L14.94 6.37l-2.37 2.37L3.18.24C3.54.05 3.95.05 4.3.24z" />
  </svg>
);

export default function Home() {
  const stat1 = useCounter(2400000);
  const stat2 = useCounter(89);
  const stat3 = useCounter(312);

  return (
    <div className="bg-[#080808] text-white overflow-x-hidden selection:bg-white selection:text-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center overflow-hidden">

        {/* ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,169,110,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(201,169,110,0.04) 0%, transparent 70%)" }} />

        {/* 3D coins */}
        <Hero3DErrorBoundary>
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </Hero3DErrorBoundary>

        <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto">

          {/* pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
            style={{ ...METALLIC_BORDER_CARD, background: "linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.1) 100%) border-box" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-zinc-400 tracking-widest uppercase">Now on Google Play</span>
          </motion.div>

          {/* headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="text-white mb-5 leading-[1.04]"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontWeight: 800, letterSpacing: "-0.035em" }}
          >
            Your Gateway to<br />
            <span style={{ background: "linear-gradient(135deg, #e8d5a3 0%, #c9a96e 40%, #a87c3e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Smarter Markets.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-zinc-500 text-lg max-w-md mx-auto mb-10 leading-relaxed font-light"
          >
            Trade, win, and rise — with real-time prediction market analytics in your pocket.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            {/* primary — white */}
            <a
              href="https://play.google.com/store/apps/details?id=com.polyfield.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-2xl font-semibold text-sm text-black bg-white hover:bg-zinc-100 active:scale-[0.98] transition-all duration-150"
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 16px 48px rgba(0,0,0,0.5)" }}
            >
              {PLAY_SVG}
              Get Started on Google Play
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </motion.div>

          {/* trust pill */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-xs text-zinc-700 font-mono mt-6 tracking-wider"
          >
            FREE · NO WALLET · NO SIGN-UP
          </motion.p>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <div ref={stat1.ref} className="py-12 px-6"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.008) 100%)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3">
          {[
            { ref: stat1.ref as React.RefObject<HTMLDivElement>, val: `$${(stat1.count / 1_000_000).toFixed(1)}M+`, label: "Volume Tracked" },
            { ref: stat2.ref as React.RefObject<HTMLDivElement>, val: `${stat2.count}%`,                             label: "Accuracy Rate" },
            { ref: stat3.ref as React.RefObject<HTMLDivElement>, val: `$${stat3.count}M+`,                          label: "Active Markets" },
          ].map((s, i) => (
            <div key={i} ref={s.ref} className="text-center py-6 px-4 rounded-2xl" style={METALLIC_BORDER_CARD}>
              <div className="text-2xl sm:text-3xl font-bold tabular-nums mb-1"
                style={{ background: "linear-gradient(135deg, #fff 0%, #a0a0a0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.val}
              </div>
              <div className="text-[10px] text-zinc-600 tracking-widest uppercase font-mono">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TICKER ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden py-3.5"
        style={{ background: "#060606", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #060606, transparent)" }} />
        <div className="absolute right-0 top-0 h-full w-20 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #060606, transparent)" }} />
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 42s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((m, i) => (
            <div key={i} className="inline-flex items-center gap-4 px-8 shrink-0">
              <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
              <span className="text-zinc-500 text-xs font-mono">{m.label}</span>
              <span className="text-zinc-300 text-xs font-mono font-semibold">{m.vol}</span>
              <span className="text-xs font-mono font-semibold" style={{ color: m.up ? "#86efac" : "#f87171" }}>{m.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── APP SHOWCASE ─────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(201,169,110,0.04) 0%, transparent 70%)" }} />

        {/* section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center px-6 mb-16"
        >
          <p className="text-[11px] font-mono tracking-widest uppercase mb-5" style={{ color: "#c9a96e" }}>Mobile App</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
            Your entire trading edge,<br />always with you.
          </h2>
          <p className="text-zinc-500 leading-relaxed max-w-sm mx-auto mb-8">
            Real-time P&L tracking, smart signals, and deep analytics — beautifully optimised for mobile.
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.polyfield.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl text-sm font-semibold text-zinc-200 hover:text-white active:scale-[0.98] transition-all duration-150"
            style={{ ...METALLIC_BORDER_CARD, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
          >
            {PLAY_SVG}
            Get it on Google Play
          </a>
        </motion.div>

        {/* scrolling screenshot strip */}
        <div className="relative">
          <div className="absolute left-0 top-0 h-full w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, #080808, transparent)" }} />
          <div className="absolute right-0 top-0 h-full w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, #080808, transparent)" }} />
          <div className="flex gap-5 whitespace-nowrap" style={{ animation: "screensScroll 40s linear infinite" }}>
            {[...Array(2)].map((_, setIdx) => (
              [1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={`${setIdx}-${n}`}
                  className="inline-block shrink-0 rounded-3xl overflow-hidden relative"
                  style={{
                    width: 220,
                    height: 440,
                    boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
                    background: "linear-gradient(135deg, #111 0%, #0d0d0d 100%)",
                  }}
                >
                  {/* shimmer skeleton shown while loading */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                    <div style={{ animation: "shimmer 1.8s infinite", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)", backgroundSize: "200% 100%", height: "100%" }} />
                  </div>
                  <img
                    src={`/screenshots/screen-${n}.png`}
                    alt={`App screenshot ${n}`}
                    className="w-full h-full object-cover block relative"
                    style={{ zIndex: 1 }}
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                </div>
              ))
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <p className="text-[11px] font-mono tracking-widest uppercase mb-4" style={{ color: "#c9a96e" }}>Features</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Everything you need,<br />nothing you don't.
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-6 rounded-2xl group cursor-default transition-all duration-300 hover:-translate-y-1"
                style={{ ...METALLIC_BORDER_CARD, boxShadow: "0 2px 24px rgba(0,0,0,0.3)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))", border: "1px solid rgba(201,169,110,0.2)" }}
                >
                  <f.icon className="w-4 h-4" style={{ color: "#c9a96e" }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(201,169,110,0.06) 0%, transparent 70%)" }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto text-center relative z-10"
        >
          <p className="text-[11px] font-mono tracking-widest uppercase mb-6" style={{ color: "#c9a96e" }}>Get Started Free</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
            Start trading smarter<br />today.
          </h2>
          <p className="text-zinc-500 leading-relaxed mb-10 max-w-sm mx-auto">
            Download the app — no wallet, no signup, instant access to every market.
          </p>

          <a
            href="https://play.google.com/store/apps/details?id=com.polyfield.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-2xl font-semibold text-sm text-black bg-white hover:bg-zinc-100 active:scale-[0.98] transition-all duration-150"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6)" }}
          >
            {PLAY_SVG}
            Download on Google Play
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          <p className="text-xs text-zinc-700 font-mono mt-6 tracking-wider">FREE · NO WALLET · NO LOGIN</p>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/polyfield-logo.png" alt="PolyField" className="w-5 h-5 object-contain opacity-60" />
            <span className="text-sm font-bold tracking-tight">
              <span className="text-white">POLY</span><span className="text-zinc-700">FIELD</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy">
              <span className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer font-mono">Privacy</span>
            </Link>
            <Link href="/terms">
              <span className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer font-mono">Terms</span>
            </Link>
            <span className="text-xs text-zinc-800 font-mono">v2.0.4</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes screensScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
