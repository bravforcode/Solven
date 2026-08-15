// Voice input (feature 4: พิมพ์ด้วยเสียง) — Web Speech API wrapper.
// Graceful degradation: returns { supported: false } when the browser has no
// SpeechRecognition (e.g. Firefox), so the UI can hide the mic button.

export interface VoiceResult {
  supported: boolean;
  transcript?: string;
  error?: string;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor =
    (w.SpeechRecognition as new () => SpeechRecognitionLike) ??
    (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) ??
    null;
  return Ctor ? new Ctor() : null;
}

/** One-shot listen: resolves with the final transcript or an error. */
export function listenOnce(timeoutMs = 8000): Promise<VoiceResult> {
  return new Promise((resolve) => {
    const rec = getRecognition();
    if (!rec) {
      resolve({ supported: false, error: "เบราว์เซอร์นี้ไม่รองรับการพิมพ์ด้วยเสียง" });
      return;
    }
    let settled = false;
    const finish = (result: VoiceResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      resolve(result);
    };
    const timer = setTimeout(() => finish({ supported: true, error: "หมดเวลาฟังเสียง (8 วินาที)" }), timeoutMs);
    rec.lang = "th-TH";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (event) => {
      const results = event.results;
      if (results.length > 0 && results[0].length > 0) {
        finish({ supported: true, transcript: results[0][0].transcript });
      }
    };
    rec.onerror = (event) => finish({ supported: true, error: `เกิดข้อผิดพลาด: ${event.error}` });
    rec.onend = () => finish({ supported: true, error: "หยุดฟังก่อนได้ยินเสียง" });
    try {
      rec.start();
    } catch (err) {
      finish({ supported: true, error: err instanceof Error ? err.message : String(err) });
    }
  });
}