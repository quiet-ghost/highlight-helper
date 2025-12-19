// components/SnowfallToggle.tsx
"use client";

interface SnowfallToggleProps {
  isSnowfallEnabled: boolean;
  onToggleSnowfall: () => void;
}

export default function SnowfallToggle({
  isSnowfallEnabled,
  onToggleSnowfall,
}: SnowfallToggleProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={onToggleSnowfall}
        className={`p-2 rounded text-2xl transition-opacity ${
          isSnowfallEnabled
            ? "text-white opacity-60 hover:opacity-100"
            : "text-white opacity-30 hover:opacity-60"
        }`}
        title={isSnowfallEnabled ? "Disable snowfall" : "Enable snowfall"}
        aria-label={isSnowfallEnabled ? "Disable snowfall" : "Enable snowfall"}
      >
        ❄️
      </button>
    </div>
  );
}
