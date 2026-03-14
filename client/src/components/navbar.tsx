import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";

interface SubItem {
    label: string;
    href: string;
}

interface NavItem {
    id: string;
    label: string;
    href: string;
    hasDropdown?: boolean;
    subItems?: SubItem[];
}

const navItems: NavItem[] = [
    { id: "01", label: "Home", href: "/" },
];

export function Navbar() {
    const [location, setLocation] = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [containerReady, setContainerReady] = useState(false);
    const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const isClickingDropdown = useRef(false);

    const activeItem = useMemo(() => {
        const found = navItems.find(item =>
            item.subItems
                ? item.subItems.some(s => s.href === location)
                : item.href === location
        );
        return found?.id ?? "01";
    }, [location]);

    useEffect(() => {
        if (!openDropdown) return;
        function handleOutside(e: MouseEvent) {
            if (isClickingDropdown.current) { isClickingDropdown.current = false; return; }
            let inside = false;
            dropdownRefs.current.forEach(ref => { if (ref?.contains(e.target as Node)) inside = true; });
            if (!inside) setOpenDropdown(null);
        }
        document.addEventListener("click", handleOutside);
        return () => document.removeEventListener("click", handleOutside);
    }, [openDropdown]);

    useEffect(() => { setOpenDropdown(null); setMobileOpen(false); }, [location]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        let container = document.getElementById("navbar-root");
        if (!container) {
            container = document.createElement("div");
            container.id = "navbar-root";
            const root = document.getElementById("root");
            document.body.insertBefore(container, root ?? document.body.firstChild);
        }
        setContainerReady(true);
    }, []);

    const navbarContent = (
        <nav
            data-navbar="fixed"
            className="navbar-fixed w-full border-b border-white/[0.07] bg-[#0c0c0c]/95 backdrop-blur-md"
        >
            <div className="max-w-6xl mx-auto px-5 sm:px-6">
                <div className="flex items-center justify-between h-14">

                    {/* Brand */}
                    <Link href="/">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <img src="/polyfield-logo.png" alt="PolyField" className="w-6 h-6 object-contain opacity-80" />
                            <span className="text-sm font-bold tracking-tight">
                                <span className="text-white">POLY</span><span className="text-zinc-600">FIELD</span>
                            </span>
                        </div>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map(item => (
                            <div
                                key={item.id}
                                className="relative"
                                ref={el => {
                                    if (el && item.hasDropdown) dropdownRefs.current.set(item.id, el);
                                    else if (!el) dropdownRefs.current.delete(item.id);
                                }}
                            >
                                {item.hasDropdown && item.subItems ? (
                                    <>
                                        <button
                                            onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === item.id ? null : item.id); }}
                                            className={`flex items-center gap-1 px-3.5 py-2 rounded-md text-sm transition-colors duration-150 ${
                                                activeItem === item.id
                                                    ? "text-white"
                                                    : "text-zinc-500 hover:text-zinc-200"
                                            }`}
                                        >
                                            {item.label}
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${openDropdown === item.id ? "rotate-180" : ""}`} />
                                        </button>

                                        {openDropdown === item.id && (
                                            <div
                                                className="absolute top-full left-0 mt-1.5 w-44 rounded-lg border border-white/[0.08] bg-[#111] overflow-hidden z-50"
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {item.subItems.map((sub, idx) => (
                                                    <button
                                                        key={idx}
                                                        onMouseDown={() => { isClickingDropdown.current = true; }}
                                                        onClick={() => { isClickingDropdown.current = false; setLocation(sub.href); setOpenDropdown(null); }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                                                            location === sub.href
                                                                ? "text-white bg-white/[0.04]"
                                                                : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                                                        }`}
                                                    >
                                                        {sub.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link href={item.href}>
                                        <span className={`flex items-center px-3.5 py-2 rounded-md text-sm transition-colors duration-150 cursor-pointer ${
                                            activeItem === item.id
                                                ? "text-white"
                                                : "text-zinc-500 hover:text-zinc-200"
                                        }`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right: Privacy/Terms links + mobile toggle */}
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-1">
                            <Link href="/privacy">
                                <span className={`px-3 py-2 rounded-md text-xs transition-colors duration-150 cursor-pointer ${location === "/privacy" ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
                                    Privacy
                                </span>
                            </Link>
                            <Link href="/terms">
                                <span className={`px-3 py-2 rounded-md text-xs transition-colors duration-150 cursor-pointer ${location === "/terms" ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
                                    Terms
                                </span>
                            </Link>
                        </div>
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-1.5 rounded-md text-zinc-500 hover:text-white transition-colors"
                        >
                            {mobileOpen ? <X className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden border-t border-white/[0.07] py-2">
                        {navItems.map(item => (
                            <div key={item.id}>
                                {item.hasDropdown && item.subItems ? (
                                    <>
                                        <button
                                            onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-500 hover:text-white transition-colors"
                                        >
                                            {item.label}
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === item.id ? "rotate-180" : ""}`} />
                                        </button>
                                        {openDropdown === item.id && (
                                            <div className="pl-4 border-l border-white/[0.07] ml-3 mb-1">
                                                {item.subItems.map((sub, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => { setLocation(sub.href); setMobileOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                                            location === sub.href ? "text-white" : "text-zinc-500 hover:text-white"
                                                        }`}
                                                    >
                                                        {sub.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link href={item.href}>
                                        <span className={`block px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                                            activeItem === item.id ? "text-white" : "text-zinc-500 hover:text-white"
                                        }`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ))}
                        <div className="border-t border-white/[0.05] mt-1 pt-1 flex gap-1">
                            <Link href="/privacy">
                                <span className={`block px-3 py-2 text-xs transition-colors cursor-pointer ${location === "/privacy" ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
                                    Privacy
                                </span>
                            </Link>
                            <Link href="/terms">
                                <span className={`block px-3 py-2 text-xs transition-colors cursor-pointer ${location === "/terms" ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
                                    Terms
                                </span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );

    if (typeof document === "undefined") return null;
    if (containerReady) {
        const container = document.getElementById("navbar-root");
        if (container) return createPortal(navbarContent, container);
    }
    return navbarContent;
}
