import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ArrowRight } from "lucide-react";

interface UsernameInputProps {
  onSubmit: (username: string) => void;
  compact?: boolean;
}

export function UsernameInput({ onSubmit, compact = false }: UsernameInputProps) {
  const [username, setUsername] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery<string[]>({
    queryKey: ["/api/users/search", username],
    enabled: username.length >= 2 && showSuggestions,
    staleTime: 30000,
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      return res.json();
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setUsername(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (username.trim()) {
      onSubmit(username.trim());
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  if (compact) {
    return (
      <div className="relative w-full">
        <div className="flex gap-1.5 sm:gap-2 items-center">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              data-testid="input-username"
              type="text"
              placeholder="Search username..."
              value={username}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => username.length >= 2 && setShowSuggestions(true)}
              className={`h-8 sm:h-9 md:h-10 py-0 text-fluid-xs sm:text-fluid-sm pr-7 sm:pr-8 bg-card/50 border-border/50 focus:border-border/50 focus:bg-card/50 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ease-in-out ${
                showSuggestions && (suggestions.length > 0 || (username.length >= 2 && !loadingSuggestions && suggestions.length === 0))
                  ? 'border-b-0'
                  : ''
              }`}
            />
            {loadingSuggestions && (
              <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-muted-foreground animate-spin" />
              </div>
            )}
            {!loadingSuggestions && username.length >= 2 && (
              <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2">
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-muted-foreground" />
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50">
                <div
                  ref={suggestionsRef}
                  className="w-full border border-border/50 border-t-0 bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in"
                >
                  <div className="p-1 sm:p-1.5 space-y-0.5 max-h-40 sm:max-h-48 md:max-h-60 overflow-y-auto scrollbar-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        data-testid={`suggestion-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-2 sm:px-2.5 py-1 sm:py-1.5 hover-elevate transition-all duration-150 text-fluid-xs sm:text-fluid-sm text-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && username.length >= 2 && !loadingSuggestions && suggestions.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-50">
                <div
                  ref={suggestionsRef}
                  className="w-full border border-border/50 border-t-0 bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in"
                >
                  <div className="p-2 sm:p-3">
                    <p className="text-fluid-xs text-muted-foreground text-center">
                      No users found
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            data-testid="button-connect"
            onClick={handleSubmit}
            disabled={!username.trim()}
            className="btn-layerzero disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Search</span>
            <span className="sm:hidden">Search</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-2 sm:space-y-3">
      <div className="relative">
        <div className="flex gap-2 sm:gap-3 items-center">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              data-testid="input-username"
              type="text"
              placeholder="Enter username (e.g., imdaybot)"
              value={username}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => username.length >= 2 && setShowSuggestions(true)}
              className={`h-10 sm:h-11 md:h-12 py-0 text-fluid-sm sm:text-fluid-base pr-10 bg-card/50 border-border/50 focus:border-border/50 focus:bg-card/50 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ease-in-out ${
                showSuggestions && (suggestions.length > 0 || (username.length >= 2 && !loadingSuggestions && suggestions.length === 0))
                  ? 'border-b-0'
                  : ''
              }`}
            />
            {loadingSuggestions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground animate-spin" />
              </div>
            )}
            {!loadingSuggestions && username.length >= 2 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50">
                <div
                  ref={suggestionsRef}
                  className="w-full border border-border/50 border-t-0 bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in"
                >
                  <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 max-h-48 sm:max-h-60 overflow-y-auto scrollbar-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        data-testid={`suggestion-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-2.5 sm:px-3 py-1.5 sm:py-2 hover-elevate transition-all duration-150 text-fluid-sm text-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && username.length >= 2 && !loadingSuggestions && suggestions.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-50">
                <div
                  ref={suggestionsRef}
                  className="w-full border border-border/50 border-t-0 bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in"
                >
                  <div className="p-3 sm:p-4">
                    <p className="text-fluid-xs sm:text-fluid-sm text-muted-foreground text-center">
                      No users found. Try a different username.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            data-testid="button-connect"
            onClick={handleSubmit}
            disabled={!username.trim()}
            className="btn-layerzero disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Search</span>
            <span className="sm:hidden">Search</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      <p className="text-fluid-xs text-muted-foreground text-center">
        Start typing to see suggestions
      </p>
    </div>
  );
}