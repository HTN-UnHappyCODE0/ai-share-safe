package handler

import (
	"ai-share-safe/backend/internal/middleware"
	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type ConversationHandler struct {
	convService *service.ConversationService
}

func NewConversationHandler(convService *service.ConversationService) *ConversationHandler {
	return &ConversationHandler{convService: convService}
}

type CreateConversationRequest struct {
	Title        string `json:"title"`
	Model        string `json:"model"`
	SystemPrompt string `json:"system_prompt"`
}

func (h *ConversationHandler) ListConversations(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxUserIDKey)
	conversations, err := h.convService.ListConversations(userID.(string))
	if err != nil {
		response.InternalServerError(c, "Không thể tải danh sách hội thoại")
		return
	}
	response.Success(c, conversations)
}

func (h *ConversationHandler) CreateConversation(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxUserIDKey)
	var req CreateConversationRequest
	_ = c.ShouldBindJSON(&req) // Optional JSON body

	conv, err := h.convService.CreateConversation(userID.(string), req.Title, req.Model, req.SystemPrompt)
	if err != nil {
		response.InternalServerError(c, "Không thể tạo cuộc hội thoại mới")
		return
	}
	response.Success(c, conv)
}

func (h *ConversationHandler) GetConversation(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxUserIDKey)
	convID := c.Param("id")

	conv, messages, err := h.convService.GetConversation(convID, userID.(string))
	if err != nil {
		response.NotFound(c, "Không tìm thấy cuộc hội thoại")
		return
	}

	response.Success(c, gin.H{
		"conversation": conv,
		"messages":     messages,
	})
}

func (h *ConversationHandler) DeleteConversation(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxUserIDKey)
	convID := c.Param("id")

	err := h.convService.DeleteConversation(convID, userID.(string))
	if err != nil {
		response.InternalServerError(c, "Không thể xoá cuộc hội thoại")
		return
	}

	response.SuccessWithMessage(c, "Đã xoá cuộc hội thoại thành công", nil)
}
