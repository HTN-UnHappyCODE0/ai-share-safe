package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID             string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username       string         `gorm:"type:varchar(100);uniqueIndex" json:"username"`
	AccessPasscode string         `gorm:"type:varchar(255);index" json:"-"` // Hidden from JSON
	Role           string         `gorm:"type:varchar(20);default:'user'" json:"role"` // 'admin', 'user', 'guest'
	DailyQuota     int            `gorm:"default:100" json:"daily_quota"`
	Conversations  []Conversation `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"conversations,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}
