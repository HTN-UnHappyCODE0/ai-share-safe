package middleware

import (
	"sync"
	"time"

	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type clientLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type IPRateLimiter struct {
	mu      sync.RWMutex
	clients map[string]*clientLimiter
	r       rate.Limit
	b       int
}

func NewIPRateLimiter(rpm int, burst int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		clients: make(map[string]*clientLimiter),
		r:       rate.Limit(float64(rpm) / 60.0),
		b:       burst,
	}

	// Clean up old entries every 5 minutes
	go limiter.cleanupOldClients()
	return limiter
}

func (i *IPRateLimiter) getClientLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	client, exists := i.clients[ip]
	if !exists {
		client = &clientLimiter{
			limiter:  rate.NewLimiter(i.r, i.b),
			lastSeen: time.Now(),
		}
		i.clients[ip] = client
	} else {
		client.lastSeen = time.Now()
	}

	return client.limiter
}

func (i *IPRateLimiter) cleanupOldClients() {
	for {
		time.Sleep(3 * time.Minute)
		i.mu.Lock()
		for ip, client := range i.clients {
			if time.Since(client.lastSeen) > 5*time.Minute {
				delete(i.clients, ip)
			}
		}
		i.mu.Unlock()
	}
}

func RateLimitMiddleware(rpm int, burst int) gin.HandlerFunc {
	limiter := NewIPRateLimiter(rpm, burst)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		clientLim := limiter.getClientLimiter(ip)

		if !clientLim.Allow() {
			response.Error(c, 429, "Too many requests. Vui lòng chờ vài giây trước khi gửi tiếp.")
			c.Abort()
			return
		}

		c.Next()
	}
}
