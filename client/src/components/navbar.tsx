import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  isActive?: boolean;
  hasDropdown?: boolean;
}

const navItems: NavItem[] = [
  { id: "01", label: "TRACKER", isActive: true },
  { id: "02", label: "WHALES HUB", isActive: false },
  { id: "03", label: "INSIDOOR", isActive: false },
  { id: "04", label: "LEADERBOARD", isActive: false, hasDropdown: true },
];

export function Navbar() {
  const [activeItem, setActiveItem] = useState("01");
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
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
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
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
              </button>
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
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center space-x-2 px-4 py-3 text-sm font-mono
                    transition-all duration-200 group
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
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
