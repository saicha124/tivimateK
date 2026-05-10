import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface ParentalContextValue {
  isEnabled: boolean;
  hasPin: boolean;
  lockedGroups: string[];
  sessionUnlocked: Set<string>;
  enableControls: (pin: string) => Promise<void>;
  disableControls: (pin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  lockGroup: (group: string) => Promise<void>;
  unlockGroup: (group: string) => Promise<void>;
  unlockForSession: (group: string) => void;
  isGroupLocked: (group: string) => boolean;
  lockAllSession: () => void;
}

const ParentalContext = createContext<ParentalContextValue | null>(null);

const STORAGE_KEYS = {
  pin: "parental_pin",
  enabled: "parental_enabled",
  lockedGroups: "parental_locked_groups",
};

function hashPin(pin: string): string {
  // Simple hash — enough for local PIN storage
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) ^ pin.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function ParentalProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [lockedGroups, setLockedGroups] = useState<string[]>([]);
  const [sessionUnlocked, setSessionUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [pin, enabled, groups] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.pin),
          AsyncStorage.getItem(STORAGE_KEYS.enabled),
          AsyncStorage.getItem(STORAGE_KEYS.lockedGroups),
        ]);
        if (pin) setPinHash(pin);
        if (enabled === "true") setIsEnabled(true);
        if (groups) setLockedGroups(JSON.parse(groups));
      } catch {}
    })();
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!pinHash) return false;
    return hashPin(pin) === pinHash;
  }, [pinHash]);

  const enableControls = useCallback(async (pin: string) => {
    const hash = hashPin(pin);
    setPinHash(hash);
    setIsEnabled(true);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.pin, hash),
      AsyncStorage.setItem(STORAGE_KEYS.enabled, "true"),
    ]);
  }, []);

  const disableControls = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin);
    if (!ok) return false;
    setIsEnabled(false);
    setSessionUnlocked(new Set());
    await AsyncStorage.setItem(STORAGE_KEYS.enabled, "false");
    return true;
  }, [verifyPin]);

  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    const ok = await verifyPin(oldPin);
    if (!ok) return false;
    const hash = hashPin(newPin);
    setPinHash(hash);
    await AsyncStorage.setItem(STORAGE_KEYS.pin, hash);
    return true;
  }, [verifyPin]);

  const lockGroup = useCallback(async (group: string) => {
    setLockedGroups((prev) => {
      if (prev.includes(group)) return prev;
      const next = [...prev, group];
      AsyncStorage.setItem(STORAGE_KEYS.lockedGroups, JSON.stringify(next));
      return next;
    });
    setSessionUnlocked((prev) => {
      const next = new Set(prev);
      next.delete(group);
      return next;
    });
  }, []);

  const unlockGroup = useCallback(async (group: string) => {
    setLockedGroups((prev) => {
      const next = prev.filter((g) => g !== group);
      AsyncStorage.setItem(STORAGE_KEYS.lockedGroups, JSON.stringify(next));
      return next;
    });
  }, []);

  const unlockForSession = useCallback((group: string) => {
    setSessionUnlocked((prev) => new Set([...prev, group]));
  }, []);

  const isGroupLocked = useCallback((group: string): boolean => {
    if (!isEnabled) return false;
    if (sessionUnlocked.has(group)) return false;
    return lockedGroups.includes(group);
  }, [isEnabled, lockedGroups, sessionUnlocked]);

  const lockAllSession = useCallback(() => {
    setSessionUnlocked(new Set());
  }, []);

  return (
    <ParentalContext.Provider value={{
      isEnabled,
      hasPin: !!pinHash,
      lockedGroups,
      sessionUnlocked,
      enableControls,
      disableControls,
      changePin,
      verifyPin,
      lockGroup,
      unlockGroup,
      unlockForSession,
      isGroupLocked,
      lockAllSession,
    }}>
      {children}
    </ParentalContext.Provider>
  );
}

export function useParental() {
  const ctx = useContext(ParentalContext);
  if (!ctx) throw new Error("useParental must be used within ParentalProvider");
  return ctx;
}
