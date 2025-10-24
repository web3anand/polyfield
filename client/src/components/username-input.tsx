import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

interface UsernameInputProps {
  onSubmit: (username: string) => void;
}

export function UsernameInput({ onSubmit }: UsernameInputProps) {
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

  return (
    <Card className="w-full max-w-2xl p-6 md:p-8">
      <div className="space-y-4">
        <label className="text-sm font-medium text-foreground">
          Polymarket Username
        </label>
        <div className="relative">
          <div className="flex gap-3">
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
                className={`h-14 text-base pr-10 transition-all duration-200 ${
                  showSuggestions && (suggestions.length > 0 || (username.length >= 2 && !loadingSuggestions && suggestions.length === 0))
                    ? 'rounded-b-none border-b-0'
                    : ''
                }`}
              />
              {loadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              )}
              {!loadingSuggestions && username.length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <Button
              data-testid="button-connect"
              onClick={handleSubmit}
              disabled={!username.trim()}
              size="lg"
              className="px-8"
            >
              Search
            </Button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="relative flex gap-3">
              <div
                ref={suggestionsRef}
                className="flex-1 border border-border border-t-0 rounded-b-md bg-card shadow-lg animate-in slide-in-from-top-2 duration-200"
              >
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto scrollbar-hidden">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      data-testid={`suggestion-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 rounded-md hover-elevate transition-all duration-150 text-sm text-foreground"
                    >
                      @{suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-[6rem]"></div>
            </div>
          )}

          {showSuggestions && username.length >= 2 && !loadingSuggestions && suggestions.length === 0 && (
            <div className="relative flex gap-3">
              <div
                ref={suggestionsRef}
                className="flex-1 border border-border border-t-0 rounded-b-md bg-card shadow-lg animate-in slide-in-from-top-2 duration-200"
              >
                <div className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    No users found. Try a different username.
                  </p>
                </div>
              </div>
              <div className="w-[6rem]"></div>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a Polymarket username to view their trading statistics. Start typing to see suggestions.
        </p>
      </div>
    </Card>
  );
}
