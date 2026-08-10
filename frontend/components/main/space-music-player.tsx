"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Starry Orbit Music Player
 * - Compact circular "planet" orb in the corner
 * - Orbiting star particles when playing (pure CSS)
 * - Expands on hover to reveal track name + next button
 * - Non-blocking: ~52px collapsed, ~220px on hover
 */
export function SpaceMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(FALLBACK_PLAYLIST);
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  const track = playlist[index] ?? playlist[0];

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

  const next = () => {
    if (playlist.length < 2) return;
    setIndex((i) => (i + 1) % playlist.length);
  };

  if (!enabled || !playlist.length) return null;

  return (
    <div
      className="group fixed bottom-5 right-5 z-[80] flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <audio ref={audioRef} preload="metadata" loop={playlist.length === 1} />

      {/* Track info panel – slides out on hover */}
      <div
        className={`mr-2 flex items-center gap-2 rounded-full border border-white/10 bg-[#0a0618]/80 py-1.5 pl-3 pr-1 backdrop-blur-xl transition-all duration-300 ${
          hovered
            ? "w-auto opacity-100"
            : "pointer-events-none w-0 overflow-hidden border-transparent opacity-0"
        }`}
      >
        <span className="whitespace-nowrap text-xs text-white/80">
          {track?.title}
        </span>
        <button
          type="button"
          onClick={next}
          aria-label="下一首"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-cyan-200"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M6 6v12l8.5-6L6 6zm9 0v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Orb button with orbiting stars */}
      <div className="relative flex h-[52px] w-[52px] items-center justify-center">
        {/* Glow ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            playing
              ? "shadow-[0_0_20px_rgba(34,211,238,0.4),0_0_40px_rgba(112,66,248,0.2)]"
              : "shadow-[0_0_10px_rgba(0,0,0,0.3)]"
          }`}
        />

        {/* Orbit ring (rotates when playing) */}
        <div
          className={`absolute inset-[-4px] rounded-full border border-cyan-400/20 ${
            playing ? "animate-spin-slow" : ""
          }`}
          style={{ borderTopColor: "rgba(34,211,238,0.5)" }}
        />

        {/* Orbiting star particles */}
        {playing && (
          <div className="absolute inset-[-8px] animate-spin-slow-reverse">
            <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_4px_rgba(196,181,253,0.8)]" />
            <span className="absolute left-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          </div>
        )}

        {/* Pulsing halo when playing */}
        {playing && (
          <div className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/30" />
        )}

        {/* Play/Pause button (the "planet") */}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "暂停" : "播放"}
          className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 transition hover:brightness-110 active:scale-95"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#030014]">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-[#030014]">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Inline styles for custom keyframe animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 6s linear infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>
    </div>
  );
}
