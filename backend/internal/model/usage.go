package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type APIUsageLog struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID      string    `gorm:"type:varchar(36);index" json:"user_id"`
	Endpoint    string    `gorm:"type:varchar(100)" json:"endpoint"`
	ModelUsed   string    `gorm:"type:varchar(50)" json:"model_used"`
	TotalTokens int       `gorm:"default:0" json:"total_tokens"`
	IPAddress   string    `gorm:"type:varchar(50)" json:"ip_address"`
	CreatedAt   time.Time `json:"created_at"`
}

func (u *APIUsageLog) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}
