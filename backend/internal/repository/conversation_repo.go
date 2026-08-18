package repository

import (
	"ai-share-safe/backend/internal/model"

	"gorm.io/gorm"
)

type ConversationRepository struct {
	db *gorm.DB
}

func NewConversationRepository(db *gorm.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) ListByUserID(userID string) ([]model.Conversation, error) {
	var conversations []model.Conversation
	err := r.db.Where("user_id = ?", userID).
		Order("updated_at DESC").
		Find(&conversations).Error
	return conversations, err
}

func (r *ConversationRepository) FindByIDAndUserID(id, userID string) (*model.Conversation, error) {
	var conversation model.Conversation
	err := r.db.Where("id = ? AND user_id = ?", id, userID).
		First(&conversation).Error
	if err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (r *ConversationRepository) Create(conversation *model.Conversation) error {
	return r.db.Create(conversation).Error
}

func (r *ConversationRepository) Update(conversation *model.Conversation) error {
	return r.db.Save(conversation).Error
}

func (r *ConversationRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).
		Delete(&model.Conversation{}).Error
}
