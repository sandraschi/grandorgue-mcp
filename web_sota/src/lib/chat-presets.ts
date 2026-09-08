/** Per-repo chat prompt presets for grandorgue-mcp (organ domain).
 *
 * Shape: id/label/prompt. Selecting a preset fills the input box (replaces
 * when empty, appends otherwise). Refine reuses the chat endpoint.
 */

export interface ChatPreset {
  id: string;
  label: string;
  prompt: string;
}

export const CHAT_PRESETS: ChatPreset[] = [
  {
    id: "registration",
    label: "Registration",
    prompt:
      "Suggest an organ registration (stops per manual + pedal) for the following music and mood. Explain each choice briefly.\n\nMUSIC:\n",
  },
  {
    id: "bach",
    label: "Bach help",
    prompt:
      "Help me learn this Bach organ work: background, structure, registration ideas, and practice tips for the hard passages.\n\nWORK (BWV):\n",
  },
  {
    id: "midi-debug",
    label: "MIDI debug",
    prompt:
      "My MIDI setup is not behaving. Ask me for symptoms, then walk through diagnosis: bridge status, port names, channels, and GO MIDI settings.\n\nSYMPTOM:\n",
  },
  {
    id: "sample-set",
    label: "Sample set",
    prompt:
      "Recommend a free GrandOrgue sample set for the following needs (style, size, RAM). Explain trade-offs.\n\nNEEDS:\n",
  },
  {
    id: "interpretation",
    label: "Interpretation",
    prompt:
      "Give interpretation advice for the following organ piece: tempo, articulation, phrasing, and use of swell and crescendo.\n\nPIECE:\n",
  },
];
