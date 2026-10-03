// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}


// ---- literals.c ----
const char *message = u8"hello\n" "world";
const int chars[] = {'a', '\'', '\123', '\x41', u'λ', U'𐐀', L'Z', u8'x'};
const void *strings[] = {"ordinary", L"wide", u"utf16", U"utf32", u8"utf8"};
unsigned long long mask = 0xff'ffULL | 0B1010u | 0755UL;
double scale = -0x1.fp+2 + .5e-3 + 1.;
_BitInt(17) bits = 65535wb;
_Decimal64 decimal = 1.25dd;
bool ready = true;
void *empty = nullptr;


// ---- preprocessor.c ----
/* before directive */ # include <stdint.h>
%:include "local/header.h"
#define JOIN(a, b) a ## b
#define LOG(format, ...) log_message(format __VA_OPT__(,) __VA_ARGS__)
#define SCALE(x) ((x) * 0x1.fp+2) \
  + 1'024u
#if defined(FEATURE) && __has_include(<feature.h>)
# include <feature.h>
#elifndef FALLBACK
# warning "using fallback"
#endif
const unsigned char data[] = {
#embed "data.bin" limit(16)
};
// a continued comment \
#define NOT_A_DIRECTIVE
int after_comment;


// ---- structures.c ----
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return distance(&p) > 0 ? class : template;
}


/*
 * arena.c - bump allocator and open-addressing string map for acme-index.
 *
 * Build: cc -std=c23 -O2 -Wall -Wextra -o acme-index arena.c
 */

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ---- header section ------------------------------------------------- */

#define ACME_VERSION_MAJOR 1
#define ACME_VERSION_MINOR 4
#define ACME_VERSION_STR "1.4.0"

#define ARENA_DEFAULT_CAP (64u * 1024u)
#define ARENA_ALIGN alignof(max_align_t)
#define MAP_LOAD_NUM 7
#define MAP_LOAD_DEN 10

#define ALIGN_UP(n, a) (((n) + ((a) - 1)) & ~((size_t)(a) - 1))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))
#define UNUSED(x) ((void)(x))

#if defined(__GNUC__) || defined(__clang__)
#  define ACME_LIKELY(x) __builtin_expect(!!(x), 1)
#  define ACME_UNLIKELY(x) __builtin_expect(!!(x), 0)
#else
#  define ACME_LIKELY(x) (x)
#  define ACME_UNLIKELY(x) (x)
#endif

#ifndef ACME_TRACE
#  define ACME_TRACE 0
#endif

#if ACME_TRACE
#  define TRACE(fmt, ...) fprintf(stderr, "[trace] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)
#else
#  define TRACE(fmt, ...) ((void)0)
#endif

typedef enum acme_status {
  ACME_OK = 0,
  ACME_ERR_NOMEM = -1,
  ACME_ERR_INVALID = -2,
  ACME_ERR_NOT_FOUND = -3,
  ACME_ERR_IO = -4,
} acme_status;

typedef struct arena_block {
  struct arena_block *next;
  size_t cap;
  size_t used;
  alignas(max_align_t) unsigned char data[];
} arena_block;

typedef struct arena {
  arena_block *head;
  size_t block_cap;
  size_t total;
} arena;

typedef uint64_t (*hash_fn)(const char *key, size_t len);
typedef void (*visit_fn)(const char *key, int64_t value, void *ctx);

typedef struct map_entry {
  const char *key;
  size_t key_len;
  uint64_t hash;
  int64_t value;
} map_entry;

typedef struct str_map {
  arena *arena;
  map_entry *slots;
  size_t cap;
  size_t len;
  hash_fn hash;
} str_map;

typedef struct cli_options {
  const char *input_path;
  size_t top_n;
  bool case_fold;
  bool verbose;
} cli_options;

static const char *const status_names[] = {
  [0] = "ok",
  [1] = "out of memory",
  [2] = "invalid argument",
  [3] = "not found",
  [4] = "i/o error",
};

