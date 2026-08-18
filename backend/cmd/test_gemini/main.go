package main

import (
	"context"
	"errors"
	"fmt"
	"io"

	"ai-share-safe/backend/internal/config"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	cfg := config.LoadConfig()
	key := cfg.GeminiAPIKeys[0]
	ctx := context.Background()

	client, err := genai.NewClient(ctx, option.WithAPIKey(key))
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer client.Close()

	candidates := []string{
		"gemini-3.5-flash",
		"gemini-3.5-flash-lite",
		"gemini-3.6-flash",
		"gemini-2.5-flash",
		"gemini-2.5-pro",
	}

	for _, m := range candidates {
		fmt.Printf("👉 Testing Streaming với '%s'...", m)
		model := client.GenerativeModel(m)
		cs := model.StartChat()
		iter := cs.SendMessageStream(ctx, genai.Text("Xin chào, hãy giới thiệu ngắn gọn trong 1 câu."))
		var fullText string
		var streamErr error
		for {
			resp, err := iter.Next()
			if errors.Is(err, iterator.Done) || errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				streamErr = err
				break
			}
			for _, cand := range resp.Candidates {
				if cand.Content != nil {
					for _, part := range cand.Content.Parts {
						if t, ok := part.(genai.Text); ok {
							fullText += string(t)
						}
					}
				}
			}
		}

		if streamErr != nil {
			fmt.Printf(" ❌ Lỗi: %v\n", streamErr)
		} else {
			fmt.Printf(" ✅ THÀNH CÔNG!\n   Phản hồi: %s\n\n", fullText)
		}
	}
}
