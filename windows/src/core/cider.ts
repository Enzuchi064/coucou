// The Cider pill on the page: what src-tauri/src/cider.rs reports (MPRIS
// on Linux, the system media controls on Windows), and the pure rules the views and Mochi follow — ports of
// CiderController.swift, NowPlayingViews.swift and the Mac's dance rules
// (BotCanvasView, DesktopMochi.swift).

import type { BotStateName, IslandMode, IslandViewName } from "./layout";

export const CIDER_ID = "integration_cider";
/** CiderController.red. */
export const CIDER_RED = "#FA2D48";

export interface CiderTrack {
  /** cider:track:…, cider:episode:…, cider:ad:… */
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Seconds. */
  duration: number;
  artUrl: string | null;
}

export interface CiderState {
  /** Cider is running. */
  running: boolean;
  /** There is a Cider to launch. */
  installed: boolean;
  track: CiderTrack | null;
  playing: boolean;
  /** Seconds at `positionAt` (Unix ms); while playing it runs on from there. */
  position: number;
  positionAt: number;
  shuffle: boolean;
  repeat: boolean;
  /** 0…100. */
  volume: number;
}

export const IDLE_CIDER: CiderState = {
  running: false, installed: false, track: null, playing: false,
  position: 0, positionAt: 0, shuffle: false, repeat: false, volume: 50,
};

/** The page's copy of the player, and the cover of the track that has one. */
export const Cider = {
  state: { ...IDLE_CIDER } as CiderState,
  artwork: null as { artUrl: string; dataUrl: string } | null,
};

/** The cover to show for the current track, if it has arrived. */
export function currentArtwork(s: CiderState = Cider.state): string | null {
  const art = Cider.artwork;
  return art && s.track?.artUrl && art.artUrl === s.track.artUrl ? art.dataUrl : null;
}

/** CiderController.position(at:): extrapolated while playing, capped at the end. */
export function ciderPosition(s: CiderState, nowMs: number): number {
  const elapsed = s.playing ? Math.max(0, (nowMs - s.positionAt) / 1000) : 0;
  const p = s.position + elapsed;
  const d = s.track?.duration ?? 0;
  return d > 0 ? Math.min(p, d) : p;
}

/**
 * The clock frozen or restarted where it is now — what a play/pause click
 * does at once, before Cider confirms it (CiderController.setPlaying).
 */
export function withPlaying(s: CiderState, playing: boolean, nowMs: number): CiderState {
  if (s.playing === playing) return s;
  return { ...s, position: ciderPosition(s, nowMs), positionAt: nowMs, playing };
}

export function isAd(track: CiderTrack | null | undefined): boolean {
  return track?.id.startsWith("cider:ad:") ?? false;
}

/** NowPlayingProgress.format: m:ss, or h:mm:ss past an hour. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** NowPlayingVolume.icon: 0 = muted, then one, two or three waves. */
export function volumeLevel(volume: number): 0 | 1 | 2 | 3 {
  if (volume <= 0) return 0;
  if (volume < 34) return 1;
  if (volume < 67) return 2;
  return 3;
}

/** Music is playing on a declared Cider pill. */
export function musicPlaying(s: CiderState, activeIntegrations: readonly string[]): boolean {
  return s.playing && s.track != null && activeIntegrations.includes(CIDER_ID);
}

/** The states Mochi dances in; the rest (an alert, an error, sleep) win. */
const DANCE_STATES: ReadonlySet<BotStateName> = new Set(["idle", "working", "thinking", "searching", "finished"]);

/**
 * The island's Mochi (BotCanvasView, macOS): in the compact island whenever
 * music plays, expanded only on the overview with the music pill in front.
 */
export function islandDances(o: {
  music: boolean;
  state: BotStateName;
  mode: IslandMode;
  view: IslandViewName;
  focusId: string | null | undefined;
}): boolean {
  if (!o.music || !DANCE_STATES.has(o.state)) return false;
  if (o.mode === "compact") return true;
  return o.mode === "expanded" && o.view === "overview" && o.focusId === CIDER_ID;
}

/** Mochi on the desktop: the compact island's rules (DesktopMochi.swift). */
export function desktopDances(music: boolean, state: BotStateName): boolean {
  return music && DANCE_STATES.has(state);
}
