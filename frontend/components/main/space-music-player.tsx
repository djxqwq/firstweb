"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPublicSettings, resolveMediaUrl } from "@/lib/api";

export type Track = {
  id: string;
  title: string;
  src: string;
  cover?: string;
};

const FALLBACK_PLAYLIST: Track[] = [
  { id: "nebula", title: "Nebula Drift", src: "/music/nebula-ambient.wav" },
  { id: "orbit", title: "Orbit Signal", src: "/music/orbit-signal.wav" },
];

export function SpaceMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(FALLBACK_PLAYLIST);
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showList, setShowList] = useState(false);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);

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
            cover: t.cover ? resolveMediaUrl(t.cover) : undefined,
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

  // 自动播放尝试
  useEffect(() => {
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;
    const timer = setTimeout(() => {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setAutoPlayBlocked(true));
    }, 1500);
    return () => clearTimeout(timer);
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setAutoPlayBlocked(false);
      }
    } catch {
      setPlaying(false);
    }
  };

  const next = () => {
    if (playlist.length < 2) return;
    setIndex((i) => (i + 1) % playlist.length);
  };

  const prev = () => {
    if (playlist.length < 2) return;
    setIndex((i) => (i - 1 + playlist.length) % playlist.length);
  };

  if (!enabled || !playlist.length) return null;

  return (
    <div
      className="group fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowList(false);
      }}
    >
      <audio ref={audioRef} preload="metadata" loop={playlist.length === 1} />

      {/* Auto-play blocked hint */}
      {autoPlayBlocked && !playing && (
        <div className="animate-pulse rounded-full border border-cyan-400/30 bg-[#0a0618]/90 px-3 py-1.5 text-[10px] text-cyan-300 backdrop-blur-xl">
          点击播放背景音乐 ♪
        </div>
      )}

      {/* Playlist popup */}
      {showList && (
        <div className="mb-1 max-h-[200px] w-[180px] overflow-y-auto rounded-xl border border-white/10 bg-[#0a0618]/95 p-2 backdrop-blur-xl">
          {playlist.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setShowList(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                i === index
                  ? "bg-cyan-500/15 text-cyan-200"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {t.cover ? (
                <img
                  src={t.cover}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gradient-to-br from-violet-600/40 to-cyan-500/40">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white/50">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              <span className="truncate">{t.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main control bar */}
      <div className="flex items-center gap-2">
        {/* Track info – slides out on hover */}
        <div
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-[#0a0618]/80 py-1.5 pl-3 pr-2 backdrop-blur-xl transition-all duration-300 ${
            hovered
              ? "w-auto opacity-100"
              : "pointer-events-none w-0 overflow-hidden border-transparent opacity-0"
          }`}
        >
          <span className="max-w-[120px] truncate whitespace-nowrap text-xs text-white/80">
            {track?.title}
          </span>
          {playlist.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="上一首"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-cyan-200"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowList((s) => !s)}
                aria-label="播放列表"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-cyan-200"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M3 6h14v2H3V6zm0 5h14v2H3v-2zm0 5h10v2H3v-2zm14 0v-2l4 3-4 3v-2h-6v-2h6z" />
                </svg>
              </button>
            </>
          )}
          {playlist.length > 1 && (
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
          )}
        </div>

        {/* CD-style orb button */}
        <div className="relative flex h-[52px] w-[52px] items-center justify-center">
          {/* Glow */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-500 ${
              playing
                ? "shadow-[0_0_20px_rgba(34,211,238,0.4),0_0_40px_rgba(112,66,248,0.2)]"
                : "shadow-[0_0_10px_rgba(0,0,0,0.3)]"
            }`}
          />

          {/* Orbit ring */}
          <div
            className={`absolute inset-[-4px] rounded-full border border-cyan-400/20 ${
              playing ? "animate-spin-slow" : ""
            }`}
            style={{ borderTopColor: "rgba(34,211,238,0.5)" }}
          />

          {/* Orbiting stars */}
          {playing && (
            <div className="absolute inset-[-8px] animate-spin-slow-reverse">
              <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              <span className="absolute bottom-0 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_4px_rgba(196,181,253,0.8)]" />
              <span className="absolute left-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
            </div>
          )}

          {/* Pulse ring */}
          {playing && (
            <div className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/30" />
          )}

          {/* CD disc with cover art */}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "暂停" : "播放"}
            className="relative flex h-[40px] w-[40px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 transition hover:brightness-110 active:scale-95"
          >
            {track?.cover ? (
              <img
                src={track.cover}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${playing ? "animate-spin-cd" : ""}`}
              />
            ) : null}
            {/* Center hole (CD look) */}
            <span className="absolute h-[10px] w-[10px] rounded-full border border-[#030014]/40 bg-[#030014]/60" />
            {/* Play/Pause icon overlay */}
            <span className="relative z-10">
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

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
        @keyframes spin-cd {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }
        .animate-spin-slow-reverse { animation: spin-slow-reverse 6s linear infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        .animate-spin-cd { animation: spin-cd 8s linear infinite; }
      `}</style>
    </div>
  );
}
