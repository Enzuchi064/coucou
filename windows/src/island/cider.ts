// Cider's reports → the page (src-tauri/src/cider.rs). The parts of
// CiderController.swift that touch the app: the pill wears the track's
// title, music starting shows the compact island without a sound, and the
// card reads the player again whenever it comes on screen (seeks made in
// Cider's own window are never signalled).

import { Bridge, onEvent } from "../core/bridge";
import { pillDefinition } from "../core/pills";
import { CIDER_ID, Cider, isAd, type CiderState } from "../core/cider";
import { State } from "../core/state";
import { t } from "../i18n/i18n";

export interface CiderHost {
  /** Compact island from hidden, no peek sound. */
  revealSilently(): void;
}

export function registerCiderHandlers(island: CiderHost) {
  void onEvent<CiderState>("cider", (s) => applyCider(island, s));
  void onEvent<{ artUrl: string; dataUrl: string }>("cider-artwork", (art) => {
    Cider.artwork = art;
    State.notify();
  });
  State.subscribe(() => {
    syncPillName();
    refreshWhenShown();
  });
}

/** A report from Rust (or the answer to a refresh). */
export function applyCider(island: CiderHost, next: CiderState) {
  const wasPlaying = State.ciderPlaying;
  Cider.state = next;
  syncPillName();
  // Only on not playing → playing (CiderController.setPlaying).
  if (!wasPlaying && State.ciderPlaying && !State.paused && State.mode === "hidden") {
    island.revealSilently();
  }
  State.notify();
}

/** CiderController.syncTaskName: the track's title, else the pill's name. */
export function syncPillName() {
  const task = State.tasks.find((x) => x.id === CIDER_ID);
  if (!task) return;
  const track = Cider.state.track;
  const title = isAd(track) ? t("Advertisement") : (track?.title ?? "");
  const name = title || (pillDefinition(CIDER_ID)?.name ?? "Cider");
  if (task.name !== name) task.name = name;
}

let shown = false;

function refreshWhenShown() {
  const now = State.mode === "expanded" && State.view === "overview" && State.focusTask?.id === CIDER_ID;
  if (now && !shown) void Bridge.ciderRefresh();
  shown = now;
}
