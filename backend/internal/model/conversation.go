package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Conversation struct {
	ID           string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID       string         `gorm:"type:varchar(36);index" json:"user_id"`
	Title        string         `gorm:"type:varchar(255);default:'Hội thoại mới'" json:"title"`
	Model        string         `gorm:"type:varchar(50);default:'gemini-2.0-flash'" json:"model"`
	SystemPrompt string         `gorm:"type:text" json:"system_prompt,omitempty"`
	Messages     []Message      `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Conversation) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
