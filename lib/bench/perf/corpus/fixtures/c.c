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
