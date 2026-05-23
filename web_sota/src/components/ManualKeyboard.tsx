import { useRef, useCallback } from "react";
import { api } from "@/api/client";

const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_NOTES = [1, 3, 6, 8, 10];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface Props {
  firstNote: number;
  noteCount: number;
  channel: number;
  isPedal?: boolean;
}

export default function ManualKeyboard({ firstNote, noteCount, channel, isPedal }: Props) {
  const activeRef = useRef<Set<number>>(new Set());

  const playNote = useCallback((midiNote: number) => {
    if (activeRef.current.has(midiNote)) return;
    activeRef.current.add(midiNote);
    api.playNote(midiNote, 80, channel, 0);
  }, [channel]);

  const releaseNote = useCallback((midiNote: number) => {
    activeRef.current.delete(midiNote);
    api.setStop(midiNote, false); // note off via API
  }, [channel]);

  if (isPedal) {
    return (
      <div className="flex gap-px overflow-x-auto">
        {Array.from({ length: noteCount }, (_, i) => {
          const midiNote = firstNote + i;
          return (
            <div
              key={midiNote}
              className="pedal-key flex-1 min-w-[24px] h-14 flex items-end justify-center pb-1"
              onMouseDown={() => { playNote(midiNote); /* API note on */ api.midiConnect().then(() => { api.setStop(midiNote, true); }); }}
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

  const blackIndex = (midiNote: number) => {
    const oct = Math.floor(midiNote / 12) - Math.floor(firstNote / 12);
    const pos = BLACK_NOTES.indexOf(midiNote % 12);
    return oct * 5 + pos;
  };

  return (
    <div className="relative" style={{ height: 140 }}>
      <div className="absolute inset-x-0 bottom-0 flex">
        {whiteKeys.map((note) => (
          <div
            key={note}
            className="key-white flex-1 h-[130px] flex items-end justify-center pb-1"
            style={{ marginLeft: note % 12 === 5 ? 0 : 0 }}
            onMouseDown={() => playNote(note)}
            onMouseUp={() => releaseNote(note)}
            onMouseLeave={() => releaseNote(note)}
          >
            <span className="text-[9px] text-zinc-500">{NOTE_NAMES[note % 12]}{Math.floor(note / 12) - 1}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 flex pointer-events-none" style={{ paddingLeft: "calc((100% / whiteKeys.length) * 0.65)" }}>
        {blackKeys.map((note) => {
          const wIdx = blackIndex(note);
          return (
            <div
              key={note}
              className="key-black pointer-events-auto w-[calc((100%/whiteKeys.length)*0.6)] h-[75px] ml-[calc((100%/whiteKeys.length)*0.4)]"
              style={{ marginRight: note % 12 === 8 || note % 12 === 10 ? `calc((100% / whiteKeys.length) * 0.3)` : 0 }}
              onMouseDown={() => playNote(note)}
              onMouseUp={() => releaseNote(note)}
              onMouseLeave={() => releaseNote(note)}
            />
          );
        })}
      </div>
    </div>
  );
}
