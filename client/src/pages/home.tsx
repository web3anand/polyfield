import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, ArrowUpRight } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#bef202] selection:text-black flex items-center justify-center p-4 lg:p-8 overflow-hidden">

            {/* Background Grain Animation */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-overlay">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-50"></div>
            </div>

            {/* Main Container - Visual styles removed, minimal layout only */}
            <div className="w-full max-w-[1600px] relative min-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-1000">

                <div className="flex-1 grid lg:grid-cols-2 gap-0 relative">

                    {/* Left Column: Content */}
                    <div className="p-12 lg:p-24 flex flex-col justify-center relative z-10">

                        {/* Animated Badge - 12px rounded */}
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-lg hover:bg-white/[0.05] transition-colors cursor-default">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#bef202] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#bef202]"></span>
                                </span>
                                <span className="text-[10px] font-mono text-[#bef202] tracking-widest uppercase">SYSTEM_ONLINE // V2.0</span>
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tighter leading-[0.9] mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            Master the <br />
                            <span className="text-zinc-500 relative">
                                Prediction
                                <span className="absolute -bottom-2 left-0 w-full h-1 bg-[#bef202]/30 blur-sm"></span>
                            </span> <br />
                            Economy.
                        </h1>

                        <p className="text-xl text-zinc-400 mb-12 max-w-lg leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                            Take control of your portfolio with the ultimate analytics dashboard.
                            Real-time data that cuts through the noise.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                            <Link href="/dashboard">
                                <Button className="h-16 px-10 rounded-[12px] bg-[#bef202] text-black text-sm font-bold tracking-widest hover:bg-[#d4ff33] transition-all transform hover:-translate-y-1 shadow-[0_10px_30px_-10px_rgba(190,242,2,0.3)] active:scale-95 group border border-transparent hover:border-[#bef202]">
                                    INITIALIZE
                                    <ArrowUpRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-all" />
                                </Button>
                            </Link>

                            <Link href="/oracle">
                                <Button variant="ghost" className="h-16 px-10 rounded-[12px] text-zinc-300 text-sm font-medium hover:bg-white/[0.05] border border-white/10 gap-3 group backdrop-blur-md transition-all hover:border-white/20 hover:text-white">
                                    <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <Play className="w-3 h-3 fill-current ml-0.5" />
                                    </div>
                                    WATCH_DEMO
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Visuals */}
                    <div className="relative overflow-hidden min-h-[500px] lg:min-h-auto flex items-center justify-center p-8 lg:p-0">
                        {/* Glass Background Panel for Right Side */}
                        <div className="absolute inset-4 lg:inset-12 bg-white/[0.01] rounded-[24px] border border-white/5 backdrop-blur-sm -z-10"></div>

                        {/* Blob Effect - Toned down for 'cleaner' look */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] bg-[#bef202] aspect-square rounded-full blur-[120px] opacity-20 animate-pulse-slow pointer-events-none" />

                        {/* Main Mockup Container */}
                        <div className="relative z-10 transform translate-x-8 lg:translate-x-0 group perspective-[2000px]">

                            {/* Reflection / Glow behind phones */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#bef202]/10 to-transparent blur-3xl -z-10"></div>

                            {/* Back Phone (Ghost) - Showing Portfolio */}
                            <div className="absolute top-[-30px] right-[-90px] w-[280px] md:w-[320px] h-[600px] bg-[#050505] rounded-[32px] border border-zinc-800 shadow-2xl opacity-40 grayscale-[20%] group-hover:grayscale-0 transform rotate-12 translate-z-[-50px] transition-all duration-700 group-hover:translate-x-8 group-hover:rotate-[15deg] overflow-hidden hidden lg:block ring-1 ring-white/10">
                                <img
                                    src="/screenshot-portfolio.png"
                                    alt="Portfolio Interface"
                                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                                />
                            </div>

                            {/* Front Phone (Hero) - Showing Market */}
                            <div className="relative w-[300px] md:w-[340px] h-[640px] bg-black rounded-[32px] border-[4px] border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden transform -rotate-3 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-[1.01] ring-1 ring-white/10">
                                {/* Simple Notch Area */}
                                <div className="absolute top-0 w-full h-6 bg-black z-30 flex justify-center">
                                    <div className="w-16 h-4 bg-zinc-900 rounded-b-md"></div>
                                </div>

                                {/* Screen Content - Actual Screenshot */}
                                <div className="w-full h-full bg-[#090909] overflow-hidden relative">
                                    <img
                                        src="/screenshot-market.png"
                                        alt="Market Interface"
                                        className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.9]"
                                    />

                                    {/* Illiquid Glass Gloss Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none z-20 mix-blend-overlay" />
                                    <div className="absolute -left-[100%] top-[-100%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/[0.03] to-transparent rotate-45 pointer-events-none" />
                                </div>
                            </div>

                            {/* Floating Element - Category Pill - 12px Rounded Glass */}
                            <div className="absolute -bottom-8 -left-12 bg-black/60 border border-white/10 p-3 rounded-[12px] shadow-2xl backdrop-blur-xl animate-float-delayed hidden lg:flex items-center gap-4 z-30 ring-1 ring-white/5">
                                <div className="w-12 h-12 rounded-[8px] overflow-hidden relative group-hover:scale-110 transition-transform duration-500 shadow-md">
                                    <img src="/screenshot-category.png" className="w-full h-full object-cover" alt="Category" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                </div>
                                <div className="pr-4">
                                    <div className="text-white font-mono text-xs uppercase tracking-wider mb-0.5">US Elections</div>
                                    <div className="text-[#bef202] text-[10px] font-mono tracking-widest">$209M VOL</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Footer Links (Outside the card) */}
            <div className="fixed bottom-4 left-0 w-full text-center text-[10px] text-zinc-600 pointer-events-none flex justify-center gap-4 font-mono tracking-widest opacity-50">
                <span>SCROLL TO EXPLORE</span>
                <span>//</span>
                <span>v2.0.4</span>
            </div>
        </div>
    );
}
