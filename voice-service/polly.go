package main

import (
	"context"
	"fmt"
	"io"
	"os"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/polly"
	"github.com/aws/aws-sdk-go-v2/service/polly/types"
)

// PollyClient implements TTSClient using Amazon Polly.
type PollyClient struct {
	client    *polly.Client
	voiceID   string
	engine    types.Engine
	format    types.OutputFormat
	langCode  types.LanguageCode
}

func NewPollyClient() (*PollyClient, error) {
	// Region is required; credentials can be picked up automatically from env/metadata
	region := os.Getenv("AWS_REGION")
	if region == "" {
		return nil, fmt.Errorf("AWS_REGION not set")
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(), awsconfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	voice := os.Getenv("POLLY_VOICE_ID")
	if voice == "" {
		voice = "Joanna"
	}

	engine := types.EngineNeural
	if os.Getenv("POLLY_STANDARD_ENGINE") == "1" {
		engine = types.EngineStandard
	}

	format := types.OutputFormatMp3
	if f := os.Getenv("POLLY_OUTPUT_FORMAT"); f == "pcm" {
		format = types.OutputFormatPcm
	} else if f == "ogg_vorbis" {
		format = types.OutputFormatOggVorbis
	}

	lang := types.LanguageCodeEnUs
	if lc := os.Getenv("POLLY_LANGUAGE_CODE"); lc != "" {
		lang = types.LanguageCode(lc)
	}

	return &PollyClient{
		client:   polly.NewFromConfig(cfg),
		voiceID:  voice,
		engine:   engine,
		format:   format,
		langCode: lang,
	}, nil
}

func (p *PollyClient) Synthesize(text string) ([]byte, error) {
	if p.client == nil {
		return nil, fmt.Errorf("polly client not initialized")
	}
	out, err := p.client.SynthesizeSpeech(context.Background(), &polly.SynthesizeSpeechInput{
		Text:         &text,
		OutputFormat: p.format,
		VoiceId:      types.VoiceId(p.voiceID),
		Engine:       p.engine,
		LanguageCode: p.langCode,
	})
	if err != nil {
		return nil, fmt.Errorf("polly synthesize error: %w", err)
	}
	defer out.AudioStream.Close()
	b, err := io.ReadAll(out.AudioStream)
	if err != nil {
		return nil, fmt.Errorf("read audio stream: %w", err)
	}
	return b, nil
}
