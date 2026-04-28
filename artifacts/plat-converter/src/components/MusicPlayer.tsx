import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Music2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
const BASE = import.meta.env.BASE_URL;

const TRACKS: { url: string; title: string }[] = [
  { url: `${BASE}audio/uriel-theme.mp3`, title: "Roses from the Abyss — Uriel Theme" },
  { url: `${BASE}audio/marie-old-peace.mp3`, title: "Marie — The Old Peace OST" },
];

const pickRandomIndex = (exclude?: number) => {
  if (TRACKS.length <= 1) return 0;
  let idx = Math.floor(Math.random() * TRACKS.length);
  if (exclude !== undefined) {
    while (idx === exclude) {
      idx = Math.floor(Math.random() * TRACKS.length);
    }
  }
  return idx;
};

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef<number>(pickRandomIndex());
  const [trackIndex, setTrackIndex] = useState<number>(trackIndexRef.current);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = new Audio(TRACKS[trackIndexRef.current].url);
    audio.loop = false;
    audio.volume = volume;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleError = () => setError(true);

    const playNextRandom = async () => {
      const next = pickRandomIndex(trackIndexRef.current);
      trackIndexRef.current = next;
      setTrackIndex(next);
      if (!audioRef.current) return;
      audioRef.current.src = TRACKS[next].url;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setError(false);
      } catch {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", playNextRandom);

    let removed = false;
    const startOnInteraction = async () => {
      if (removed || !audioRef.current) return;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        cleanup();
      } catch {
        // wait for next interaction
      }
    };

    const cleanup = () => {
      removed = true;
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        window.addEventListener("pointerdown", startOnInteraction);
        window.addEventListener("keydown", startOnInteraction);
        window.addEventListener("touchstart", startOnInteraction);
      });

    return () => {
      cleanup();
      audio.pause();
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", playNextRandom);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        setError(false);
      }
    } catch {
      setError(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div
        className={`flex items-center bg-card/90 backdrop-blur border border-primary/40 rounded-none transition-all duration-300 ${
          expanded ? "px-3 py-2 gap-3" : "p-2"
        } shadow-[0_0_20px_rgba(0,240,255,0.15)]`}
      >
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Lecture"}
          className={`w-11 h-11 flex items-center justify-center rounded-none border transition-all ${
            isPlaying
              ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,240,255,0.4)]"
              : "border-primary/40 bg-background/60 text-primary hover:bg-primary/10 hover:border-primary"
          }`}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="hidden sm:flex items-center gap-2 px-2 py-1 hover:bg-primary/5 transition-colors"
          aria-label="Afficher les contrôles"
        >
          <Music2
            className={`w-4 h-4 transition-colors ${
              isPlaying ? "text-primary animate-pulse" : "text-muted-foreground"
            }`}
          />
          {expanded && (
            <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground whitespace-nowrap">
              {error ? "Piste indisponible" : TRACKS[trackIndex].title}
            </span>
          )}
        </button>

        {expanded && (
          <div className="flex items-center gap-2 pl-2 border-l border-border/50">
            <button
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Activer le son" : "Couper le son"}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <Slider
              value={[muted ? 0 : volume * 100]}
              onValueChange={(v) => {
                setVolume(v[0] / 100);
                if (v[0] > 0) setMuted(false);
              }}
              max={100}
              step={1}
              className="w-24"
              aria-label="Volume"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
