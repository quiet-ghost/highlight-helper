// @vitest-environment jsdom

import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { MissingItemNotesSaveResult } from "../lib/missingItems";
import MissingItemNotesField from "./MissingItemNotesField";

afterEach(cleanup);

function Field({
  onSave,
  savedValue = "",
}: {
  onSave: (value: string) => Promise<MissingItemNotesSaveResult>;
  savedValue?: string;
}) {
  const [draft, setDraft] = useState<string>();
  return <MissingItemNotesField itemId={7} savedValue={savedValue} draft={draft} onDraftChange={setDraft} onSave={onSave} />;
}

describe("MissingItemNotesField", () => {
  it("saves changed text only when leaving the field", async () => {
    const saves: string[] = [];
    render(<Field onSave={async (value) => {
      saves.push(value);
      return { ok: true, notes: value };
    }} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Checked receiving" } });
    expect(saves).toEqual([]);
    fireEvent.blur(input);
    await screen.findByText("Saved");
    expect(saves).toEqual(["Checked receiving"]);
  });

  it("does not save unchanged text", () => {
    const saves: string[] = [];
    render(<Field savedValue="Already checked" onSave={async (value) => {
      saves.push(value);
      return { ok: true, notes: value };
    }} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(saves).toEqual([]);
  });

  it("saves empty text when removing a note", async () => {
    const saves: string[] = [];
    render(<Field savedValue="Old note" onSave={async (value) => {
      saves.push(value);
      return { ok: true, notes: value };
    }} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    await screen.findByText("Saved");
    expect(saves).toEqual([""]);
  });

  it("keeps failed drafts and lets the user retry", async () => {
    const saves: string[] = [];
    render(<Field onSave={async (value) => {
      saves.push(value);
      return saves.length === 1 ? { ok: false, message: "Offline." } : { ok: true, notes: value };
    }} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Keep this text" } });
    fireEvent.blur(input);
    await screen.findByText(/Offline/);
    expect(input.getAttribute("disabled")).toBeNull();
    expect(screen.getByDisplayValue("Keep this text")).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await screen.findByText("Saved");
    expect(saves).toEqual(["Keep this text", "Keep this text"]);
  });

  it("does not replace a draft when live saved values change", () => {
    const save = async (value: string): Promise<MissingItemNotesSaveResult> => ({ ok: true, notes: value });
    const view = render(<Field onSave={save} savedValue="Old note" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My draft" } });
    view.rerender(<Field onSave={save} savedValue="Someone else's note" />);
    expect(screen.getByDisplayValue("My draft")).toBeTruthy();
  });

  it("shows live updates when there is no draft", () => {
    const save = async (value: string): Promise<MissingItemNotesSaveResult> => ({ ok: true, notes: value });
    const view = render(<Field onSave={save} savedValue="Old note" />);
    view.rerender(<Field onSave={save} savedValue="New saved note" />);
    expect(screen.getByDisplayValue("New saved note")).toBeTruthy();
  });

  it("blocks duplicate saves while a request is pending", async () => {
    const saves: string[] = [];
    let finish: (result: MissingItemNotesSaveResult) => void = () => {
      throw new Error("Save has not started");
    };
    render(<Field onSave={(value) => {
      saves.push(value);
      return new Promise((resolve) => { finish = resolve; });
    }} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Pending note" } });
    fireEvent.blur(input);
    fireEvent.blur(input);
    expect(input.getAttribute("disabled")).not.toBeNull();
    expect(saves).toEqual(["Pending note"]);
    finish({ ok: true, notes: "Pending note" });
    await waitFor(() => expect(screen.getByText("Saved")).toBeTruthy());
  });
});
