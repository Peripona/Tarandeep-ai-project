// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudio } from "./useAudio";

let mockAudioRate: number | undefined = 0.9;
let mockAudioVoiceURI: string | null = null;

vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn((selector: (s: { settings: { audioRate: number | undefined; audioVoiceURI: string | null } }) => unknown) =>
    selector({ settings: { audioRate: mockAudioRate as number, audioVoiceURI: mockAudioVoiceURI } }),
  ),
}));

// jsdom does not implement SpeechSynthesisUtterance — provide a minimal stub
class SpeechSynthesisUtteranceStub {
  text: string;
  lang = "";
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: SpeechSynthesisUtteranceStub,
  writable: true,
  configurable: true,
});

const mockCancel = vi.fn();
const mockSpeak = vi.fn();
const mockGetVoices = vi.fn((): SpeechSynthesisVoice[] => []);

beforeEach(() => {
  mockAudioRate = 0.9;
  mockAudioVoiceURI = null;
  mockCancel.mockClear();
  mockSpeak.mockClear();
  mockGetVoices.mockClear();
  Object.defineProperty(window, "speechSynthesis", {
    value: { cancel: mockCancel, speak: mockSpeak, getVoices: mockGetVoices },
    writable: true,
    configurable: true,
  });
});

describe("useAudio", () => {
  it("calls cancel then speak when speak() is called", () => {
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("Hallo");
    expect(utterance.lang).toBe("de-DE");
    expect(utterance.rate).toBe(0.9);
  });

  it("cancels speech when stop() is called", () => {
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.stop(); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels speech on unmount", () => {
    const { unmount } = renderHook(() => useAudio());
    unmount();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it("selects the matching voice when audioVoiceURI is set", () => {
    const fakeVoice = { voiceURI: "de-voice", name: "German Voice", lang: "de-DE" } as SpeechSynthesisVoice;
    mockGetVoices.mockReturnValueOnce([fakeVoice]);
    mockAudioVoiceURI = "de-voice";

    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });

    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.voice).toBe(fakeVoice);
  });

  it("falls back to 0.9 when audioRate is NaN", () => {
    mockAudioRate = NaN;
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.9);
  });

  it("falls back to 0.9 when audioRate is undefined", () => {
    mockAudioRate = undefined;
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.9);
  });

  it("falls back to 0.9 when audioRate is Infinity", () => {
    mockAudioRate = Infinity;
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.9);
  });

  it("clamps audioRate to 0.1 minimum", () => {
    mockAudioRate = 0.01;
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(0.1);
  });

  it("clamps audioRate to 10 maximum", () => {
    mockAudioRate = 50;
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.rate).toBe(10);
  });
});
