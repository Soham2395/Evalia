package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type ElevenLabsClient struct {
	apiKey  string
	voiceID string
	client  *http.Client
}

type ElevenLabsRequest struct {
	Text          string                 `json:"text"`
	ModelID       string                 `json:"model_id"`
	VoiceSettings map[string]interface{} `json:"voice_settings"`
}

func NewElevenLabsClient() *ElevenLabsClient {
	voiceID := os.Getenv("ELEVENLABS_VOICE_ID")
	if voiceID == "" {
		voiceID = "21m00Tcm4TlvDq8ikWAM" // Default voice (Rachel)
	}

	return &ElevenLabsClient{
		apiKey:  os.Getenv("ELEVENLABS_API_KEY"),
		voiceID: voiceID,
		client:  &http.Client{},
	}
}

func (c *ElevenLabsClient) Synthesize(text string) ([]byte, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("ELEVENLABS_API_KEY not set")
	}

	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", c.voiceID)

	// Use a current model compatible with free tier; v1 models are deprecated for free tier.
	// Options include: "eleven_turbo_v2" or "eleven_multilingual_v2".
	reqBody := ElevenLabsRequest{
		Text:    text,
		ModelID: "eleven_turbo_v2",
		VoiceSettings: map[string]interface{}{
			"stability":        0.5,
			"similarity_boost": 0.75,
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "audio/mpeg")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call ElevenLabs API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ElevenLabs API error (status %d): %s", resp.StatusCode, string(body))
	}

	audioData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio data: %w", err)
	}

	return audioData, nil
}
