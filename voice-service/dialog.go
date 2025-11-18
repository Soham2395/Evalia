package main

import (
	"log"
	"strings"
	"regexp"
	"strconv"
)

type DialogState int

const (
	StateGreeting DialogState = iota
	StateAskRole
	StateAskType
	StateAskLevel
	StateAskTechStack
	StateAskAmount
	StateComplete
)

type DialogFields struct {
	Username  string `json:"username"`
	UserID    string `json:"userid"`
	Role      string `json:"role"`
	Type      string `json:"type"`
	Level     string `json:"level"`
	TechStack string `json:"techstack"`
	Amount    string `json:"amount"`
}

type Dialog struct {
	state      DialogState
	fields     DialogFields
	onComplete func(DialogFields)
	nlu        NLU
}

func NewDialog(username, userid string, onComplete func(DialogFields), nlu NLU) *Dialog {
	return &Dialog{
		state: StateGreeting,
		fields: DialogFields{
			Username: username,
			UserID:   userid,
		},
		onComplete: onComplete,
		nlu:        nlu,
	}
}

func (d *Dialog) Start(speak func(string)) {
	d.state = StateAskRole
	d.ask(speak)
}

func (d *Dialog) ProcessUserInput(input string, speak func(string)) {
	input = strings.TrimSpace(input)
	if input == "" {
		speak("I didn't catch that. Could you please repeat?")
		return
	}

	log.Printf("Dialog state: %d, input: %s", d.state, input)

	switch d.state {
	case StateAskRole:
		if d.nlu != nil {
			if val, err := d.nlu.ExtractField("role", input, d.fields); err == nil && strings.TrimSpace(val) != "" {
				d.fields.Role = val
			} else {
				d.fields.Role = normalizeRole(input)
			}
		} else {
			d.fields.Role = normalizeRole(input)
		}
		d.state = StateAskType
		d.ask(speak)

	case StateAskType:
		// Heuristic: if user answered with a level instead, capture it and ask tech stack next
		if lvl := detectLevel(input); lvl != "" {
			d.fields.Level = lvl
			if d.fields.Type == "" {
				// Ask Type again since it was skipped
				d.ask(speak)
				d.state = StateAskType
			} else {
				d.state = StateAskTechStack
				d.ask(speak)
			}
			return
		}

		if d.nlu != nil {
			if val, err := d.nlu.ExtractField("type", input, d.fields); err == nil && strings.TrimSpace(val) != "" {
				lower := strings.ToLower(val)
				if lower == "technical" || lower == "behavioral" || lower == "mixed" {
					d.fields.Type = lower
				}
			}
		}
		if d.fields.Type == "" {
			if tp := detectType(input); tp != "" {
				d.fields.Type = tp
			} else {
				// Ask to choose valid option
				speak("Please choose one: technical, behavioral, or mixed.")
				return
			}
		}
		d.state = StateAskLevel
		d.ask(speak)

	case StateAskLevel:
		// Heuristic: some users say 'technical' here; treat it as Type and re-ask level
		if tp := detectType(input); tp != "" {
			if d.fields.Type == "" {
				d.fields.Type = tp
			}
			d.ask(speak)
			d.state = StateAskLevel
			return
		}
		if d.nlu != nil {
			if val, err := d.nlu.ExtractField("level", input, d.fields); err == nil && strings.TrimSpace(val) != "" {
				d.fields.Level = val
			}
		}
		if d.fields.Level == "" {
			if lvl := detectLevel(input); lvl != "" {
				d.fields.Level = lvl
			} else {
				// keep original if cannot map but prompt examples
				d.fields.Level = input
			}
		}
		d.state = StateAskTechStack
		d.ask(speak)

	case StateAskTechStack:
		if d.nlu != nil {
			if val, err := d.nlu.ExtractField("techstack", input, d.fields); err == nil && strings.TrimSpace(val) != "" {
				d.fields.TechStack = normalizeTechStack(val)
			} else {
				d.fields.TechStack = normalizeTechStack(input)
			}
		} else {
			d.fields.TechStack = normalizeTechStack(input)
		}
		d.state = StateAskAmount
		d.ask(speak)

	case StateAskAmount:
		if d.nlu != nil {
			if val, err := d.nlu.ExtractField("amount", input, d.fields); err == nil && strings.TrimSpace(val) != "" {
				d.fields.Amount = parseAmount(val)
			} else {
				d.fields.Amount = parseAmount(input)
			}
		} else {
			d.fields.Amount = parseAmount(input)
		}
		d.state = StateComplete
		speak("Perfect! I'm generating your personalized interview now. This will take a moment.")
		
		// Trigger completion
		if d.onComplete != nil {
			d.onComplete(d.fields)
		}
	}
}