static inline const char *acme_strerror(acme_status s) {
  size_t idx = (size_t)(-(int)s);
  return idx < ARRAY_LEN(status_names) ? status_names[idx] : "unknown";
}

/* ---- arena ---------------------------------------------------------- */

static arena_block *arena_block_new(size_t cap) {
  arena_block *b = malloc(sizeof(arena_block) + cap);
  if (ACME_UNLIKELY(b == nullptr)) {
    return nullptr;
  }
  *b = (arena_block){ .next = nullptr, .cap = cap, .used = 0 };
  return b;
}

void arena_init(arena *a, size_t block_cap) {
  *a = (arena){
    .head = nullptr,
    .block_cap = block_cap ? block_cap : ARENA_DEFAULT_CAP,
    .total = 0,
  };
}

[[nodiscard]] void *arena_alloc(arena *a, size_t size) {
  size = ALIGN_UP(size, ARENA_ALIGN);
  arena_block *b = a->head;

  if (b == nullptr || b->cap - b->used < size) {
    size_t cap = size > a->block_cap ? size : a->block_cap;
    arena_block *fresh = arena_block_new(cap);
    if (fresh == nullptr) {
      return nullptr;
    }
    fresh->next = b;
    a->head = b = fresh;
    TRACE("new block cap=%zu", cap);
  }

  void *p = b->data + b->used;
  b->used += size;
  a->total += size;
  return p;
}

[[nodiscard]] char *arena_strndup(arena *a, const char *s, size_t n) {
  char *out = arena_alloc(a, n + 1);
  if (out != nullptr) {
    memcpy(out, s, n);
    out[n] = '\0';
  }
  return out;
}

void arena_free(arena *a) {
  arena_block *b = a->head;
  while (b) {
    arena_block *next = b->next;
    free(b);
    b = next;
  }
  arena_init(a, a->block_cap);
}

/* ---- hash map ------------------------------------------------------- */

static uint64_t fnv1a(const char *key, size_t len) {
  uint64_t h = 0xcbf29ce484222325ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (unsigned char)key[i];
    h *= 0x100000001b3ULL;
  }
  return h | 1u; /* zero marks an empty slot */
}

static acme_status map_grow(str_map *m) {
  size_t new_cap = m->cap ? m->cap * 2 : 64;
  map_entry *slots = calloc(new_cap, sizeof *slots);
  if (!slots) {
    return ACME_ERR_NOMEM;
  }
  for (size_t i = 0; i < m->cap; i++) {
    map_entry e = m->slots[i];
    if (e.hash == 0) continue;
    size_t j = e.hash & (new_cap - 1);
    while (slots[j].hash != 0) {
      j = (j + 1) & (new_cap - 1);
    }
    slots[j] = e;
  }
  free(m->slots);
  m->slots = slots;
  m->cap = new_cap;
  return ACME_OK;
}

acme_status map_add(str_map *m, const char *key, size_t len, int64_t delta) {
  if (m->len * MAP_LOAD_DEN >= m->cap * MAP_LOAD_NUM) {
    acme_status s = map_grow(m);
    if (s != ACME_OK) return s;
  }
  uint64_t h = m->hash(key, len);
  size_t i = h & (m->cap - 1);
  for (;;) {
    map_entry *e = &m->slots[i];
    if (e->hash == 0) {
      const char *owned = arena_strndup(m->arena, key, len);
      if (!owned) return ACME_ERR_NOMEM;
      *e = (map_entry){ .key = owned, .key_len = len, .hash = h, .value = delta };
      m->len++;
      return ACME_OK;
    }
    if (e->hash == h && e->key_len == len && memcmp(e->key, key, len) == 0) {
      e->value += delta;
      return ACME_OK;
    }
    i = (i + 1) & (m->cap - 1);
  }
}

void map_each(const str_map *m, visit_fn visit, void *ctx) {
  for (size_t i = 0; i < m->cap; i++) {
    if (m->slots[i].hash != 0) {
      visit(m->slots[i].key, m->slots[i].value, ctx);
    }
  }
}

