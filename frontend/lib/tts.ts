// Text-to-speech (feature 5: อ่านผลลัพธ์ให้ฟัง) — Web Speech API wrapper.
// Picks a Thai voice when available; degrades to the default voice otherwise.

export interface TtsResult {
  supported: boolean;
  error?: string;
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): TtsResult {
  if (!ttsSupported()) {
    return { supported: false, error: "เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง" };
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const thai = voices.find((v) => v.lang.toLowerCase().startsWith("th"));
    if (thai) utterance.voice = thai;
    window.speechSynthesis.speak(utterance);
    return { supported: true };
  } catch (err) {
    return { supported: true, error: err instanceof Error ? err.message : String(err) };
  }
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}