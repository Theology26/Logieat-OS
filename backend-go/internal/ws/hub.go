// Package ws is the realtime layer: an in-process hub of WebSocket clients,
// grouped by company. (Scale-out path: relay Broadcast via Redis pub/sub.)
package ws

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	Hub     *Hub
	Conn    *websocket.Conn
	Company string
	User    string
	Role    string
	send    chan []byte
}

type Hub struct {
	register   chan *Client
	unregister chan *Client
	clients    map[*Client]bool
	mu         sync.RWMutex
	log        *slog.Logger
	onMessage  func(*Client, []byte)
}

func NewHub(log *slog.Logger) *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		log:        log,
	}
}

// SetMessageHandler wires inbound client messages to the server's handler.
func (h *Hub) SetMessageHandler(fn func(*Client, []byte)) { h.onMessage = fn }

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.mu.Unlock()
			h.log.Info("ws connected", "company", c.Company, "role", c.Role)
		case c := <-h.unregister:
			h.mu.Lock()
			if h.clients[c] {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
		}
	}
}

// Add registers a new client (called from the WS handler).
func (h *Hub) Add(c *Client) {
	c.Hub = h
	c.send = make(chan []byte, 64)
	h.register <- c
}

// Broadcast delivers msg to clients in the company matching filter (nil = all).
func (h *Hub) Broadcast(company string, msg []byte, filter func(*Client) bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.Company != company || (filter != nil && !filter(c)) {
			continue
		}
		select {
		case c.send <- msg:
		default: // slow client — drop
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(8192)
	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			return
		}
		if c.Hub.onMessage != nil {
			c.Hub.onMessage(c, raw)
		}
	}
}
