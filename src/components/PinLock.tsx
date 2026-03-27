"use client";

import { useState, useEffect, useCallback } from "react";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSetup, setIsSetup] = useState(false); // true when no PIN exists yet
  const [isConfirming, setIsConfirming] = useState(false); // true during setup confirmation
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const savedHash = localStorage.getItem("jaia-pin-hash");
    if (!savedHash) {
      setIsSetup(true);
    }
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");

    if (newPin.length === 4) {
      setTimeout(() => {
        if (isSetup) {
          if (!isConfirming) {
            setConfirmPin(newPin);
            setIsConfirming(true);
            setPin("");
          } else {
            if (newPin === confirmPin) {
              localStorage.setItem("jaia-pin-hash", simpleHash(newPin));
              onUnlock();
            } else {
              setError("Les codes ne correspondent pas");
              setShake(true);
              setTimeout(() => setShake(false), 500);
              setPin("");
              setIsConfirming(false);
              setConfirmPin("");
            }
          }
        } else {
          const savedHash = localStorage.getItem("jaia-pin-hash");
          if (simpleHash(newPin) === savedHash) {
            onUnlock();
          } else {
            setError("Code incorrect");
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setPin("");
          }
        }
      }, 200);
    }
  }, [pin, isSetup, isConfirming, confirmPin, onUnlock]);

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  // Also support physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit]);

  const title = isSetup
    ? isConfirming
      ? "Confirmez le code"
      : "Cr\u00e9ez un code PIN"
    : "Entrez le code PIN";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
        JA&Iuml;A Ledger
      </h1>
      <p className="mt-2 text-sm text-brown">{title}</p>

      {/* PIN dots */}
      <div className={`mt-8 flex gap-4 ${shake ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? "border-gold bg-gold"
                : "border-cream-dark bg-white"
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      {/* Keypad */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","","0","\u232b"].map((key) => (
          key === "" ? <div key="empty" /> :
          <button
            key={key}
            onClick={() => key === "\u232b" ? handleBackspace() : handleDigit(key)}
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-brown-dark transition-colors hover:bg-cream-dark active:bg-gold/20"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Skip setup option */}
      {isSetup && !isConfirming && (
        <button
          onClick={onUnlock}
          className="mt-6 text-sm text-brown hover:text-gold hover:underline"
        >
          Passer (sans protection)
        </button>
      )}
    </div>
  );
}
