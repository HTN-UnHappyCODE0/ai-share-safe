package handler

import (
	"ai-share-safe/backend/internal/middleware"
	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type VerifyPasscodeRequest struct {
	Passcode string `json:"passcode" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  UserSummary `json:"user"`
}

type UserSummary struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func (h *AuthHandler) VerifyPasscode(c *gin.Context) {
	var req VerifyPasscodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng cung cấp mã truy cập (Passcode)")
		return
	}

	token, user, err := h.authService.VerifyPasscode(req.Passcode)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "Xác thực thành công", AuthResponse{
		Token: token,
		User: UserSummary{
			ID:       user.ID,
			Username: user.Username,
			Role:     user.Role,
		},
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxUserIDKey)
	username, _ := c.Get(middleware.CtxUsernameKey)
	role, _ := c.Get(middleware.CtxRoleKey)

	response.Success(c, UserSummary{
		ID:       userID.(string),
		Username: username.(string),
		Role:     role.(string),
	})
}
