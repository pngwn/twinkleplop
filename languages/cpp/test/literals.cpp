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
