import { useCallback, useRef } from "react";
import { api } from "@/api/client";

const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface Props {
  firstNote: number;
  noteCount: number;
  channel: number;
  isPedal?: boolean;
}

export default function ManualKeyboard({ firstNote, noteCount, channel, isPedal }: Props) {
  const activeRef = useRef<Set<number>>(new Set());

  const playNote = useCallback(
    (midiNote: number) => {
      if (activeRef.current.has(midiNote)) return;
      activeRef.current.add(midiNote);
      api.playNote(midiNote, 80, channel, 0);
    },
    [channel],
  );

  const releaseNote = useCallback(
    (midiNote: number) => {
      activeRef.current.delete(midiNote);
      api.releaseNote(midiNote, channel);
    },
    [channel],
  );

  if (isPedal) {
    return (
      <div className="flex gap-px overflow-x-auto">
        {Array.from({ length: noteCount }, (_, i) => {
          const midiNote = firstNote + i;
          return (
            <div
              key={midiNote}
              className="pedal-key flex-1 min-w-[24px] h-14 flex items-end justify-center pb-1"
              onMouseDown={() => {
                playNote(midiNote); /* API note on */
                api.midiConnect().then(() => {
                  api.setStop(midiNote, true);
                });
              }}
              onMouseUp={() => releaseNote(midiNote)}
              onMouseLeave={() => releaseNote(midiNote)}
            >
              <span className="text-[8px] text-zinc-400">{NOTE_NAMES[midiNote % 12]}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  for (let i = 0; i < noteCount; i++) {
    const note = firstNote + i;
    if (WHITE_NOTES.includes(note % 12)) whiteKeys.push(note);
    else blackKeys.push(note);
  }

  const whiteIndex = (midiNote: number) => {
    const oct = Math.floor(midiNote / 12) - Math.floor(firstNote / 12);
    const pos = WHITE_NOTES.indexOf(midiNote % 12);
    return oct * 7 + pos;
  };

  const whiteKeyWidthPct = 100 / whiteKeys.length;
  const blackKeyWidthPct = whiteKeyWidthPct * 0.6;

  const blackKeyStyle = (midiNote: number) => {
    const leftWhite = whiteIndex(midiNote - 1);
    const leftPct = leftWhite * whiteKeyWidthPct + whiteKeyWidthPct * 0.7 - blackKeyWidthPct / 2;
    return {
      left: `${leftPct}%`,
      width: `${blackKeyWidthPct}%`,
    };
  };

  return (
    <div className="relative" style={{ height: 140 }}>
      <div className="absolute inset-x-0 bottom-0 flex">
        {whiteKeys.map((note) => (
          <div
            key={note}
            className="key-white flex-1 h-[130px] flex items-end justify-center pb-1"
            onMouseDown={() => playNote(note)}
            onMouseUp={() => releaseNote(note)}
            onMouseLeave={() => releaseNote(note)}
          >
            <span className="text-[9px] text-zinc-500">
              {NOTE_NAMES[note % 12]}
              {Math.floor(note / 12) - 1}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 h-[75px] pointer-events-none">
        {blackKeys.map((note) => (
          <div
            key={note}
            className="key-black pointer-events-auto absolute top-0 h-[75px]"
            style={blackKeyStyle(note)}
            onMouseDown={() => playNote(note)}
            onMouseUp={() => releaseNote(note)}
            onMouseLeave={() => releaseNote(note)}
          />
        ))}
      </div>
    </div>
  );
}
