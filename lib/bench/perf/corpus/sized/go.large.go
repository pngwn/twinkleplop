// ---- unit 1 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 2 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 3 ----
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


// ---- unit 4 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 5 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 6 ----
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


// ---- unit 7 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 8 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 9 ----
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


// ---- unit 10 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 11 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 12 ----
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


// ---- unit 13 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 14 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 15 ----
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


// ---- unit 16 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 17 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 18 ----
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


// ---- unit 19 ----
// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, "world"!\n"
	}
	return fmt.Sprintf("Hello,\t%s!\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}


// ---- unit 20 ----
// ---- basics.go ----
package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}


// ---- builtins.go ----
package builtins

func demo() {
	s := make([]int, 0, 10)
	s = append(s, 1, 2, 3)
	_ = len(s)
	_ = cap(s)
	copy(s, s)
	clear(s)

	m := make(map[string]int)
	delete(m, "k")

	var p *int = new(int)
	_ = p

	c := complex(1.0, 2.0)
	_ = real(c)
	_ = imag(c)

	_ = min(1, 2, 3)
	_ = max(1, 2, 3)

	defer func() {
		if r := recover(); r != nil {
			panic(r)
		}
	}()

	print("x")
	println("y")

	close(make(chan int))
}


// ---- comments.go ----
// Package cmt documents the comment forms.
package cmt

// a line comment
// multiple lines
// of line comments

/* a block comment */

/*
a block comment
spanning multiple
lines
*/

// block comments do NOT nest in go: /* /* not inner */
// and the following is ordinary code after a comment ends
var x = 1 /* inline block */ + 2 // trailing line

//go:build linux
//go:generate stringer -type=Kind

func /* mid */ demo() {
	// body
	_ = x
}


// ---- edge_cases.go ----
package edges

import "fmt"

// numeric edges from the go spec.
var _ = 0x15e - 2 // hex int 0x15e then - then 2, NOT a hex float
var _ = .5        // dot-leading float
var _ = 1.        // trailing-dot float
var _ = 1e6       // exponent without dot
var _ = 0         // bare zero (decimal)

// generics — brackets are ordinary punctuation tokens.
func Map[T any, U any](xs []T, f func(T) U) []U {
	out := make([]U, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// type-approximation operator ~ (go 1.18+).
type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

// channel ops
func worker(in <-chan int, out chan<- int) {
	for v := range in {
		out <- v * 2
	}
}

// variadic + slice expansion
func sum(xs ...int) int {
	total := 0
	for _, x := range xs {
		total += x
	}
	return total
}

func callvariadic() int {
	xs := []int{1, 2, 3}
	return sum(xs...)
}

// method values and expressions — these are just identifiers plus dots.
func methodExprs() {
	var d Dog
	f1 := d.Bark
	f2 := (*Dog).Bark
	fmt.Println(f1, f2)
}

type Dog struct{ name string }

func (d *Dog) Bark() string { return d.name + "!" }


// ---- identifiers.go ----
package ident

import "fmt"

var (
	a                      int
	_x9                    int
	ThisVariableIsExported int
	snake_case             int
	camelCase              int
	PascalCase             int
	trailing_              int
	_                      = a
)

type MyType struct {
	Field1 int
	field2 string
}

func (m *MyType) Method() int { return m.Field1 }

func demo() {
	var trueish bool = true
	var falseish = false
	var nilable *int = nil
	var iota_user = iota

	fmt.Println(trueish, falseish, nilable, iota_user)
}


// ---- keywords.go ----
package p

import (
	"fmt"
	"io"
)

type Animal interface {
	Name() string
}

type Dog struct {
	name string
}

func (d *Dog) Name() string { return d.name }

func demo(ch chan int) {
	var x int = 42
	const y = 10
	defer fmt.Println("bye")
	go func() { fmt.Println("async") }()

	switch x {
	case 1:
		fallthrough
	case 2:
		break
	default:
		return
	}

	for i := 0; i < 10; i++ {
		if i == 5 {
			continue
		}
	}

	select {
	case v := <-ch:
		_ = v
	}

	m := map[string]int{"a": 1}
	for k := range m {
		_ = k
	}

	goto end
end:
	_ = io.EOF
}


// ---- numbers.go ----
package nums

func demo() {
	_ = 0
	_ = 42
	_ = 4_2
	_ = 1_000_000

	_ = 0600
	_ = 0_600
	_ = 0o600
	_ = 0O600

	_ = 0b1010_1100
	_ = 0B11

	_ = 0xBadFace
	_ = 0xBad_Face
	_ = 0x_67_7a_2f_cc_40_c6
	_ = 0X1234567890ABCDEF

	_ = 0.
	_ = 72.40
	_ = 072.40
	_ = 2.71828
	_ = 1.e+0
	_ = 6.67428e-11
	_ = 1E6
	_ = .25
	_ = .12345E+5
	_ = 1_5.
	_ = 0.15e+0_2

	_ = 0x1p-2
	_ = 0x2.p10
	_ = 0x1.Fp+0
	_ = 0X.8p-0
	_ = 0X_1FFFP-16
	_ = 0x15e - 2

	_ = 0i
	_ = 0123i
	_ = 0o123i
	_ = 0xabci
	_ = 0.i
	_ = 2.71828i
	_ = 1.e+0i
	_ = 6.67428e-11i
	_ = 1E6i
	_ = .25i
	_ = .12345E+5i
	_ = 0x1p-2i
	_ = 1_000_000i
}


// ---- operators.go ----
package ops

func demo() {
	a := 1 + 2 - 3*4/5%6
	b := a & 0xff | 0x0f ^ 0xf0
	c := b << 2 >> 1
	d := b &^ 0x03
	e := a == b
	f := a != b
	g := a < b
	h := a <= b
	i := a > b
	j := a >= b
	k := a && b > 0 || c < 10
	l := !k
	m := ^a
	n := ~a

	a += 1
	a -= 1
	a *= 2
	a /= 2
	a %= 2
	a &= 0xff
	a |= 0x0f
	a ^= 0xf0
	a <<= 1
	a >>= 1
	a &^= 0x03

	a++
	a--

	_, _, _, _, _, _, _, _, _, _, _, _, _, _ = b, c, d, e, f, g, h, i, j, k, l, m, n, 0

	ch := make(chan int)
	ch <- 1
	<-ch
	variadic(1, 2, 3)
}

func variadic(xs ...int) {
	_ = xs
}


// ---- strings.go ----
package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}


// ---- unit 21 ----
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
