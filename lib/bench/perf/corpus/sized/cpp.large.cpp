// ---- unit 1 ----
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


// ---- unit 2 ----
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


// ---- unit 3 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 4 ----
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


// ---- unit 5 ----
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


// ---- unit 6 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 7 ----
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


// ---- unit 8 ----
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


// ---- unit 9 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 10 ----
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


// ---- unit 11 ----
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


// ---- unit 12 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 13 ----
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


// ---- unit 14 ----
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


// ---- unit 15 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 16 ----
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


// ---- unit 17 ----
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


// ---- unit 18 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 19 ----
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


// ---- unit 20 ----
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


// ---- unit 21 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 22 ----
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


// ---- unit 23 ----
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


// ---- unit 24 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 25 ----
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


// ---- unit 26 ----
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


// ---- unit 27 ----
// scheduler.cpp - cooperative task scheduler for the acme build agent.
//
// Build: c++ -std=c++23 -O2 -Wall -Wextra -pthread scheduler.cpp -o acme-sched

#include <algorithm>
#include <atomic>
#include <chrono>
#include <concepts>
#include <condition_variable>
#include <cstdint>
#include <format>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

namespace acme::sched {

using namespace std::chrono_literals;
using Clock = std::chrono::steady_clock;

inline constexpr std::size_t kDefaultWorkers = 4;
inline constexpr auto kIdleBackoff = 25ms;

enum class Priority : std::uint8_t { Low = 0, Normal = 1, High = 2, Critical = 3 };

[[nodiscard]] constexpr std::string_view to_string(Priority p) noexcept {
  switch (p) {
    case Priority::Low: return "low";
    case Priority::Normal: return "normal";
    case Priority::High: return "high";
    case Priority::Critical: return "critical";
  }
  return "?";
}

struct TaskId {
  std::uint64_t value{};
  constexpr auto operator<=>(const TaskId&) const = default;
};

template <typename F>
concept TaskBody = std::invocable<F&> && std::same_as<std::invoke_result_t<F&>, bool>;

template <typename T>
concept Reportable = requires(const T& t) {
  { t.name() } -> std::convertible_to<std::string_view>;
  { t.elapsed() } -> std::convertible_to<Clock::duration>;
};

class Task {
 public:
  template <TaskBody F>
  Task(TaskId id, std::string name, Priority prio, F&& body)
      : id_{id}, name_{std::move(name)}, prio_{prio}, body_{std::forward<F>(body)} {}

  Task(const Task&) = delete;
  Task& operator=(const Task&) = delete;
  Task(Task&&) noexcept = default;
  Task& operator=(Task&&) noexcept = default;
  ~Task() = default;

  // Returns true when the task has finished and should not be requeued.
  [[nodiscard]] bool step() {
    auto start = Clock::now();
    bool done = body_();
    elapsed_ += Clock::now() - start;
    ++steps_;
    return done;
  }

  [[nodiscard]] TaskId id() const noexcept { return id_; }
  [[nodiscard]] std::string_view name() const noexcept { return name_; }
  [[nodiscard]] Priority priority() const noexcept { return prio_; }
  [[nodiscard]] Clock::duration elapsed() const noexcept { return elapsed_; }
  [[nodiscard]] std::uint32_t steps() const noexcept { return steps_; }

  friend bool operator<(const Task& a, const Task& b) noexcept {
    if (a.prio_ != b.prio_) return a.prio_ < b.prio_;
    return a.id_ > b.id_;  // older tasks first within a priority
  }

 private:
  TaskId id_;
  std::string name_;
  Priority prio_ = Priority::Normal;
  std::function<bool()> body_;
  Clock::duration elapsed_{};
  std::uint32_t steps_ = 0;
};

static_assert(Reportable<Task>);

struct TaskOrder {
  bool operator()(const std::unique_ptr<Task>& a, const std::unique_ptr<Task>& b) const noexcept {
    return *a < *b;
  }
};

class Scheduler {
 public:
  explicit Scheduler(std::size_t workers = kDefaultWorkers) {
    threads_.reserve(workers);
    for (std::size_t i = 0; i < workers; ++i) {
      threads_.emplace_back([this, i](std::stop_token st) { run_worker(i, st); });
    }
  }

