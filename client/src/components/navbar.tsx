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
  { id: "02", label: "ORACLE", href: "/oracle", isActive: false },
  { 
    id: "03", 
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

  const activeItem = useMemo(() => {
    const found = navItems.find(item => {
      if (item.subItems) {
        return item.subItems.some(sub => sub.href === location);
      }
      return item.href === location;
    });
    return found?.id || "01";
  }, [location]);

  useEffect(() => {
    if (!openDropdown) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (isClickingDropdown.current) {
        isClickingDropdown.current = false;
        return;
      }
      
      const target = event.target as HTMLElement;
      
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

  useEffect(() => {
    setOpenDropdown(null);
  }, [location]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('navbar-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'navbar-root';
      
      const rootElement = document.getElementById('root');
      if (rootElement) {
        document.body.insertBefore(container, rootElement);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    setContainerReady(true);

    return () => {};
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
      className="navbar-fixed w-full bg-black/95 backdrop-blur-md border-b border-gray-800/50 shadow-lg transition-responsive"
      ref={(el) => {
        if (el) {
          navRef.current = el;
        }
      }}
    >
      <div className="w-full px-fluid-sm sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center h-fluid-navbar relative">
          {/* POLYFEILD BETA Brand - Fixed Left */}
          <div className="absolute left-2 sm:left-3 md:left-4 flex items-center gap-1 sm:gap-1.5 md:gap-2">
            <h2 className="text-fluid-sm sm:text-fluid-base md:text-fluid-lg lg:text-fluid-xl tracking-tight">
              <span className="poly-scramble text-green-400 drop-shadow-lg">POLY</span>
              <span className="field-scramble text-gray-300">FIELD</span>
            </h2>
            <span className="text-fluid-xs font-bold px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/40 rounded-md shadow-sm hidden xs:inline-block">
              BETA
            </span>
          </div>
          
          {/* Desktop Navigation Items - Centered */}
          <div className="hidden md:flex items-center gap-fluid-sm lg:gap-fluid-md">
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
                            relative flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 lg:py-2 nav-link-layerzero
                            min-w-[90px] lg:min-w-[110px] h-8 lg:h-10 transition-all duration-300 group
                            ${
                              activeItem === item.id
                                ? "text-white opacity-100"
                                : "text-gray-400 hover:text-white"
                            }
                          `}
                        >
                      <span className="text-gray-500 text-fluid-xs">[{item.id}]</span>
                      <span className="text-gray-500 text-fluid-xs">//</span>
                      <span className="tracking-wide text-fluid-xs">{item.label}</span>
                      <ChevronDown className={`w-3 h-3 lg:w-3.5 lg:h-3.5 transition-transform duration-200 ${openDropdown === item.id ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      
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
                    
                    {openDropdown === item.id && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-48 lg:w-56 bg-black/95 backdrop-blur-md border border-gray-800/50 shadow-2xl z-[100] overflow-hidden"
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
                                setLocation(subItem.href);
                                handleItemClick(item.id);
                                setOpenDropdown(null);
                              }}
                              className={`
                                w-full text-left flex items-center gap-1.5 px-3 lg:px-4 py-2.5 lg:py-3 text-fluid-xs lg:text-fluid-sm font-mono transition-all duration-200 cursor-pointer relative group
                                ${
                                  location === subItem.href
                                    ? "text-white"
                                    : "text-gray-400 hover:text-white"
                                }
                              `}
                            >
                              <span className="text-gray-500 text-fluid-xs">[{String(idx + 1).padStart(2, '0')}]</span>
                              <span className="text-gray-500 text-fluid-xs">//</span>
                              <span className="tracking-wide">{subItem.label.toUpperCase()}</span>
                              <div 
                                className={`
                                  absolute bottom-0 left-3 right-3 h-0.5 bg-white transition-all duration-300 ease-out
                                  ${
                                    location === subItem.href 
                                      ? "opacity-100" 
                                      : "opacity-0 group-hover:opacity-100"
                                  }
                                `}
                              />
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
                      relative flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 lg:py-2 nav-link-layerzero
                      min-w-[90px] lg:min-w-[110px] h-8 lg:h-10 transition-all duration-300 group
                      ${
                        activeItem === item.id
                          ? "text-white opacity-100"
                          : "text-gray-400 hover:text-white"
                      }
                    `}
                  >
                    <span className="text-gray-500 text-fluid-xs">[{item.id}]</span>
                    <span className="text-gray-500 text-fluid-xs">//</span>
                    <span className="tracking-wide text-fluid-xs">{item.label}</span>
                    {item.hasDropdown && (
                      <ChevronDown className="w-3 h-3 lg:w-3.5 lg:h-3.5" strokeWidth={2.5} />
                    )}
                    
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
            className="absolute right-2 sm:right-3 md:right-4 md:hidden p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
            ) : (
              <AlignJustify className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
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
                          w-full flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 text-fluid-xs sm:text-fluid-sm font-mono
                          transition-all duration-200
                          ${
                            activeItem === item.id
                              ? "text-white bg-gray-800"
                              : "text-gray-400 hover:text-white hover:bg-gray-900"
                          }
                        `}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">[{item.id}]</span>
                          <span className="text-gray-500">//</span>
                          <span className="uppercase tracking-wide">{item.label}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 ${openDropdown === item.id ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      </button>
                      
                      {openDropdown === item.id && (
                        <div className="ml-3 sm:ml-4 border-l border-gray-800">
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
                                  w-full text-left block px-2.5 sm:px-3 py-1.5 sm:py-2 text-fluid-xs sm:text-fluid-sm font-mono cursor-pointer
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
                        w-full flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 text-fluid-xs sm:text-fluid-sm font-mono
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
                        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" strokeWidth={2.5} />
                      )}
                      
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

  if (typeof document === 'undefined') {
    return null;
  }

  if (containerReady) {
    const container = document.getElementById('navbar-root');
    if (container) {
      return createPortal(navbarContent, container);
    }
  }

  return navbarContent;
}