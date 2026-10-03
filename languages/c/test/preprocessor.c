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
