"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  description?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, title, description, className }: VideoPlayerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <VideoThumbnail src={src} poster={poster} title={title} description={description} className={className} onPlay={() => setOpen(true)} />
      {open && <VideoLightbox src={src} poster={poster} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function VideoThumbnail({ src, poster, title, description, className, onPlay }: VideoPlayerProps & { onPlay: () => void }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm cursor-pointer", className)} onClick={onPlay}>
      <div className="relative aspect-video">
        <video src={src} poster={poster} className="h-full w-full object-cover" preload="metadata" muted />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all group-hover:from-black/80">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-all group-hover:scale-110 group-hover:bg-white">
            <Play className="h-7 w-7 ml-1" fill="currentColor" />
          </div>
          <p className="mt-3 text-sm font-medium text-white drop-shadow-lg">{title}</p>
        </div>
      </div>
      {(title || description) && (
        <div className="px-4 py-3 bg-white">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
      )}
    </div>
  );
}

function VideoLightbox({ src, poster, title, onClose }: { src: string; poster?: string; title: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => setIsPlaying(false));
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-4xl mx-4">
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
          <h3 className="text-white/90 text-lg font-semibold truncate">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            muted={isMuted}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v) setProgress((v.currentTime / v.duration) * 100);
            }}
            onEnded={() => setIsPlaying(false)}
            className="w-full aspect-video object-contain"
            playsInline
          />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pb-4 pt-12">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
              </button>

              <div
                className="flex-1 cursor-pointer group/progress"
                onClick={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
                }}
              >
                <div className="h-1.5 rounded-full bg-white/20 group-hover/progress:h-2 transition-all">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <span className="text-xs text-white/60 tabular-nums min-w-[4rem] text-right">
                {videoRef.current ? `${Math.floor(videoRef.current.currentTime / 60)}:${String(Math.floor(videoRef.current.currentTime % 60)).padStart(2, "0")}` : "0:00"}
              </span>

              <button
                onClick={() => { setIsMuted(!isMuted); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              <button
                onClick={() => videoRef.current?.requestFullscreen()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
