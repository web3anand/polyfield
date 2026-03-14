import { Link } from "wouter";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0c0c0c] text-white flex items-center justify-center px-6 pt-14">
            <div className="text-center">
                <p className="text-[11px] font-mono text-zinc-600 tracking-widest uppercase mb-4">Error 404</p>
                <h1 className="text-5xl font-bold tracking-tight mb-4">Page not found</h1>
                <p className="text-zinc-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link href="/">
                    <button className="h-10 px-6 rounded-lg bg-[#bef202] text-black text-sm font-bold tracking-wide hover:opacity-90 transition-opacity">
                        Back to Home
                    </button>
                </Link>
            </div>
        </div>
    );
}
