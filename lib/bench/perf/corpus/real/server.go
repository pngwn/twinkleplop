package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DefaultTimeout   = 30 * time.Second
	MaxBodyBytes     = 1 << 20
	shutdownGrace    = 5 * time.Second
	headerRequestID  = "X-Request-Id"
	headerRateRemain = "X-RateLimit-Remaining"
)

var (
	ErrNotFound     = errors.New("resource not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrRateLimited  = errors.New("rate limit exceeded")
)

type Config struct {
	Addr           string        `json:"addr"`
	ReadTimeout    time.Duration `json:"read_timeout"`
	WriteTimeout   time.Duration `json:"write_timeout"`
	MaxConcurrent  int           `json:"max_concurrent"`
	TrustedProxies []string      `json:"trusted_proxies,omitempty"`
}

func (c *Config) Validate() error {
	if c.Addr == "" {
		return fmt.Errorf("config: addr is required")
	}
	if c.MaxConcurrent <= 0 {
		c.MaxConcurrent = 256
	}
	if c.ReadTimeout == 0 {
		c.ReadTimeout = DefaultTimeout
	}
	return nil
}

type Store interface {
	Get(ctx context.Context, id string) (*Record, error)
	Put(ctx context.Context, r *Record) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, prefix string, limit int) ([]*Record, error)
}

