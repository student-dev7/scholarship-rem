"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "scholarship-secure-vault-v1";
const OFFSET_KEY = "scholarship-deadline-offset-v1";
const DEVICE_KEY = "scholarship-device-id-v1";

export type LocalVault = {
  scholarshipNumber: string;
  accountNumber: string;
  memo: string;
};

const empty: LocalVault = {
  scholarshipNumber: "",
  accountNumber: "",
  memo: "",
};

function readVault(): LocalVault {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...empty };
    const p = JSON.parse(raw) as Partial<LocalVault>;
    return {
      scholarshipNumber: String(p.scholarshipNumber ?? ""),
      accountNumber: String(p.accountNumber ?? ""),
      memo: String(p.memo ?? ""),
    };
  } catch {
    return { ...empty };
  }
}

function readOffset(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(OFFSET_KEY);
  if (v === null) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(30, Math.max(0, n)) : 0;
}

/**
 * 奨学生番号・口座番号・メモ。Firebase には送らない。
 */
export function useLocalData() {
  const [data, setData] = useState<LocalVault>(empty);
  const [offsetDays, setOffsetDaysState] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(readVault());
    setOffsetDaysState(readOffset());
    setReady(true);
  }, []);

  const setVault = useCallback((next: LocalVault) => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // 容量等
    }
  }, []);

  const patch = useCallback((p: Partial<LocalVault>) => {
    setData((prev) => {
      const n = { ...prev, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(n));
      } catch {
        // ignore
      }
      return n;
    });
  }, []);

  const setOffsetDays = useCallback((d: number) => {
    const n = Math.min(30, Math.max(0, Math.floor(d)));
    setOffsetDaysState(n);
    try {
      localStorage.setItem(OFFSET_KEY, String(n));
    } catch {
      // ignore
    }
  }, []);

  return {
    data,
    setVault,
    patch,
    ready,
    offsetDays,
    setOffsetDays,
  };
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return "anon";
  }
}

