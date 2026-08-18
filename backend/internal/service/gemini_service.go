package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync/atomic"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/model"
	"ai-share-safe/backend/internal/repository"
	"ai-share-safe/backend/pkg/logger"

	"github.com/google/generative-ai-go/genai"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type GeminiService struct {
	cfg      *config.Config
	msgRepo  *repository.MessageRepository
	convRepo *repository.ConversationRepository
	keyIndex uint64
}

func NewGeminiService(cfg *config.Config, msgRepo *repository.MessageRepository, convRepo *repository.ConversationRepository) *GeminiService {
	return &GeminiService{
		cfg:      cfg,
		msgRepo:  msgRepo,
		convRepo: convRepo,
		keyIndex: 0,
	}
}

// GetNextAPIKey returns an API key from the pool using round-robin
func (s *GeminiService) GetNextAPIKey() (string, error) {
	keys := s.cfg.GeminiAPIKeys
	if len(keys) == 0 {
		return "", errors.New("no Gemini API keys configured on server")
	}

	idx := atomic.AddUint64(&s.keyIndex, 1) - 1
	selectedKey := keys[idx%uint64(len(keys))]
	return selectedKey, nil
}

type StreamCallback func(chunk string) error

// StreamChat handles multi-turn conversation with Gemini and streams response chunks
func (s *GeminiService) StreamChat(
	ctx context.Context,
	conversation *model.Conversation,
	userPrompt string,
	modelOverride string,
	temperature float32,
	onChunk StreamCallback,
) (string, error) {
	if len(s.cfg.GeminiAPIKeys) == 0 {
		return "", errors.New("Gemini API key is not configured on the backend server")
	}

	// Model selection
	selectedModel := conversation.Model
	if modelOverride != "" {
		selectedModel = modelOverride
	}
	if selectedModel == "" {
		selectedModel = s.cfg.DefaultModel
	}

	// Fetch recent conversation history for sliding window
	recentMessages, err := s.msgRepo.GetRecentMessages(conversation.ID, s.cfg.MaxContextMessages)
	if err != nil {
		logger.Log.Warn("Failed to fetch conversation history, proceeding without prior context", zap.Error(err))
	}

	// Save User Message to DB first
	userMsg := &model.Message{
		ConversationID: conversation.ID,
		Role:           model.RoleUser,
		Content:        userPrompt,
	}
	if err := s.msgRepo.Create(userMsg); err != nil {
		logger.Log.Error("Failed to save user message to database", zap.Error(err))
	}

	// Update conversation title if this is the first message
	if conversation.Title == "Cuộc trò chuyện mới" || conversation.Title == "Hội thoại mới" {
		runes := []rune(strings.TrimSpace(userPrompt))
		if len(runes) > 0 {
			newTitle := string(runes)
			if len(runes) > 35 {
				newTitle = string(runes[:35]) + "..."
			}
			conversation.Title = newTitle
			_ = s.convRepo.Update(conversation)
		}
	}

	// List of model candidates to try (target model first, then compatible fallback models)
	modelCandidates := []string{selectedModel}
	for _, fallback := range []string{"gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"} {
		if fallback != selectedModel {
			modelCandidates = append(modelCandidates, fallback)
		}
	}

	// Attempt generation with key fallback and model fallback
	maxAttempts := len(s.cfg.GeminiAPIKeys)
	if maxAttempts == 0 {
		maxAttempts = 1
	}

	var fullResponse strings.Builder
	var lastErr error

	for _, modelName := range modelCandidates {
		for attempt := 0; attempt < maxAttempts; attempt++ {
			apiKey, err := s.GetNextAPIKey()
			if err != nil {
				return "", err
			}

			fullResponse.Reset()
			err = s.executeStream(ctx, apiKey, modelName, conversation.SystemPrompt, recentMessages, userPrompt, temperature, func(chunk string) error {
				fullResponse.WriteString(chunk)
				return onChunk(chunk)
			})

			if err == nil {
				// Update conversation model to working model if it changed
				if conversation.Model != modelName {
					conversation.Model = modelName
					_ = s.convRepo.Update(conversation)
				}

				// Success! Save assistant message to DB
				assistantMsg := &model.Message{
					ConversationID: conversation.ID,
					Role:           model.RoleAssistant,
					Content:        fullResponse.String(),
				}
				if saveErr := s.msgRepo.Create(assistantMsg); saveErr != nil {
					logger.Log.Error("Failed to save assistant message to database", zap.Error(saveErr))
				}
				return fullResponse.String(), nil
			}

			// Check if client cancelled request
			if errors.Is(ctx.Err(), context.Canceled) {
				logger.Log.Info("Client aborted chat stream")
				if fullResponse.Len() > 0 {
					partialMsg := &model.Message{
						ConversationID: conversation.ID,
						Role:           model.RoleAssistant,
						Content:        fullResponse.String() + "\n\n*(Đã dừng sinh)*",
					}
					_ = s.msgRepo.Create(partialMsg)
				}
				return fullResponse.String(), nil
			}

			lastErr = err
			logger.Log.Warn(fmt.Sprintf("Gemini API call failed with model '%s', key %d/%d: %v", modelName, attempt+1, maxAttempts, err))

			// If it's a 404 (Model not found/deprecated), break to next model candidate immediately
			if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "no longer available") {
				break
			}
		}
	}

	return "", fmt.Errorf("all Gemini models and keys failed. Last error: %w", lastErr)
}

func (s *GeminiService) executeStream(
	ctx context.Context,
	apiKey string,
	modelName string,
	systemPrompt string,
	history []model.Message,
	userPrompt string,
	temperature float32,
	onChunk StreamCallback,
) error {
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("failed to create genai client: %w", err)
	}
	defer client.Close()

	genModel := client.GenerativeModel(modelName)
	if temperature > 0 {
		genModel.SetTemperature(temperature)
	}

	// Set system instruction if present
	if strings.TrimSpace(systemPrompt) != "" {
		genModel.SystemInstruction = &genai.Content{
			Parts: []genai.Part{genai.Text(systemPrompt)},
		}
	}

	// Setup Safety Settings (allow standard development/general assistance without aggressive false-positives)
	genModel.SafetySettings = []*genai.SafetySetting{
		{
			Category:  genai.HarmCategoryHarassment,
			Threshold: genai.HarmBlockOnlyHigh,
		},
		{
			Category:  genai.HarmCategoryHateSpeech,
			Threshold: genai.HarmBlockOnlyHigh,
		},
		{
			Category:  genai.HarmCategorySexuallyExplicit,
			Threshold: genai.HarmBlockOnlyHigh,
		},
		{
			Category:  genai.HarmCategoryDangerousContent,
			Threshold: genai.HarmBlockOnlyHigh,
		},
	}

	// Create Chat session with history
	cs := genModel.StartChat()
	var chatHistory []*genai.Content

	for _, msg := range history {
		if strings.TrimSpace(msg.Content) == "" {
			continue
		}
		role := "user"
		if msg.Role == model.RoleAssistant {
			role = "model"
		}
		chatHistory = append(chatHistory, &genai.Content{
			Role:  role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}
	cs.History = chatHistory

	// Send message streaming
	iter := cs.SendMessageStream(ctx, genai.Text(userPrompt))
	for {
		resp, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return err
		}

		for _, cand := range resp.Candidates {
			if cand.Content != nil {
				for _, part := range cand.Content.Parts {
					if text, ok := part.(genai.Text); ok {
						if err := onChunk(string(text)); err != nil {
							return err
						}
					}
				}
			}
		}
	}

	return nil
}
