package service

import (
	"errors"
	"strings"

	"ai-share-safe/backend/internal/model"
	"ai-share-safe/backend/internal/repository"
)

type ConversationService struct {
	convRepo *repository.ConversationRepository
	msgRepo  *repository.MessageRepository
}

func NewConversationService(convRepo *repository.ConversationRepository, msgRepo *repository.MessageRepository) *ConversationService {
	return &ConversationService{
		convRepo: convRepo,
		msgRepo:  msgRepo,
	}
}

func (s *ConversationService) ListConversations(userID string) ([]model.Conversation, error) {
	return s.convRepo.ListByUserID(userID)
}

func (s *ConversationService) GetConversation(id, userID string) (*model.Conversation, []model.Message, error) {
	conv, err := s.convRepo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, nil, err
	}

	messages, err := s.msgRepo.ListByConversationID(id)
	if err != nil {
		return nil, nil, err
	}

	return conv, messages, nil
}

func (s *ConversationService) CreateConversation(userID, title, modelName, systemPrompt string) (*model.Conversation, error) {
	if title == "" {
		title = "Cuộc trò chuyện mới"
	}
	if modelName == "" {
		modelName = "gemini-2.0-flash"
	}

	conv := &model.Conversation{
		UserID:       userID,
		Title:        title,
		Model:        modelName,
		SystemPrompt: systemPrompt,
	}

	err := s.convRepo.Create(conv)
	return conv, err
}

func (s *ConversationService) DeleteConversation(id, userID string) error {
	return s.convRepo.Delete(id, userID)
}

func (s *ConversationService) AutoGenerateTitleIfFirst(convID string, firstMessage string) error {
	// Truncate to first 40 runes
	runes := []rune(strings.TrimSpace(firstMessage))
	if len(runes) == 0 {
		return errors.New("empty message")
	}

	title := string(runes)
	if len(runes) > 40 {
		title = string(runes[:40]) + "..."
	}

	conv, err := s.convRepo.FindByIDAndUserID(convID, "")
	if err == nil && conv != nil {
		conv.Title = title
		return s.convRepo.Update(conv)
	}

	return nil
}
