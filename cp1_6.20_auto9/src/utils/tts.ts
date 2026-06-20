export function speak(text: string, lang: string = 'zh-CN'): void {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (!window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}
