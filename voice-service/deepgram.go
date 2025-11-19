package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

type DeepgramClient struct {
	conn         *websocket.Conn
	onTranscript func(text string, isFinal bool)
	mu           sync.Mutex
	done         chan struct{}
}

func NewDeepgramClient(onTranscript func(string, bool)) (*DeepgramClient, error) {
	apiKey := os.Getenv("DEEPGRAM_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("DEEPGRAM_API_KEY not set")
	}

	// Deepgram realtime endpoint. Using linear16 16kHz mono.
	wsURL := "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&multichannel=false"

	headers := http.Header{}
	headers.Set("Authorization", "Token "+apiKey)
	headers.Set("User-Agent", "voice-service/1.0")

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Deepgram: %w", err)
	}

	c := &DeepgramClient{
		conn:         conn,
		onTranscript: onTranscript,
		done:         make(chan struct{}),
	}

	go c.readLoop()
	log.Println("Deepgram client connected")
	return c, nil
}

func (d *DeepgramClient) readLoop() {
	defer close(d.done)
	for {
		_, message, err := d.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Deepgram WebSocket error: %v", err)
			}
			return
		}

		// Deepgram messages are JSON; transcripts appear under channel.alternatives[0].transcript
		var payload map[string]interface{}
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Printf("Failed to parse Deepgram message: %v", err)
			continue
		}

		isFinal, _ := payload["is_final"].(bool)
		channel, _ := payload["channel"].(map[string]interface{})
		if channel == nil {
			continue
		}
		alts, _ := channel["alternatives"].([]interface{})
		if len(alts) == 0 {
			continue
		}
		first, _ := alts[0].(map[string]interface{})
		text, _ := first["transcript"].(string)
		if text != "" {
			d.onTranscript(text, isFinal)
		}
	}
}

func (d *DeepgramClient) SendAudio(pcm []byte) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	// Deepgram expects binary audio frames over WS
	return d.conn.WriteMessage(websocket.BinaryMessage, pcm)
}

func (d *DeepgramClient) Close() {
	d.mu.Lock()
	defer d.mu.Unlock()
	_ = d.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	_ = d.conn.Close()
	<-d.done
	log.Println("Deepgram client closed")
}
