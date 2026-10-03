#define MAX_COORD 1000
typedef struct point { double x, y; } point;
[[nodiscard]] static inline double distance(const point *restrict p) {
  return p->x * p->x + p->y * p->y;
}
int main(void) {
  point p = {.x = .5, .y = -1e-3};
  bool bounded = p.x < MAX_COORD;
  int class = 1, template = 2, namespace = 3;
  for (unsigned i = 0; i < 10; ++i) {
    class <<= 1;
    template += namespace;
  }
  static_assert(sizeof(int) >= 2);
  return bounded && distance(&p) > 0 ? class : template;
}