static int by_count_desc(const void *lhs, const void *rhs) {
  const map_entry *a = lhs, *b = rhs;
  if (a->value != b->value) return a->value < b->value ? 1 : -1;
  return strcmp(a->key, b->key);
}

/* ---- cli ------------------------------------------------------------ */

static void usage(FILE *out, const char *argv0) {
  fprintf(out,
          "usage: %s [-n TOP] [-i] [-v] FILE\n"
          "\n"
          "  -n TOP   print the TOP most frequent words (default 10)\n"
          "  -i       fold ASCII case before counting\n"
          "  -v       print arena statistics to stderr\n"
          "\n"
          "Report bugs to <bugs@acme.dev>.\n",
          argv0);
}

static bool is_word_char(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '\'';
}

static acme_status count_words(FILE *fp, str_map *m, bool fold) {
  char word[256];
  size_t n = 0;
  int c;
  while ((c = fgetc(fp)) != EOF) {
    if (is_word_char(c) && n < sizeof word - 1) {
      word[n++] = (char)(fold && c >= 'A' && c <= 'Z' ? c + ('a' - 'A') : c);
      continue;
    }
    if (n > 0) {
      acme_status s = map_add(m, word, n, 1);
      if (s != ACME_OK) return s;
      n = 0;
    }
  }
  if (n > 0) {
    return map_add(m, word, n, 1);
  }
  return ferror(fp) ? ACME_ERR_IO : ACME_OK;
}

int main(int argc, char **argv) {
  cli_options opts = { .top_n = 10, .case_fold = false, .verbose = false };

  for (int i = 1; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "-n") == 0 && i + 1 < argc) {
      char *end = nullptr;
      errno = 0;
      unsigned long v = strtoul(argv[++i], &end, 10);
      if (errno != 0 || *end != '\0' || v == 0) {
        fprintf(stderr, "acme-index: bad value for -n: '%s'\n", argv[i]);
        return 2;
      }
      opts.top_n = (size_t)v;
    } else if (strcmp(arg, "-i") == 0) {
      opts.case_fold = true;
    } else if (strcmp(arg, "-v") == 0) {
      opts.verbose = true;
    } else if (arg[0] == '-' && arg[1] != '\0') {
      usage(stderr, argv[0]);
      return 2;
    } else {
      opts.input_path = arg;
    }
  }

  if (opts.input_path == nullptr) {
    usage(stderr, argv[0]);
    return 2;
  }

  FILE *fp = strcmp(opts.input_path, "-") == 0 ? stdin : fopen(opts.input_path, "rb");
  if (!fp) {
    perror(opts.input_path);
    return 1;
  }

  arena a;
  arena_init(&a, 0);
  str_map words = { .arena = &a, .hash = fnv1a };

  acme_status s = count_words(fp, &words, opts.case_fold);
  if (fp != stdin) fclose(fp);
  if (s != ACME_OK) {
    fprintf(stderr, "acme-index: %s\n", acme_strerror(s));
    goto cleanup;
  }

  map_entry *sorted = arena_alloc(&a, words.len * sizeof *sorted);
  size_t k = 0;
  for (size_t i = 0; i < words.cap; i++) {
    if (words.slots[i].hash) sorted[k++] = words.slots[i];
  }
  assert(k == words.len);
  qsort(sorted, k, sizeof *sorted, by_count_desc);

  for (size_t i = 0; i < k && i < opts.top_n; i++) {
    printf("%8lld\t%s\n", (long long)sorted[i].value, sorted[i].key);
  }

  if (opts.verbose) {
    fprintf(stderr, "acme-index %s: %zu unique, %zu bytes in arena, load %.2f\t\n",
            ACME_VERSION_STR, words.len, a.total,
            words.cap ? (double)words.len / (double)words.cap : 0.0);
  }

cleanup:
  free(words.slots);
  arena_free(&a);
  return s == ACME_OK ? EXIT_SUCCESS : EXIT_FAILURE;
}
