import { useState, useRef, useEffect } from "react";
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
  { id: "04", label: "LEADERBOARD", href: "#", isActive: false, hasDropdown: true },
];

export function Navbar() {
  const [location] = useLocation();
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine active item based on current route
  const activeItem = navItems.find(item => {
    if (item.subItems) {
      return item.subItems.some(sub => sub.href === location);
    }
    return item.href === location;
  })?.id || "01";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (itemId: string) => {
    setClickedItem(itemId);
    setIsMobileMenuOpen(false); // Close mobile menu on click
    
    // Reset clicked state after animation completes
    setTimeout(() => {
      setClickedItem(null);
    }, 600);
  };

  return (
    <nav className="w-full bg-black border-b border-gray-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16 relative">
          {/* POLYFEILD BETA Brand - Fixed Left */}
          <div className="absolute left-4 flex items-center gap-3">
            <h2 className="text-lg sm:text-xl tracking-tight">
              <span className="poly-scramble text-green-400 drop-shadow-lg">POLY</span>
              <span className="field-scramble text-gray-300">FIELD</span>
            </h2>
            <span className="text-xs font-medium px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30">
              BETA
            </span>
          </div>
          
          {/* Desktop Navigation Items - Centered */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8" ref={dropdownRef}>
            {navItems.map((item) => (
              <div key={item.id} className="relative">
                {item.hasDropdown && item.subItems ? (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
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
                      <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                      
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
                      <div className="absolute top-full left-0 mt-2 w-56 bg-black border border-gray-800 shadow-lg z-50">
                        {item.subItems.map((subItem, idx) => (
                          <Link
                            key={idx}
                            href={subItem.href}
                            onClick={() => {
                              handleItemClick(item.id);
                              setOpenDropdown(null);
                            }}
                            className={`
                              block px-4 py-3 text-sm font-mono transition-colors
                              ${
                                location === subItem.href
                                  ? "text-white bg-gray-800"
                                  : "text-gray-400 hover:text-white hover:bg-gray-900"
                              }
                            `}
                          >
                            {subItem.label}
                          </Link>
                        ))}
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
                      <ChevronDown className="w-3 h-3 ml-1" />
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
            className="absolute right-4 md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-black">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <div key={item.id}>
                  {item.hasDropdown && item.subItems ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                        className={`
                          w-full flex items-center justify-between space-x-2 px-4 py-3 text-sm font-mono
                          transition-all duration-200
                          ${
                            activeItem === item.id
                              ? "text-white bg-gray-800"
                              : "text-gray-400 hover:text-white hover:bg-gray-900"
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">[{item.id}]</span>
                          <span className="text-gray-500">//</span>
                          <span className="uppercase tracking-wide">{item.label}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openDropdown === item.id && (
                        <div className="ml-4 border-l border-gray-800">
                          {item.subItems.map((subItem, idx) => (
                            <Link
                              key={idx}
                              href={subItem.href}
                              onClick={() => {
                                handleItemClick(item.id);
                                setIsMobileMenuOpen(false);
                                setOpenDropdown(null);
                              }}
                              className={`
                                block px-4 py-2 text-sm font-mono
                                ${
                                  location === subItem.href
                                    ? "text-white bg-gray-900"
                                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                                }
                              `}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        w-full flex items-center space-x-2 px-4 py-3 text-sm font-mono
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
                        <ChevronDown className="w-3 h-3 ml-1" />
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
}
