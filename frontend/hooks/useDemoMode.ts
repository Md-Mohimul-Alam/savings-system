"use client";

import {
  useEffect,
  useState,
} from "react";

export function useDemoMode() {
  const [
    isDemo,
    setIsDemo,
  ] =
    useState(false);

  useEffect(() => {
    const storedDemo =
      localStorage.getItem(
        "isDemo"
      );

    setIsDemo(
      storedDemo ===
        "true"
    );
  }, []);

  return isDemo;
}