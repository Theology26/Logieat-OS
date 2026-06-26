// Package push sends notifications via the Expo Push API (best-effort, fire-and-forget).
package push

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

var client = &http.Client{Timeout: 8 * time.Second}

func SendExpo(token, title, body string, data map[string]any) {
	if token == "" {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"to": token, "title": title, "body": body, "data": data,
		"sound": "default", "channelId": "default", "priority": "high",
	})
	resp, err := client.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewReader(payload))
	if err == nil {
		_ = resp.Body.Close()
	}
}
