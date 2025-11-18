package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type GenerateRequest struct {
	Type      string `json:"type"`
	Role      string `json:"role"`
	Level     string `json:"level"`
	TechStack string `json:"techstack"`
	Amount    string `json:"amount"`
	UserID    string `json:"userid"`
}

type GenerateResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

func GenerateInterview(fields DialogFields) error {
	mainAppURL := os.Getenv("MAIN_APP_URL")
	endpoint := os.Getenv("MAIN_APP_GENERATE_ENDPOINT")
	if endpoint == "" {
		endpoint = "/api/vapi/generate"
	}

	target := mainAppURL + endpoint

	reqBody := GenerateRequest{
		Type:      fields.Type,
		Role:      fields.Role,
		Level:     fields.Level,
		TechStack: fields.TechStack,
		Amount:    fields.Amount,
		UserID:    fields.UserID,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	log.Printf("Generating interview via: %s", target)
	req, err := http.NewRequest("POST", target, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		// Handle common local dev mistake: using https://localhost against an http dev server
		if strings.Contains(err.Error(), "server gave HTTP response to HTTPS client") || strings.Contains(err.Error(), "tls:") {
			if parsed, pErr := url.Parse(target); pErr == nil {
				if parsed.Scheme == "https" && (parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1") {
					parsed.Scheme = "http"
					fallback := parsed.String()
					log.Printf("HTTPS failed against localhost, retrying over HTTP: %s", fallback)
					req2, r2 := http.NewRequest("POST", fallback, bytes.NewBuffer(jsonData))
					if r2 == nil {
						req2.Header.Set("Content-Type", "application/json")
						resp2, e2 := client.Do(req2)
						if e2 == nil {
							resp = resp2
							err = nil
						} else {
							return fmt.Errorf("failed to call generate API (retry http): %w", e2)
						}
					} else {
						return fmt.Errorf("failed to create retry request: %w", r2)
					}
				} else {
					return fmt.Errorf("failed to call generate API: %w", err)
				}
			} else {
				return fmt.Errorf("failed to parse URL for retry: %w", pErr)
			}
		} else {
			return fmt.Errorf("failed to call generate API: %w", err)
		}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var result GenerateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("generate API error: %s", result.Error)
	}

	return nil
}
