import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface WalletInputProps {
  onSubmit: (address: string) => void;
}

export function WalletInput({ onSubmit }: WalletInputProps) {
  const [address, setAddress] = useState("");

  const handleSubmit = () => {
    if (address.trim()) {
      onSubmit(address.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Card className="w-full max-w-2xl p-6 md:p-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <label className="text-sm font-medium text-foreground">
            Wallet Address
          </label>
        </div>
        <div className="flex gap-3">
          <Input
            data-testid="input-wallet"
            type="text"
            placeholder="Enter wallet address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-14 text-base font-mono"
          />
          <Button
            data-testid="button-connect"
            onClick={handleSubmit}
            disabled={!address.trim()}
            size="lg"
            className="px-8"
          >
            Connect
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your Ethereum wallet address to view your Polymarket trading statistics
        </p>
      </div>
    </Card>
  );
}
