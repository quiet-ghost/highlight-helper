"use client";

import { useId, useRef, useState } from "react";
import type { MissingItemNotesSaveResult } from "../lib/missingItems";

type SaveState =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "saved" }
  | { type: "error"; message: string };

interface MissingItemNotesFieldProps {
  itemId: number;
  savedValue: string;
  draft: string | undefined;
  onDraftChange: (value: string) => void;
  onSave: (value: string) => Promise<MissingItemNotesSaveResult>;
}

export default function MissingItemNotesField({
  itemId,
  savedValue,
  draft,
  onDraftChange,
  onSave,
}: MissingItemNotesFieldProps) {
  const [state, setState] = useState<SaveState>({ type: "idle" });
  const savingRef = useRef(false);
  const statusId = useId();
  const value = draft ?? savedValue;

  const save = async () => {
    if (savingRef.current || value === savedValue) return;
    savingRef.current = true;
    setState({ type: "saving" });
    try {
      const result = await onSave(value);
      setState(
        result.ok
          ? { type: "saved" }
          : { type: "error", message: result.message },
      );
    } catch {
      setState({
        type: "error",
        message: "Could not save notes. Check your connection and retry.",
      });
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="min-w-56">
      <textarea
        aria-label={`Notes for missing item ${itemId}`}
        aria-describedby={statusId}
        value={value}
        rows={2}
        disabled={state.type === "saving"}
        placeholder="Add notes…"
        onChange={(event) => {
          onDraftChange(event.target.value);
          setState({ type: "idle" });
        }}
        onBlur={() => void save()}
        className="w-full rounded border border-gray-400 bg-white p-2 text-sm text-black dark:border-gray-500 dark:bg-gray-900 dark:text-white disabled:opacity-60"
      />
      <div id={statusId} aria-live="polite" className="text-xs">
        {state.type === "saving"
          ? "Saving…"
          : state.type === "saved"
            ? "Saved"
            : null}
        {state.type === "idle" && value !== savedValue && "Unsaved"}
        {state.type === "error" && (
          <div className="text-red-700 dark:text-red-300">
            {state.message} Your text is kept here.
            <button
              type="button"
              onClick={() => void save()}
              className="ml-2 underline"
            >
              Retry save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
