package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageRole string

const (
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
	RoleSystem    MessageRole = "system"
)

type Message struct {
	ID               string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ConversationID   string         `gorm:"type:varchar(36);index" json:"conversation_id"`
	Role             MessageRole    `gorm:"type:varchar(20)" json:"role"` // 'user', 'assistant', 'system'
	Content          string         `gorm:"type:text" json:"content"`
	PromptTokens     int            `gorm:"default:0" json:"prompt_tokens,omitempty"`
	CompletionTokens int            `gorm:"default:0" json:"completion_tokens,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
