import { useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function useAudio() {
  const audioRate = useAppStore((s) => s.settings.audioRate);
  const audioVoiceURI = useAppStore((s) => s.settings.audioVoiceURI);

  const speak = useCallback(
    (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.rate = audioRate;
      if (audioVoiceURI) {
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === audioVoiceURI);
        if (voice) utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    },
    [audioRate, audioVoiceURI],
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return { speak, stop };
}
