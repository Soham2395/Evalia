/**
 * Voice Client for WebSocket communication with Go microservice
 */

export interface VoiceClientConfig {
  url: string;
  onTranscript?: (transcript: string, role: 'user' | 'assistant', isFinal: boolean) => void;
  onPrompt?: (content: string) => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private config: VoiceClientConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  constructor(config: VoiceClientConfig) {
    this.config = config;
  }

  async connect(username: string, userid: string, mode: 'generate' | 'interview', questions?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.config.onConnectionChange?.(true);

          // Send start message
          this.send({
            type: 'start',
            username,
            userid,
            mode,
            questions,
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.config.onError?.('Connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.config.onConnectionChange?.(false);
          this.stopRecording();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'transcript':
          this.config.onTranscript?.(message.transcript, message.role, true);
          break;

        case 'transcript_partial':
          this.config.onTranscript?.(message.transcript, message.role, false);
          break;

        case 'prompt':
          this.config.onPrompt?.(message.content);
          this.config.onTranscript?.(message.content, 'assistant', true);
          break;

        case 'audio':
          if (message.audio) {
            // Convert base64 or array to ArrayBuffer and play
            const audioData = this.base64ToArrayBuffer(message.audio);
            this.config.onAudio?.(audioData);
            this.playAudio(audioData);
          }
          break;

        case 'error':
          this.config.onError?.(message.error);
          break;

        case 'done':
          this.config.onDone?.();
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Create audio context (use device sample rate, we will downsample to 16kHz)
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create a ScriptProcessorNode for PCM capture
      const bufferSize = 4096; // typical sizes: 1024, 2048, 4096
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const inputBuffer = event.inputBuffer.getChannelData(0); // Float32 [-1, 1]

        // Downsample to 16kHz if needed
        const inputSampleRate = this.audioContext!.sampleRate;
        const targetSampleRate = 16000;
        const downsampled = this.downsampleBuffer(inputBuffer, inputSampleRate, targetSampleRate);

        // Convert Float32 to 16-bit PCM
        const pcm16 = this.floatTo16BitPCM(downsampled);

        // Base64 encode and send
        const b64 = this.arrayBufferToBase64(pcm16.buffer);
        this.send({ type: 'audio', audio: b64 });
      };

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Recording started (PCM 16kHz)');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.config.onError?.('Failed to access microphone');
      throw error;
    }
  }

  stopRecording(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.sourceNode) {
      const stream = this.sourceNode.mediaStream;
      stream.getTracks().forEach(t => t.stop());
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRecording = false;
    console.log('Recording stopped');
  }

  disconnect(): void {
    this.stopRecording();

    if (this.ws) {
      this.send({ type: 'stop' });
      this.ws.close();
      this.ws = null;
    }
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null as unknown as number[], Array.from(chunk));
    }
    return btoa(binary);
  }

  private downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate: number): Float32Array {
    if (targetSampleRate === inputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      // simple averaging to reduce aliasing
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / (count || 1);
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private floatTo16BitPCM(float32: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buffer);
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
