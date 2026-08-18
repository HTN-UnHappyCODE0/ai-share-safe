package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"ai-share-safe/backend/internal/middleware"
	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/logger"
	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ChatHandler struct {
	geminiService *service.GeminiService
	convService   *service.ConversationService
}

func NewChatHandler(geminiService *service.GeminiService, convService *service.ConversationService) *ChatHandler {
	return &ChatHandler{
		geminiService: geminiService,
		convService:   convService,
	}
}

type StreamChatRequest struct {
	ConversationID string  `json:"conversation_id"`
	Message        string  `json:"message" binding:"required"`
	Model          string  `json:"model"`
	Temperature    float32 `json:"temperature"`
	SystemPrompt   string  `json:"system_prompt"`
}

type StreamEvent struct {
	Type    string      `json:"type"` // "start", "chunk", "done", "error"
	Content string      `json:"content,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func (h *ChatHandler) StreamChat(c *gin.Context) {
	userIDVal, exists := c.Get(middleware.CtxUserIDKey)
	if !exists {
		response.Unauthorized(c, "Vui lòng đăng nhập")
		return
	}
	userID := userIDVal.(string)

	var req StreamChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Nội dung tin nhắn không hợp lệ")
		return
	}

	// Retrieve or create conversation
	var convID = req.ConversationID
	var convModel = req.Model
	var sysPrompt = req.SystemPrompt

	var conversationObj, _, err = h.convService.GetConversation(convID, userID)
	if err != nil || conversationObj == nil {
		// Create new conversation automatically if not found or empty
		createdConv, err := h.convService.CreateConversation(userID, "", convModel, sysPrompt)
		if err != nil {
			response.InternalServerError(c, "Không thể khởi tạo cuộc hội thoại")
			return
		}
		conversationObj = createdConv
		convID = createdConv.ID
	}

	// Update conversation properties if provided in request
	if req.Model != "" && req.Model != conversationObj.Model {
		conversationObj.Model = req.Model
	}
	if req.SystemPrompt != "" && req.SystemPrompt != conversationObj.SystemPrompt {
		conversationObj.SystemPrompt = req.SystemPrompt
	}

	// Setup SSE Streaming Headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no") // Disable Nginx buffering
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		logger.Log.Error("Streaming unsupported by client writer")
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	// Helper to send SSE Event
	sendEvent := func(event StreamEvent) error {
		bytes, err := json.Marshal(event)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(c.Writer, "data: %s\n\n", string(bytes))
		if err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	// Send initial start event with conversation metadata
	_ = sendEvent(StreamEvent{
		Type: "start",
		Data: gin.H{
			"conversation_id": conversationObj.ID,
			"title":           conversationObj.Title,
			"model":           conversationObj.Model,
		},
	})

	// Stream from Gemini
	ctx := c.Request.Context()
	_, err = h.geminiService.StreamChat(
		ctx,
		conversationObj,
		req.Message,
		req.Model,
		req.Temperature,
		func(chunk string) error {
			return sendEvent(StreamEvent{
				Type:    "chunk",
				Content: chunk,
			})
		},
	)

	if err != nil {
		logger.Log.Error("Chat stream encountered error", zap.Error(err))
		_ = sendEvent(StreamEvent{
			Type:  "error",
			Error: err.Error(),
		})
		return
	}

	// Send done event
	_ = sendEvent(StreamEvent{
		Type: "done",
	})
}
