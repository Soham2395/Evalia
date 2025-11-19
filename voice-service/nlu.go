package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// NLU provides question generation and field normalization
type NLU interface {
	GenerateQuestion(state DialogState, fields DialogFields) (string, error)
	ExtractField(expected string, utterance string, fields DialogFields) (string, error)
}

// OpenAINLU implements NLU using OpenAI Chat Completions
type OpenAINLU struct {
	apiKey string
	model  string
}

func NewOpenAINLU() *OpenAINLU {
	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAINLU{
		apiKey: os.Getenv("OPENAI_API_KEY"),
		model:  model,
	}
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float32         `json:"temperature,omitempty"`
}

type openAIChoice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type openAIResponse struct {
	Choices []openAIChoice `json:"choices"`
}

func (o *OpenAINLU) chat(system, user string) (string, error) {
	if o.apiKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY not set")
	}
	body := openAIRequest{
		Model: o.model,
		Messages: []openAIMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		Temperature: 0.2,
	}
	data, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("openai error: %s", string(b))
	}
	var out openAIResponse
	if err := json.Unmarshal(b, &out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("no choices")
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

func (o *OpenAINLU) GenerateQuestion(state DialogState, fields DialogFields) (string, error) {
	system := "You generate concise, friendly one-sentence questions to collect interview setup fields. Keep it under 18 words."
	want := ""
	switch state {
	case StateAskRole:
		want = "Ask for the target role/title the user wants to train for."
	case StateAskType:
		want = "Ask whether the interview should be technical, behavioral, or mixed (offer those three options)."
	case StateAskLevel:
		want = "Ask the experience level (Intern, Junior, Mid, Senior, Staff, Principal, or Lead)."
	case StateAskTechStack:
		want = "Ask for technologies/stack to focus on, with examples like React, Next.js, Node.js."
	case StateAskAmount:
		want = "Ask how many questions to prepare (a number like 5 or 10)."
	default:
		want = "Ask a clarifying question."
	}
	user := fmt.Sprintf("Known fields: %+v\nGenerate question: %s", fields, want)
	return o.chat(system, user)
}

func (o *OpenAINLU) ExtractField(expected string, utterance string, fields DialogFields) (string, error) {
	system := "You extract a SINGLE field value in a strict, normalized form. Return ONLY the value, no extra words.\nType must be one of: technical, behavioral, mixed. Level must be one of: Intern, Junior, Mid, Senior, Staff, Principal, Lead. Amount must be an integer 1-20. Techstack should be a comma-separated list of technologies in Title Case. Role is a concise title in Title Case."
	user := fmt.Sprintf("Expected field: %s\nUser said: %s\nKnown fields: %+v", expected, utterance, fields)
	val, err := o.chat(system, user)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(val), nil
}
