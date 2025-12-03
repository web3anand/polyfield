import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, AlignJustify, X } from "lucide-react";
import { Link, useLocation } from "wouter";

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
  hasDropdown?: boolean;
  subItems?: SubItem[];
}

const navItems: NavItem[] = [
  { id: "01", label: "TRACKER", href: "/", isActive: false },
  { 
    id: "02", 
    label: "SCANNER", 
    href: "/scanner/whales", 
    isActive: false,
    hasDropdown: true,
    subItems: [
      { label: "Whales Hub", href: "/scanner/whales" },
      { label: "Micro Edge Scanner", href: "/scanner/micro-edge" }
    ]
  },
  { id: "03", label: "INSIDOOR", href: "/oracle", isActive: false },
  { 
    id: "04", 
    label: "LEADERBOARD", 
    href: "/leaderboard/builders", 
    isActive: false, 
    hasDropdown: true,
    subItems: [
      { label: "Builders", href: "/leaderboard/builders" },
      { label: "Users", href: "/leaderboard/users" }
    ]
  },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const navRef = useRef<HTMLElement | null>(null);
  const isClickingDropdown = useRef<boolean>(false);

  // Memoize active item calculation to prevent unnecessary re-renders
  const activeItem = useMemo(() => {
    const found = navItems.find(item => {
      if (item.subItems) {
        return item.subItems.some(sub => sub.href === location);
      }
      return item.href === location;
    });
    return found?.id || "01";
  }, [location]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return;
    
    function handleClickOutside(event: MouseEvent) {
      // Don't close if we're in the process of clicking a dropdown item
      if (isClickingDropdown.current) {
        isClickingDropdown.current = false;
        return;
      }
      
      const target = event.target as HTMLElement;
      
      // Check if click is inside any dropdown
      let clickedInside = false;
      dropdownRefs.current.forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedInside = true;
        }
      });
      
      if (!clickedInside) {
        setOpenDropdown(null);
      }
    }
    
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openDropdown]);

  // Close dropdown when location changes
  useEffect(() => {
    setOpenDropdown(null);
  }, [location]);

  // Create navbar container for portal
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Get or create container div (only create if it doesn't exist)
    let container = document.getElementById('navbar-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'navbar-root';
      
      // Insert at the very beginning of body, before #root
      const rootElement = document.getElementById('root');
      if (rootElement) {
        document.body.insertBefore(container, rootElement);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    // Mark container as ready
    setContainerReady(true);

    // No cleanup needed - let the container persist
    // React's portal will handle adding/removing children naturally
    return () => {
      // Don't remove container - it will be reused on re-renders
      // Removing it causes React portal cleanup errors
    };
  }, []);

  const handleItemClick = (itemId: string) => {
    setClickedItem(itemId);
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
    setTimeout(() => {
      setClickedItem(null);
    }, 600);
  };

  const navbarContent = (
    <nav 
      data-navbar="fixed"
      className="navbar-fixed w-full bg-black/95 backdrop-blur-md border-b border-gray-800/50 shadow-lg"
      ref={(el) => {
        if (el) {
          navRef.current = el;
          // CSS handles positioning via index.css and index.html styles
          // No manual style manipulation needed
        }
      }}
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center h-12 md:h-16 relative">
          {/* POLYFEILD BETA Brand - Fixed Left */}
          <div className="absolute left-2 md:left-4 flex items-center gap-1.5 md:gap-3">
            <h2 className="text-sm md:text-lg lg:text-xl tracking-tight">
              <span className="poly-scramble text-green-400 drop-shadow-lg">POLY</span>
              <span className="field-scramble text-gray-300">FIELD</span>
            </h2>
            <span className="text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-0.5 md:py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/40 rounded-md shadow-sm">
              BETA
            </span>
          </div>
          
          {/* Desktop Navigation Items - Centered */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <div 
                key={item.id} 
                className="relative" 
                ref={(el) => {
                  if (el && item.hasDropdown) {
                    dropdownRefs.current.set(item.id, el);
                  } else if (!el && item.hasDropdown) {
                    dropdownRefs.current.delete(item.id);
                  }
                }}
              >
                    {item.hasDropdown && item.subItems ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === item.id ? null : item.id);
                          }}
                          className={`
                            relative flex items-center justify-center space-x-2 px-4 py-2 text-sm font-mono
                            min-w-[120px] h-10 transition-all duration-200 group
                            ${
                              activeItem === item.id
                                ? "text-white"
                                : "text-gray-400 hover:text-white"
                            }
                          `}
                        >
                      <span className="text-gray-500">[{item.id}]</span>
                      <span className="text-gray-500">//</span>
                      <span className="uppercase tracking-wide">{item.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-200 ${openDropdown === item.id ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      
                      {/* Animated underline */}
                      <div 
                        className={`
                          absolute bottom-0 left-0 h-0.5 bg-white transition-all duration-300 ease-out
                          ${
                            activeItem === item.id 
                              ? "w-full opacity-100" 
                              : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
                          }
                        `}
                      />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openDropdown === item.id && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-56 bg-gradient-to-br from-black to-gray-950 border border-gray-800/50 shadow-2xl rounded-lg backdrop-blur-sm z-[100] overflow-hidden"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.subItems.map((subItem, idx) => {
                          return (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                isClickingDropdown.current = true;
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                isClickingDropdown.current = false;
                                console.log('Clicking submenu item:', subItem.label, subItem.href);
                                setLocation(subItem.href);
                                handleItemClick(item.id);
                                setOpenDropdown(null);
                              }}
                              className={`
                                w-full text-left block px-4 py-3 text-sm font-mono transition-colors cursor-pointer
                                ${
                                  location === subItem.href
                                    ? "text-white bg-gray-800"
                                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                                }
                              `}
                            >
                              {subItem.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      relative flex items-center justify-center space-x-2 px-4 py-2 text-sm font-mono
                      min-w-[120px] h-10 transition-all duration-200 group
                      ${
                        activeItem === item.id
                          ? "text-white"
                          : "text-gray-400 hover:text-white"
                      }
                    `}
                  >
                    <span className="text-gray-500">[{item.id}]</span>
                    <span className="text-gray-500">//</span>
                    <span className="uppercase tracking-wide">{item.label}</span>
                    {item.hasDropdown && (
                      <ChevronDown className="w-3.5 h-3.5 ml-1" strokeWidth={2.5} />
                    )}
                    
                    {/* Animated underline */}
                    <div 
                      className={`
                        absolute bottom-0 left-0 h-0.5 bg-white transition-all duration-300 ease-out
                        ${
                          clickedItem === item.id 
                            ? "w-full opacity-100" 
                            : activeItem === item.id 
                              ? "w-full opacity-100" 
                              : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
                        }
                      `}
                    />
                  </Link>
                )}
              </div>
            ))}
          </div>
          
          {/* Mobile Menu Button - Fixed Right */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="absolute right-2 md:right-4 md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" strokeWidth={2.5} />
            ) : (
              <AlignJustify className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-black">
            <div className="px-1 pt-1 pb-2 space-y-0.5">
              {navItems.map((item) => (
                <div key={item.id}>
                  {item.hasDropdown && item.subItems ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === item.id ? null : item.id);
                        }}
                        className={`
                          w-full flex items-center justify-between space-x-1.5 md:space-x-2 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono
                          transition-all duration-200
                          ${
                            activeItem === item.id
                              ? "text-white bg-gray-800"
                              : "text-gray-400 hover:text-white hover:bg-gray-900"
                          }
                        `}
                      >
                        <div className="flex items-center space-x-1 md:space-x-2">
                          <span className="text-gray-500">[{item.id}]</span>
                          <span className="text-gray-500">//</span>
                          <span className="uppercase tracking-wide">{item.label}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === item.id ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      </button>
                      
                      {openDropdown === item.id && (
                        <div className="ml-3 md:ml-4 border-l border-gray-800">
                          {item.subItems.map((subItem, idx) => {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setLocation(subItem.href);
                                  handleItemClick(item.id);
                                  setIsMobileMenuOpen(false);
                                  setOpenDropdown(null);
                                }}
                                className={`
                                  w-full text-left block px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-mono cursor-pointer
                                  ${
                                    location === subItem.href
                                      ? "text-white bg-gray-900"
                                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                                  }
                                `}
                              >
                                {subItem.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        w-full flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono
                        transition-all duration-200 group relative
                        ${
                          activeItem === item.id
                            ? "text-white bg-gray-800"
                            : "text-gray-400 hover:text-white hover:bg-gray-900"
                        }
                      `}
                    >
                      <span className="text-gray-500">[{item.id}]</span>
                      <span className="text-gray-500">//</span>
                      <span className="uppercase tracking-wide">{item.label}</span>
                      {item.hasDropdown && (
                        <ChevronDown className="w-3.5 h-3.5 ml-1" strokeWidth={2.5} />
                      )}
                      
                      {/* Animated underline for mobile */}
                      <div 
                        className={`
                          absolute bottom-0 left-0 h-0.5 bg-white transition-all duration-300 ease-out
                          ${
                            clickedItem === item.id 
                              ? "w-full opacity-100" 
                              : activeItem === item.id 
                                ? "w-full opacity-100" 
                                : "w-0 opacity-0"
                          }
                        `}
                      />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  // Always render navbar - use portal when container is ready, otherwise render directly
  if (typeof document === 'undefined') {
    return null;
  }

  // If container is ready, use portal
  if (containerReady) {
    const container = document.getElementById('navbar-root');
    if (container) {
      return createPortal(navbarContent, container);
    }
  }

  // Fallback: render directly (will be moved to portal once container is ready)
  return navbarContent;
}