  ~Scheduler() {
    {
      std::scoped_lock lock{mu_};
      stopping_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.request_stop();
  }

  Scheduler(const Scheduler&) = delete;
  Scheduler& operator=(const Scheduler&) = delete;

  template <TaskBody F>
  TaskId submit(std::string name, Priority prio, F&& body) {
    TaskId id{next_id_.fetch_add(1, std::memory_order_relaxed)};
    {
      std::scoped_lock lock{mu_};
      queue_.push(std::make_unique<Task>(id, std::move(name), prio, std::forward<F>(body)));
      ++pending_;
    }
    cv_.notify_one();
    return id;
  }

  void wait_idle() {
    std::unique_lock lock{mu_};
    idle_cv_.wait(lock, [this] { return pending_ == 0; });
  }

  [[nodiscard]] std::vector<std::pair<std::string, Clock::duration>> report() const {
    std::scoped_lock lock{mu_};
    std::vector<std::pair<std::string, Clock::duration>> rows(finished_.begin(), finished_.end());
    std::ranges::sort(rows, std::greater{}, &decltype(rows)::value_type::second);
    return rows;
  }

 private:
  void run_worker(std::size_t index, std::stop_token st) {
    while (!st.stop_requested()) {
      std::unique_ptr<Task> task;
      {
        std::unique_lock lock{mu_};
        if (!cv_.wait_for(lock, kIdleBackoff, [this] { return stopping_ || !queue_.empty(); })) {
          continue;
        }
        if (stopping_ && queue_.empty()) return;
        task = std::move(const_cast<std::unique_ptr<Task>&>(queue_.top()));
        queue_.pop();
      }

      if (!task->step()) {
        std::scoped_lock lock{mu_};
        queue_.push(std::move(task));
        cv_.notify_one();
        continue;
      }

      std::scoped_lock lock{mu_};
      finished_.emplace(std::string{task->name()}, task->elapsed());
      log_.push_back(std::format("worker {} finished {} [{}] in {} steps", index, task->name(),
                                 to_string(task->priority()), task->steps()));
      if (--pending_ == 0) idle_cv_.notify_all();
    }
  }

  mutable std::mutex mu_;
  std::condition_variable cv_;
  std::condition_variable idle_cv_;
  std::priority_queue<std::unique_ptr<Task>, std::vector<std::unique_ptr<Task>>, TaskOrder> queue_;
  std::map<std::string, Clock::duration> finished_;
  std::vector<std::string> log_;
  std::atomic<std::uint64_t> next_id_{1};
  std::size_t pending_ = 0;
  bool stopping_ = false;
  std::vector<std::jthread> threads_;
};

template <std::integral T>
[[nodiscard]] constexpr T fib(T n) noexcept {
  T a = 0, b = 1;
  for (T i = 0; i < n; ++i) a = std::exchange(b, a + b);
  return a;
}

static_assert(fib(10) == 55);

}  // namespace acme::sched

namespace {

constexpr std::string_view kBanner = R"(acme-sched v0.9
  usage: acme-sched [jobs]
  each job is "name:priority:steps", e.g. "lint:high:3"
)";

std::optional<acme::sched::Priority> parse_priority(std::string_view s) {
  using acme::sched::Priority;
  static const std::unordered_map<std::string_view, Priority> table{
      {"low", Priority::Low},
      {"normal", Priority::Normal},
      {"high", Priority::High},
      {"critical", Priority::Critical},
  };
  if (auto it = table.find(s); it != table.end()) return it->second;
  return std::nullopt;
}

}  // namespace

int main(int argc, char* argv[]) {
  using namespace acme::sched;

  if (argc > 1 && std::string_view{argv[1]} == "--help") {
    std::cout << kBanner;
    return 0;
  }

  Scheduler sched{3};
  std::atomic<int> checksum{0};

  auto make_job = [&checksum](int steps) {
    return [&checksum, remaining = steps]() mutable -> bool {
      checksum += static_cast<int>(fib(20 + remaining % 5));
      return --remaining <= 0;
    };
  };

  for (int i = 1; i < argc; ++i) {
    std::string_view spec{argv[i]};
    auto first = spec.find(':');
    auto second = spec.find(':', first + 1);
    if (first == std::string_view::npos || second == std::string_view::npos) {
      std::cerr << std::format("bad job spec: '{}'\n", spec);
      return 2;
    }
    auto prio = parse_priority(spec.substr(first + 1, second - first - 1)).value_or(Priority::Normal);
    int steps = std::stoi(std::string{spec.substr(second + 1)});
    sched.submit(std::string{spec.substr(0, first)}, prio, make_job(steps));
  }

  if (argc <= 1) {
    sched.submit("fetch", Priority::High, make_job(4));
    sched.submit("compile", Priority::Normal, make_job(12));
    sched.submit("test", Priority::Normal, make_job(8));
    sched.submit("publish\t(dry-run)", Priority::Low, make_job(2));
  }

  sched.wait_idle();

  for (const auto& [name, took] : sched.report()) {
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(took).count();
    std::cout << std::format("{:<20} {:>8}us\n", name, us);
  }
  std::cout << "checksum: " << checksum.load() << '\n';
  return 0;
}


// ---- unit 28 ----
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


// ---- unit 29 ----
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
