import { Message, Memory, EmotionEntry } from "./types";

const MESSAGES_KEY = "mindbuddy_messages";
const MEMORIES_KEY = "mindbuddy_memories";
const EMOTIONS_KEY = "mindbuddy_emotions";

export function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MESSAGES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function loadMemories(): Memory[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MEMORIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveMemories(memories: Memory[]) {
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
}

export function addMemory(memory: Omit<Memory, "id">) {
  const memories = loadMemories();
  memories.push({ ...memory, id: crypto.randomUUID() });
  saveMemories(memories);
}

export function deleteMemory(id: string) {
  const memories = loadMemories().filter((m) => m.id !== id);
  saveMemories(memories);
}

export function loadEmotions(): EmotionEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(EMOTIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveEmotions(emotions: EmotionEntry[]) {
  localStorage.setItem(EMOTIONS_KEY, JSON.stringify(emotions));
}

export function addEmotion(entry: EmotionEntry) {
  const emotions = loadEmotions();
  // Replace if same date exists
  const idx = emotions.findIndex((e) => e.date === entry.date);
  if (idx >= 0) emotions[idx] = entry;
  else emotions.push(entry);
  saveEmotions(emotions);
}
