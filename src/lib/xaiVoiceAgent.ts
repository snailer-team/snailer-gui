export interface XaiVoiceConfig {
  sourceLang: string;
  targetLang: string;
  xaiApiKey: string;
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: { error?: unknown }) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void | Promise<void>) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export class XaiVoiceAgent {
  private recognition?: SpeechRecognitionLike;
  private synth = window.speechSynthesis;
  private config: XaiVoiceConfig;
  private isActive = false;

  constructor(config: XaiVoiceConfig) {
    this.config = config;
  }

  async start() {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.sourceLang;

    this.recognition.onstart = () => {
      console.log('xAI Voice Agent: Listening...');
      this.isActive = true;
    };

    this.recognition.onerror = (event) => {
      console.error('xAI Voice Agent error:', event.error);
    };

    this.recognition.onend = () => {
      if (this.isActive) {
        // Auto-restart for continuous operation
        this.recognition!.start();
      }
    };

    this.recognition.onresult = async (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript.trim()) {
        console.log('Input:', finalTranscript);
        const translated = await this.translate(finalTranscript);
        this.speak(translated, this.config.targetLang);
      }
    };

    await this.recognition.start();
  }

  private async translate(text: string): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{
          role: 'user',
          content: `Translate to ${this.config.targetLang.split('-')[0]}: "${text}". Respond ONLY with the translated text, no extras.`
        }],
        max_tokens: 512,
        temperature: 0.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private speak(text: string, lang: string) {
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    this.synth.speak(utterance);
  }

  stop() {
    this.isActive = false;
    this.recognition?.stop();
  }
}
