package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger
var Sugar *zap.SugaredLogger

// InitLogger initializes the global Uber Zap logger
func InitLogger(env string) {
	var config zapcore.EncoderConfig
	var encoder zapcore.Encoder
	var level zapcore.Level

	if env == "production" {
		config = zap.NewProductionEncoderConfig()
		config.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewJSONEncoder(config)
		level = zapcore.InfoLevel
	} else {
		config = zap.NewDevelopmentEncoderConfig()
		config.EncodeLevel = zapcore.CapitalColorLevelEncoder
		config.EncodeTime = zapcore.TimeEncoderOfLayout("15:04:05.000")
		encoder = zapcore.NewConsoleEncoder(config)
		level = zapcore.DebugLevel
	}

	core := zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), level)
	Log = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	Sugar = Log.Sugar()
}

func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}
