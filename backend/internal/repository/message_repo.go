package repository

import (
	"ai-share-safe/backend/internal/model"

	"gorm.io/gorm"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) ListByConversationID(conversationID string) ([]model.Message, error) {
	var messages []model.Message
	err := r.db.Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Find(&messages).Error
	return messages, err
}

func (r *MessageRepository) GetRecentMessages(conversationID string, limit int) ([]model.Message, error) {
	var messages []model.Message
	// Subquery to get latest N messages then order ASC for context replay
	err := r.db.Where("conversation_id = ?", conversationID).
		Order("created_at DESC").
		Limit(limit).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}

	// Reverse array to ASC order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	return messages, nil
}

func (r *MessageRepository) Create(message *model.Message) error {
	return r.db.Create(message).Error
}
