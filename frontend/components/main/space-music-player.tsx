"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchPublicSettings, resolveMediaUrl } from "@/lib/api";

export type Track = {
  id: string;
  title: string;
  src: string;
};

const FALLBACK_PLAYLIST: Track[] = [
  { id: "nebula", title: "Nebula Drift", src: "/music/nebula-ambient.wav" },
  { id: "orbit", title: "Orbit Signal", src: "/music/orbit-signal.wav" },
];

/** Minimal glass capsule player with live EQ bars */
export function SpaceMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const barsRef = useRef<HTMLDivElement | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const playingRef = useRef(false);

  const [playlist, setPlaylist] = useState<Track[]>(FALLBACK_PLAYLIST);
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const track = playlist[index] ?? playlist[0];

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    fetchPublicSettings().then((data) => {
      if (!data?.music) return;
      setEnabled(data.music.enabled !== false);
      if (typeof data.music.volume === "number") {
        setVolume(Math.max(0, Math.min(1, data.music.volume)));
      }
      const tracks = (data.music.tracks || [])
        .map((t, i) => {
          const raw = t.url || t.src || "";
          if (!raw) return null;
          return {
            id: t.id || `t-${i}`,
            title: t.title || `Track ${i + 1}`,
            src: resolveMediaUrl(raw),
          } as Track;
        })
        .filter(Boolean) as Track[];
      if (tracks.length) setPlaylist(tracks);
    });
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;
      freqRef.current = new Uint8Array(analyser.frequencyBinCount);
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
        sourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
      }
    }
  }, []);

  const drawBars = useCallback(() => {
    const analyser = analyserRef.current;
    const wrap = barsRef.current;
    if (!playingRef.current) {
      rafRef.current = 0;
      return;
    }
    if (analyser && freqRef.current && wrap) {
      analyser.getByteFrequencyData(freqRef.current);
      const kids = wrap.children;
      const n = kids.length;
      for (let i = 0; i < n; i++) {
        const v = (freqRef.current[i + 2] || 0) / 255;
        const el = kids[i] as HTMLElement;
        el.style.height = `${8 + v * 22}px`;
        el.style.opacity = String(0.35 + v * 0.65);
      }
    }
    rafRef.current = requestAnimationFrame(drawBars);
  }, []);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      return;
    }
    rafRef.current = requestAnimationFrame(drawBars);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawBars, playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.volume = volume;
    audio.src = track.src;
    audio.load();
    const onEnded = () =>
      setIndex((i) => (i + 1) % Math.max(playlist.length, 1));
    audio.addEventListener("ended", onEnded);
    if (playing) void audio.play().catch(() => setPlaying(false));
    return () => audio.removeEventListener("ended", onEnded);
  }, [track, playlist.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await ensureAudioGraph();
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
    }
  };

  const next = async () => {
    if (playlist.length < 2) return;
    setIndex((i) => (i + 1) % playlist.length);
    if (playing) await ensureAudioGraph();
  };

  if (!enabled || !playlist.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 md:bottom-8 md:left-auto md:right-6 md:translate-x-0">
      <audio ref={audioRef} preload="metadata" loop={playlist.length === 1} />

      <motion.div
        layout
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#0a0618]/75 px-3 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        animate={{
          borderColor: playing
            ? "rgba(34,211,238,0.35)"
            : "rgba(255,255,255,0.1)",
          boxShadow: playing
            ? "0 8px 40px rgba(112,66,248,0.35)"
            : "0 8px 40px rgba(0,0,0,0.45)",
        }}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "暂停" : "播放"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[#030014] shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:brightness-110"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="hidden min-w-0 sm:block">
          <div className="max-w-[140px] truncate text-xs text-white/90">
            {track?.title}
          </div>
          <div
            ref={barsRef}
            className="mt-1 flex h-6 items-end gap-[3px]"
            aria-hidden
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-cyan-300"
                style={{ height: 8 }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="下一首"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-cyan-200"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M6 6v12l8.5-6L6 6zm9 0v12h2V6h-2z" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}
