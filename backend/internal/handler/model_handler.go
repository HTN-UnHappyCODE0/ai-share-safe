package handler

import (
	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type ModelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Tag         string `json:"tag"`
	IsDefault   bool   `json:"is_default"`
}

type ModelHandler struct {
	cfg *config.Config
}

func NewModelHandler(cfg *config.Config) *ModelHandler {
	return &ModelHandler{cfg: cfg}
}

func (h *ModelHandler) ListModels(c *gin.Context) {
	defaultModel := "gemini-3.7-flash"
	if h.cfg != nil && h.cfg.DefaultModel != "" {
		defaultModel = h.cfg.DefaultModel
	}

	models := []ModelInfo{
		{
			ID:          "gemini-3.7-flash",
			Name:        "Gemini 3.7 Flash",
			Description: "Mô hình mới nhất, tư duy suy luận lai (Hybrid Reasoning) thông minh và tốc độ vượt trội.",
			Tag:         "Mới nhất & Khuyên dùng",
			IsDefault:   defaultModel == "gemini-3.7-flash",
		},
		{
			ID:          "gemini-3.5-flash",
			Name:        "Gemini 3.5 Flash",
			Description: "Tư duy suy luận nhanh, phản hồi tức thì và chính xác cao.",
			Tag:         "Tốc độ cao",
			IsDefault:   defaultModel == "gemini-3.5-flash",
		},
		{
			ID:          "gemini-3.5-flash-lite",
			Name:        "Gemini 3.5 Flash Lite",
			Description: "Phiên bản siêu nhẹ, tối ưu cho các câu hỏi nhanh hàng ngày.",
			Tag:         "Siêu nhẹ",
			IsDefault:   defaultModel == "gemini-3.5-flash-lite",
		},
		{
			ID:          "gemini-2.5-pro",
			Name:        "Gemini 2.5 Pro",
			Description: "Mô hình suy luận sâu, xử lý tài liệu dài và các bài toán phân tích phức tạp.",
			Tag:         "Chuyên sâu",
			IsDefault:   defaultModel == "gemini-2.5-pro",
		},
	}

	response.Success(c, models)
}
