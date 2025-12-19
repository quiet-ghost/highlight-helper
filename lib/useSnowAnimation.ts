import { useState, useEffect } from 'react';

type SnowAnimationState = "growing" | "stable" | "melting" | "no-snow";

export function useSnowAnimation(isSnowfallEnabled: boolean) {
  // Initialize state based on the current prop to avoid animation on page load
  const [snowAnimationState, setSnowAnimationState] = useState<SnowAnimationState>(
    isSnowfallEnabled ? "stable" : "no-snow"
  );

  // Effect to handle state transitions based on the toggle
  useEffect(() => {
    if (isSnowfallEnabled) {
      // If snow is being turned on, and it's currently off or melting, start growing
      if (snowAnimationState === "no-snow" || snowAnimationState === "melting") {
        setSnowAnimationState("growing");
      }
    } else {
      // If snow is being turned off, and it's currently on or growing, start melting
      if (snowAnimationState === "stable" || snowAnimationState === "growing") {
        setSnowAnimationState("melting");
      }
    }
  }, [isSnowfallEnabled, snowAnimationState]);

  // Effect to handle timers for state progression
  useEffect(() => {
    if (snowAnimationState === "growing") {
      const timer = setTimeout(() => {
        setSnowAnimationState("stable");
      }, 5000); // Accumulation duration
      return () => clearTimeout(timer);
    }

    if (snowAnimationState === "melting") {
      const timer = setTimeout(() => {
        setSnowAnimationState("no-snow");
      }, 3000); // Melt duration
      return () => clearTimeout(timer);
    }
  }, [snowAnimationState]);

  return snowAnimationState;
}
