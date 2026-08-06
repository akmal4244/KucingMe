export interface SpeechCommand {
  direction?: 'depan' | 'belakang' | 'kiri' | 'kanan';
  steps?: number;
  action?: 'pusing' | 'lompat';
  modifier?: 'lari';
  rawText: string;
}

const numberMap: Record<string, number> = {
  'satu': 1, 'se': 1, '1': 1, 'sato': 1, 'set': 1,
  'dua': 2, '2': 2, 'do': 2,
  'tiga': 3, '3': 3, 'tige': 3,
  'empat': 4, '4': 4, 'pat': 4, 'ampek': 4,
  'lima': 5, '5': 5, 'lime': 5,
  'enam': 6, '6': 6, 'nam': 6, 'anam': 6,
  'tujuh': 7, '7': 7, 'tuju': 7,
  'lapan': 8, '8': 8, 'pan': 8, 'delapan': 8,
  'sembilan': 9, '9': 9, 'bilan': 9,
  'sepuluh': 10, '10': 10, 'puluh': 10
};

export class SpeechService {
  recognition: any;
  isListening: boolean = false;
  onCommand?: (command: SpeechCommand) => void;
  onText?: (text: string) => void;
  private restartTimeout: any;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ms-MY';
      // Use continuous false for faster results. We restart it automatically.
      this.recognition.continuous = true; 
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript.toLowerCase().trim();
        if (text) {
          if (this.onText) this.onText(text);
          this.parseCommand(text);
        } else if (interimTranscript) {
          if (this.onText) this.onText(`... ${interimTranscript.toLowerCase().trim()} ...`);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
           clearTimeout(this.restartTimeout);
           this.restartTimeout = setTimeout(() => {
             if (this.isListening) {
               try { this.recognition.start(); } catch (e) {}
             }
           }, 100);
        }
      };
      
      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.error("Speech recognition error", event.error);
        }
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
           this.isListening = false;
        }
      }
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }
  }

  start() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      clearTimeout(this.restartTimeout);
      this.recognition.stop();
    }
  }

  parseCommand(text: string) {
    if (text.includes('pusing') || text.includes('pusing-pusing') || text.includes('berpusing') || text.includes('using') || text.includes('pusinglah') || text.includes('pusing la')) {
      if (this.onCommand) this.onCommand({ action: 'pusing', rawText: text });
      return;
    }

    if (text.includes('lompat') || text.includes('terbang') || text.includes('lompak') || text.includes('lumpat') || text.includes('ompat') || text.includes('melompat')) {
      if (this.onCommand) this.onCommand({ action: 'lompat', rawText: text });
      return;
    }

    let direction: SpeechCommand['direction'] | undefined = undefined;
    let steps = 1;
    let modifier: SpeechCommand['modifier'] | undefined = undefined;

    if (text.includes('lari') || text.includes('laju') || text.includes('cepat') || text.includes('pantas') || text.includes('bergegas') || text.includes('kencang') || text.includes('lekas')) {
      modifier = 'lari';
    }
    
    if (text.includes('depan') || text.includes('hadapan') || text.includes('maju') || text.includes('atas') || text.includes('straight') || text.includes('lurus') || text.includes('terus') || text.includes('mara') || text.includes('jalan') || text.includes('pi depan') || text.includes('pergi depan') || text.includes('kedepan')) {
      direction = 'depan';
    } else if (text.includes('belakang') || text.includes('undur') || text.includes('bawah') || text.includes('back') || text.includes('reverse') || text.includes('patah balik') || text.includes('gostan') || text.includes('kebelakang') || text.includes('pi belakang')) {
      direction = 'belakang';
    } else if (text.includes('kiri') || text.includes('left') || text.includes('belah kiri') || text.includes('kering') || text.includes('belok kiri') || text.includes('masuk kiri') || text.includes('ke kiri') || text.includes('pi kiri')) {
      direction = 'kiri';
    } else if (text.includes('kanan') || text.includes('right') || text.includes('belah kanan') || text.includes('belok kanan') || text.includes('masuk kanan') || text.includes('ke kanan') || text.includes('pi kanan')) {
      direction = 'kanan';
    }

    if (direction) {
      const words = text.split(' ');
      for (const word of words) {
        if (numberMap[word]) {
          steps = numberMap[word];
          break;
        }
      }
      
      const digitMatch = text.match(/\d+/);
      if (digitMatch) {
         steps = parseInt(digitMatch[0], 10);
      }

      if (this.onCommand) {
        this.onCommand({ direction, steps, modifier, rawText: text });
      }
    }
  }
}
