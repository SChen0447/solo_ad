interface VoiceRecognitionCallbacks {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

let recognition: any = null;
let isListening = false;

const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

const getRecognition = () => {
  if (typeof window === 'undefined') return null;
  if (recognition) return recognition;
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  return recognition;
};

export const startListening = (callbacks: VoiceRecognitionCallbacks): boolean => {
  const rec = getRecognition();
  if (!rec) {
    callbacks.onError('语音识别不支持此浏览器');
    return false;
  }
  
  if (isListening) {
    stopListening();
  }
  
  rec.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    callbacks.onResult(transcript);
  };
  
  rec.onerror = (event: any) => {
    let errorMsg = '语音识别出错';
    switch (event.error) {
      case 'no-speech':
        errorMsg = '没有检测到语音';
        break;
      case 'audio-capture':
        errorMsg = '未检测到麦克风';
        break;
      case 'not-allowed':
        errorMsg = '麦克风权限被拒绝';
        break;
    }
    callbacks.onError(errorMsg);
  };
  
  rec.onend = () => {
    isListening = false;
    if (callbacks.onEnd) {
      callbacks.onEnd();
    }
  };
  
  rec.onstart = () => {
    isListening = true;
    if (callbacks.onStart) {
      callbacks.onStart();
    }
  };
  
  try {
    rec.start();
    return true;
  } catch (e) {
    callbacks.onError('启动语音识别失败');
    return false;
  }
};

export const stopListening = (): void => {
  const rec = getRecognition();
  if (rec && isListening) {
    try {
      rec.stop();
    } catch (e) {
      console.error('停止语音识别失败', e);
    }
    isListening = false;
  }
};

export const isVoiceRecognitionAvailable = (): boolean => {
  return isSpeechRecognitionSupported();
};
