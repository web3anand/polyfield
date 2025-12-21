import { Globe3D } from "@/components/globe-3d";
import { Globe } from "lucide-react";

export default function OracleBot() {
  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative" style={{ imageRendering: 'pixelated' }}>
      {/* Cyberpunk Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black border-2 border-white" style={{ imageRendering: 'pixelated', boxShadow: '2px 2px 0px #ffffff' }}>
              <Globe className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-mono uppercase" style={{ letterSpacing: '3px' }}>
                POLYMARKET GLOBE
              </h1>
              <p className="text-xs md:text-sm text-white uppercase tracking-wider font-mono" style={{ letterSpacing: '1px' }}>
                LIVE GLOBAL ACTIVITY • VERIFIED ACCOUNTS & LIVE BETS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Globe */}
      <div className="h-full w-full pt-16 md:pt-20 bg-black">
        <Globe3D height="100%" width="100%" />
      </div>
    </div>
  );
}
