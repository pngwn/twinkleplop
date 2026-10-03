#include <compare>
#include <vector>
constexpr int MAX_POINTS = 16;
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
  values.reserve(MAX_POINTS);
  auto sum = [factor = 2](auto x) { return x * factor; };
  bool valid = true and not false;
  return valid ? sum(values[0][1]) : 0;
}
