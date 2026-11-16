import React, { useMemo } from "react";
import wordsData from "./words.json";

interface WordItem {
  w: string;
  s: number;
  e: number;
}

interface Chunk {
  words: WordItem[];
  start: number;
  end: number;
}

export const Subtitles: React.FC<{ time: number }> = ({ time }) => {
  // Pre-group words into smooth readable chunks of 2-4 words
  const chunks: Chunk[] = useMemo(() => {
    const list = wordsData as WordItem[];
    const result: Chunk[] = [];
    let cur: WordItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      cur.push(item);

      const hasPunct = /[.,?!]/.test(item.w);
      const isTooLong = cur.length >= 4;
      const nextItem = list[i + 1];
      const hasGap = nextItem ? nextItem.s - item.e > 0.45 : true;

      if (hasPunct || isTooLong || hasGap || i === list.length - 1) {
        result.push({
          words: cur,
          start: cur[0].s,
          end: cur[cur.length - 1].e + 0.25, // small linger for readability
        });
        cur = [];
      }
    }
    return result;
  }, []);

  // Find the active chunk
  const activeChunk = chunks.find((c) => time >= c.start && time <= c.end);

  if (!activeChunk) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "230px",
        left: "0",
        right: "0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          background: "rgba(10, 15, 30, 0.85)",
          backdropFilter: "blur(12px)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 163, 127, 0.25)",
          borderRadius: "24px",
          padding: "16px 32px",
          maxWidth: "920px",
        }}
      >
        {activeChunk.words.map((w, idx) => {
          const isActive = time >= w.s && time <= w.e + 0.05;
          return (
            <span
              key={idx}
              style={{
                fontFamily: "'Segoe UI', 'Plus Jakarta Sans', Montserrat, sans-serif",
                fontSize: "44px",
                fontWeight: isActive ? 900 : 800,
                color: isActive ? "#FACC15" : "#FFFFFF",
                transform: isActive ? "scale(1.16)" : "scale(1)",
                transition: "all 0.08s ease-out",
                textShadow: isActive
                  ? "0 0 25px rgba(250, 204, 21, 0.9), 0 3px 6px rgba(0,0,0,0.8)"
                  : "0 2px 6px rgba(0, 0, 0, 0.7)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                display: "inline-block",
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
