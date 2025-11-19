package main

import (
	"encoding/base64"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type SessionMode string

const (
	ModeGenerate  SessionMode = "generate"
	ModeInterview SessionMode = "interview"
)

type Session struct {
	conn         *websocket.Conn
	username     string
	userid       string
	mode         SessionMode
	dialog       *Dialog
	sttClient    STTClient
	ttsClient    TTSClient
	audioBuffer  chan []byte
	done         chan struct{}
	mu           sync.Mutex
	isActive     bool
}

// STTClient abstracts the speech-to-text streaming client.
type STTClient interface {
	SendAudio([]byte) error
	Close()
}

// TTSClient abstracts the text-to-speech client.
type TTSClient interface {
	Synthesize(string) ([]byte, error)
}

type ClientMessage struct {
	Type      string    `json:"type"`
	Username  string    `json:"username,omitempty"`
	UserID    string    `json:"userid,omitempty"`
	Mode      string    `json:"mode,omitempty"`
	Audio     string    `json:"audio,omitempty"` // base64-encoded audio from browser
	Questions []string  `json:"questions,omitempty"`
}

type ServerMessage struct {
	Type       string `json:"type"`
	Content    string `json:"content,omitempty"`
	Role       string `json:"role,omitempty"`
	Transcript string `json:"transcript,omitempty"`
	Audio      []byte `json:"audio,omitempty"`
	Error      string `json:"error,omitempty"`
}

func NewSession(conn *websocket.Conn) *Session {
	return &Session{
		conn:        conn,
		audioBuffer: make(chan []byte, 100),
		done:        make(chan struct{}),
		isActive:    false,
	}
}

func (s *Session) Start() {
	defer func() {
		// Cleanup resources; do NOT close(s.done) here to avoid double close.
		s.cleanup()
	}()

	// Read initial start message
	var startMsg ClientMessage
	if err := s.conn.ReadJSON(&startMsg); err != nil {
		log.Printf("Failed to read start message: %v", err)
		s.sendError("Failed to read start message")
		return
	}

	if startMsg.Type != "start" {
		s.sendError("Expected 'start' message")
		return
	}

	s.username = startMsg.Username
	s.userid = startMsg.UserID
	s.mode = SessionMode(startMsg.Mode)

	log.Printf("Session started: user=%s, userid=%s, mode=%s", s.username, s.userid, s.mode)

	// Initialize STT client (Deepgram)
	var err error
	s.sttClient, err = NewDeepgramClient(s.onTranscript)
	if err != nil {
		log.Printf("Failed to create Deepgram client: %v", err)
		s.sendError("Failed to initialize speech recognition")
		return
	}

	// Prefer Amazon Polly if AWS is configured; fall back to ElevenLabs
	if os.Getenv("AWS_REGION") != "" {
		if pollyClient, err := NewPollyClient(); err == nil {
			log.Printf("Using Amazon Polly TTS (voice=%s)", os.Getenv("POLLY_VOICE_ID"))
			s.ttsClient = pollyClient
		} else {
			log.Printf("Polly init failed, falling back to ElevenLabs: %v", err)
			s.ttsClient = NewElevenLabsClient()
		}
	} else {
		s.ttsClient = NewElevenLabsClient()
	}

	// Initialize dialog based on mode
	if s.mode == ModeGenerate {
		// Create NLU (OpenAI) for AI-framed questions if key is present
		var nlu NLU
		if os.Getenv("OPENAI_API_KEY") != "" {
			nlu = NewOpenAINLU()
		}
		s.dialog = NewDialog(s.username, s.userid, s.onDialogComplete, nlu)
	}

	s.isActive = true

	// Start listening for audio and messages
	go s.readMessages()
	go s.processAudio()

	// Start the dialog
	if s.mode == ModeGenerate {
		s.dialog.Start(s.speak)
	} else {
		// For interview mode, just start listening
		s.speak("Hello " + s.username + ". I'm ready to conduct your interview. Please answer each question clearly.")
	}

	// Wait for completion
	<-s.done
}

func (s *Session) readMessages() {
	defer func() {
		s.isActive = false
		// Close done channel once to signal end of session
		select {
		case <-s.done:
			// already closed
		default:
			close(s.done)
		}
	}()

	for {
		var msg ClientMessage
		if err := s.conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			return
		}

		switch msg.Type {
		case "audio":
			if msg.Audio != "" {
				// Decode base64 audio string to raw bytes before enqueueing
				decoded, err := base64.StdEncoding.DecodeString(msg.Audio)
				if err != nil {
					log.Printf("Failed to decode base64 audio: %v", err)
					break
				}
				select {
				case s.audioBuffer <- decoded:
				default:
					log.Println("Audio buffer full, dropping packet")
				}
			}
		case "stop":
			log.Println("Client requested stop")
			return
		}
	}
}

func (s *Session) processAudio() {
	for {
		select {
		case audio := <-s.audioBuffer:
			if s.sttClient != nil && s.isActive {
				if err := s.sttClient.SendAudio(audio); err != nil {
					log.Printf("Failed to send audio to STT: %v", err)
					// If STT socket is closed, stop processing further audio
					if strings.Contains(err.Error(), "close") {
						return
					}
				}
			}
		case <-s.done:
			return
		}
	}
}

func (s *Session) onTranscript(transcript string, isFinal bool) {
	if !isFinal {
		// Send partial transcript for display
		s.sendMessage(ServerMessage{
			Type:       "transcript_partial",
			Transcript: transcript,
			Role:       "user",
		})
		return
	}

	// Send final transcript
	s.sendMessage(ServerMessage{
		Type:       "transcript",
		Transcript: transcript,
		Role:       "user",
	})

	// Process based on mode
	if s.mode == ModeGenerate && s.dialog != nil {
		s.dialog.ProcessUserInput(transcript, s.speak)
	}
}

func (s *Session) onDialogComplete(fields DialogFields) {
	log.Printf("Dialog complete: %+v", fields)

	// Call main app to generate interview
	go func() {
		if err := GenerateInterview(fields); err != nil {
			log.Printf("Failed to generate interview: %v", err)
			s.speak("I'm sorry, there was an error generating your interview. Please try again.")
			s.sendError(err.Error())
		} else {
			s.speak("Perfect! Your interview has been generated successfully. You can check your dashboard now. Thank you!")
			time.Sleep(2 * time.Second)
			s.sendMessage(ServerMessage{Type: "done"})
		}
	}()
}

func (s *Session) speak(text string) {
	log.Printf("Speaking: %s", text)

	// Send text to client for display
	s.sendMessage(ServerMessage{
		Type:    "prompt",
		Content: text,
		Role:    "assistant",
	})

	// Generate and stream TTS audio
	if s.ttsClient != nil {
		audioData, err := s.ttsClient.Synthesize(text)
		if err != nil {
			log.Printf("TTS error: %v", err)
			return
		}

		// Send audio to client
		s.sendMessage(ServerMessage{
			Type:  "audio",
			Audio: audioData,
		})
	}
}

func (s *Session) sendMessage(msg ServerMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.conn.WriteJSON(msg); err != nil {
		log.Printf("Failed to send message: %v", err)
	}
}

func (s *Session) sendError(errMsg string) {
	s.sendMessage(ServerMessage{
		Type:  "error",
		Error: errMsg,
	})
}

func (s *Session) cleanup() {
	log.Println("Cleaning up session")

	if s.sttClient != nil {
		s.sttClient.Close()
	}

	s.conn.Close()
}