// --- Helpers ---

// ask generates a context-aware question via NLU with safe fallbacks
func (d *Dialog) ask(speak func(string)) {
    if d.nlu != nil {
        if q, err := d.nlu.GenerateQuestion(d.state, d.fields); err == nil && strings.TrimSpace(q) != "" {
            speak(q)
            return
        }
    }
    // Fallback prompts if NLU unavailable or errors
    speak(d.fallbackQuestion())
}

func (d *Dialog) fallbackQuestion() string {
    switch d.state {
    case StateAskRole:
        return "What role would you like to train for?"
    case StateAskType:
        return "Got it. Are you aiming for a technical, behavioral, or mixed interview?"
    case StateAskLevel:
        return "What is the job experience level required? For example: Intern, Junior, Mid, Senior, Staff, or Principal."
    case StateAskTechStack:
        return "What technologies or tech stack should we cover during the interview? You can say things like 'React, Next.js, Node.js'."
    case StateAskAmount:
        return "How many questions would you like me to prepare for you? (say a number like 5 or 10)"
    default:
        return "Could you clarify that?"
    }
}

func normalizeRole(input string) string {
	s := strings.TrimSpace(input)
	s = strings.TrimPrefix(strings.ToLower(s), "a ")
	s = strings.TrimPrefix(s, "an ")
	s = strings.TrimPrefix(s, "the ")
	// Remove leading phrases like "I want to train for", "for", etc.
	s = strings.TrimPrefix(s, "i want to train for ")
	s = strings.TrimPrefix(s, "train for ")
	s = strings.TrimPrefix(s, "for ")
	s = strings.TrimSpace(s)
	// Title-case words
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	out := strings.Join(words, " ")
	if out == "" {
		out = input
	}
	return out
}

func detectType(input string) string {
	s := strings.ToLower(input)
	switch {
	case strings.Contains(s, "technical"):
		return "technical"
	case strings.Contains(s, "behavioral") || strings.Contains(s, "behavioural"):
		return "behavioral"
	case strings.Contains(s, "mixed") || strings.Contains(s, "both"):
		return "mixed"
	default:
		return ""
	}
}

func detectLevel(input string) string {
	s := strings.ToLower(input)
	levels := []string{"intern", "junior", "mid", "mid-level", "senior", "staff", "principal", "lead"}
	for _, lvl := range levels {
		if strings.Contains(s, lvl) {
			if lvl == "mid-level" { return "Mid" }
			return strings.Title(lvl)
		}
	}
	// Heuristic: detect years like "2 years"; map to Mid for 2-4, Junior for 0-1, Senior 5+
	re := regexp.MustCompile(`(\d+)\s*(year|years|yr|yrs)`) 
	if m := re.FindStringSubmatch(s); len(m) == 3 {
		if n, err := strconv.Atoi(m[1]); err == nil {
			switch {
			case n >= 5:
				return "Senior"
			case n >= 2:
				return "Mid"
			default:
				return "Junior"
			}
		}
	}
	return ""
}

func normalizeTechStack(input string) string {
	s := strings.ToLower(input)
	// Replace connectors with commas
	s = strings.NewReplacer(" and ", ",", ";", ",", "|", ",").Replace(s)
	parts := strings.Split(s, ",")
	cleaned := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t == "" { continue }
		// Title-case tech names roughly
		words := strings.Fields(t)
		for i, w := range words {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
		cleaned = append(cleaned, strings.Join(words, " "))
	}
	return strings.Join(cleaned, ", ")
}

func parseAmount(input string) string {
	// Extract first integer; clamp between 1 and 20
	re := regexp.MustCompile(`\d+`)
	n := 10 // default
	if m := re.FindString(input); m != "" {
		if v, err := strconv.Atoi(m); err == nil {
			n = v
		}
	}
	if n < 1 { n = 1 }
	if n > 20 { n = 20 }
	return strconv.Itoa(n)
}