type Record struct {
	ID        string            `json:"id"`
	Version   int64             `json:"version"`
	Payload   json.RawMessage   `json:"payload"`
	Labels    map[string]string `json:"labels,omitempty"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

func (r *Record) Clone() *Record {
	if r == nil {
		return nil
	}
	out := *r
	if r.Labels != nil {
		out.Labels = make(map[string]string, len(r.Labels))
		for k, v := range r.Labels {
			out.Labels[k] = v
		}
	}
	out.Payload = append(json.RawMessage(nil), r.Payload...)
	return &out
}

type memStore struct {
	mu   sync.RWMutex
	data map[string]*Record
}

func NewMemStore() Store {
	return &memStore{data: make(map[string]*Record)}
}

func (m *memStore) Get(ctx context.Context, id string) (*Record, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	rec, ok := m.data[id]
	if !ok {
		return nil, fmt.Errorf("get %q: %w", id, ErrNotFound)
	}
	return rec.Clone(), nil
}

func (m *memStore) Put(ctx context.Context, r *Record) error {
	if r == nil || r.ID == "" {
		return errors.New("put: record requires an id")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if prev, ok := m.data[r.ID]; ok {
		if r.Version != prev.Version {
			return fmt.Errorf("put %q: version conflict %d != %d", r.ID, r.Version, prev.Version)
		}
		r.Version = prev.Version + 1
	}
	r.UpdatedAt = time.Now().UTC()
	m.data[r.ID] = r.Clone()
	return nil
}

func (m *memStore) Delete(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.data[id]; !ok {
		return ErrNotFound
	}
	delete(m.data, id)
	return nil
}

func (m *memStore) List(ctx context.Context, prefix string, limit int) ([]*Record, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*Record, 0, limit)
	for id, rec := range m.data {
		if !strings.HasPrefix(id, prefix) {
			continue
		}
		out = append(out, rec.Clone())
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

type limiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64
	burst   float64
}

type bucket struct {
	tokens float64
	last   time.Time
}

func newLimiter(rate, burst float64) *limiter {
	return &limiter{buckets: map[string]*bucket{}, rate: rate, burst: burst}
}

func (l *limiter) allow(key string) (float64, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.burst, last: now}
		l.buckets[key] = b
	}
	elapsed := now.Sub(b.last).Seconds()
	b.tokens = min(l.burst, b.tokens+elapsed*l.rate)
	b.last = now
	if b.tokens < 1 {
		return b.tokens, false
	}
	b.tokens--
	return b.tokens, true
}

type Server struct {
	cfg     Config
	store   Store
	log     *slog.Logger
	lim     *limiter
	sem     chan struct{}
	wg      sync.WaitGroup
	closing chan struct{}
}

func New(cfg Config, store Store, log *slog.Logger) (*Server, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return &Server{
		cfg:     cfg,
		store:   store,
		log:     log,
		lim:     newLimiter(50, 100),
		sem:     make(chan struct{}, cfg.MaxConcurrent),
		closing: make(chan struct{}),
	}, nil
}

func (s *Server) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/records/{id}", s.handleGet)
	mux.HandleFunc("PUT /v1/records/{id}", s.handlePut)
	mux.HandleFunc("DELETE /v1/records/{id}", s.handleDelete)
	mux.HandleFunc("GET /v1/records", s.handleList)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "ok\n")
	})
	return mux
}

func (s *Server) handleGet(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), s.cfg.ReadTimeout)
	defer cancel()
	rec, err := s.store.Get(ctx, r.PathValue("id"))
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	s.writeJSON(w, http.StatusOK, rec)
}

func (s *Server) handlePut(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var rec Record
	dec := json.NewDecoder(io.LimitReader(r.Body, MaxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&rec); err != nil {
		http.Error(w, fmt.Sprintf("decode: %v", err), http.StatusBadRequest)
		return
	}
	rec.ID = r.PathValue("id")
	if err := s.store.Put(r.Context(), &rec); err != nil {
		s.writeError(w, r, err)
		return
	}
	s.writeJSON(w, http.StatusOK, &rec)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Delete(r.Context(), r.PathValue("id")); err != nil {
		s.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 || n > 1000 {
			http.Error(w, "limit must be between 1 and 1000", http.StatusBadRequest)
			return
		}
		limit = n
	}
	recs, err := s.store.List(r.Context(), r.URL.Query().Get("prefix"), limit)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	s.writeJSON(w, http.StatusOK, map[string]any{"records": recs, "count": len(recs)})
}

func (s *Server) writeJSON(w http.ResponseWriter, code int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		s.log.Error("encode response", "err", err)
	}
}

func (s *Server) writeError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		http.Error(w, err.Error(), http.StatusNotFound)
	case errors.Is(err, ErrUnauthorized):
		http.Error(w, err.Error(), http.StatusForbidden)
	case errors.Is(err, ErrRateLimited):
		http.Error(w, err.Error(), http.StatusTooManyRequests)
	case errors.Is(err, context.DeadlineExceeded):
		http.Error(w, "timeout", http.StatusGatewayTimeout)
	default:
		s.log.ErrorContext(r.Context(), "unhandled", "err", err, "path", r.URL.Path)
		http.Error(w, "internal error", http.StatusInternalServerError)
	}
}

func (s *Server) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case s.sem <- struct{}{}:
			defer func() { <-s.sem }()
		case <-r.Context().Done():
			http.Error(w, "shutting down", http.StatusServiceUnavailable)
			return
		}
		remaining, ok := s.lim.allow(clientKey(r))
		w.Header().Set(headerRateRemain, strconv.FormatFloat(remaining, 'f', 0, 64))
		if !ok {
			s.writeError(w, r, ErrRateLimited)
			return
		}
		start := time.Now()
		next.ServeHTTP(w, r)
		s.log.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"dur_ms", time.Since(start).Milliseconds(),
			"id", r.Header.Get(headerRequestID),
		)
	})
}

func clientKey(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		if i := strings.IndexByte(fwd, ','); i > 0 {
			return strings.TrimSpace(fwd[:i])
		}
		return strings.TrimSpace(fwd)
	}
	host, _, err := strings.Cut(r.RemoteAddr, ":")
	if !err {
		return r.RemoteAddr
	}
	return host
}

func (s *Server) Run(ctx context.Context) error {
	srv := &http.Server{
		Addr:         s.cfg.Addr,
		Handler:      s.Middleware(s.Routes()),
		ReadTimeout:  s.cfg.ReadTimeout,
		WriteTimeout: s.cfg.WriteTimeout,
	}
	errCh := make(chan error, 1)
	go func() {
		s.log.Info("listening", "addr", s.cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		shutCtx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
		defer cancel()
		close(s.closing)
		s.wg.Wait()
		return srv.Shutdown(shutCtx)
	}
}
