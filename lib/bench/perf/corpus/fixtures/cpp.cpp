// ---- literals.cpp ----
#include <string_view>
using namespace std::literals;
constexpr auto size = 1'024uz;
auto distance = 12.5_km;
auto scale = 0x1.fp-2F + 1.5f32;
auto text = "plain\n"sv;
auto letter = U'λ';
auto raw = R"json({"key": ")\"", "comment": "/*literal*/"})json";
auto regex = u8R"pattern(\d+\s+"quoted"
)wrong" still raw )pattern";
auto empty_delimiter = R"(a\n(b)c)";
auto wide = LR"x(wide)x";
auto utf16 = uR"x(utf16)x";
auto utf32 = UR"x(utf32)x"_text;
auto escapes = "\x{41}\u{1F600}\o{101}\N{LATIN CAPITAL LETTER A}";


// ---- preprocessor.cpp ----
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


// ---- structures.cpp ----
#include <compare>
#include <vector>
namespace geometry {
template<typename T> concept Numeric = requires(T value) { value + value; };
template<Numeric T> struct point {
  T x{}, y{};
  auto operator<=>(const point&) const = default;
};
class shape {
public:
  virtual ~shape() = default;
  virtual double area() const = 0;
};
class circle final : public shape {
public:
  double area() const override { return radius * radius; }
private:
  double radius = .5;
};
}
int main() {
  std::vector<std::vector<int>> values{{1, 2}, {3, 4}};
  auto sum = [factor = 2](auto x) { return x * factor; };
  bool valid = true and not false;
  return valid ? sum(values[0][1]) : 0;
}
