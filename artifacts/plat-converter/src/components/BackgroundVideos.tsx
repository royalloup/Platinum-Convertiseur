import videoLeft from "@assets/54f5b8ed-5401-4696-9bc6-d3c52a7516e4_1777367129403.mp4";
import videoRight from "@assets/4617f1a5-5714-4211-bdd4-f7e768087078_1777367175969.mp4";

interface BackgroundVideosProps {
  dimmed?: boolean;
}

export default function BackgroundVideos({ dimmed = true }: BackgroundVideosProps) {
  const videoOpacity = dimmed ? "opacity-40" : "opacity-100";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 grid grid-cols-2">
      <div className="relative h-full w-full overflow-hidden border-r border-primary/20">
        <video
          src={videoLeft}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${videoOpacity}`}
        />
        {dimmed && (
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/40 to-background/80 transition-opacity duration-500" />
        )}
      </div>

      <div className="relative h-full w-full overflow-hidden">
        <video
          src={videoRight}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${videoOpacity}`}
        />
        {dimmed && (
          <div className="absolute inset-0 bg-gradient-to-l from-background/70 via-background/40 to-background/80 transition-opacity duration-500" />
        )}
      </div>
    </div>
  );
}
