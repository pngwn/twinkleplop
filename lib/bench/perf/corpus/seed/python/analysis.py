"""Cohort retention analysis.

Loads event data, buckets users into weekly signup cohorts and reports the
retention curve per cohort. Written to run either as a module or as a CLI.
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import functools
import itertools
import json
import logging
import math
import os
import sys
from collections import Counter, defaultdict
from collections.abc import Iterable, Iterator, Mapping, Sequence
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Final, Literal, Protocol, TypeAlias, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")
Row: TypeAlias = Mapping[str, str]
Bucket = Literal["day", "week", "month"]

EPOCH: Final = datetime(1970, 1, 1, tzinfo=timezone.utc)
DEFAULT_WINDOW: Final[int] = 12
MIN_COHORT_SIZE: Final[int] = 25
_TRUTHY = frozenset({"1", "true", "t", "yes", "y", "on"})


class ParseError(ValueError):
    """Raised when a source row cannot be coerced into an Event."""

    def __init__(self, line_no: int, field: str, raw: str) -> None:
        super().__init__(f"line {line_no}: bad {field!r} value {raw!r}")
        self.line_no = line_no
        self.field = field
        self.raw = raw


@dataclasses.dataclass(frozen=True, slots=True)
class Event:
    user_id: str
    occurred_at: datetime
    name: str
    revenue_cents: int = 0
    properties: Mapping[str, Any] = dataclasses.field(default_factory=dict)

    @property
    def revenue(self) -> float:
        return self.revenue_cents / 100.0

    def bucket_key(self, granularity: Bucket = "week") -> date:
        d = self.occurred_at.date()
        if granularity == "day":
            return d
        if granularity == "week":
            return d - timedelta(days=d.weekday())
        return d.replace(day=1)


@dataclasses.dataclass(slots=True)
class Cohort:
    key: date
    users: set[str] = dataclasses.field(default_factory=set)
    active: dict[int, set[str]] = dataclasses.field(default_factory=lambda: defaultdict(set))

    def size(self) -> int:
        return len(self.users)

    def retention(self, period: int) -> float:
        if not self.users:
            return 0.0
        return len(self.active[period] & self.users) / len(self.users)

    def curve(self, window: int = DEFAULT_WINDOW) -> list[float]:
        return [round(self.retention(p), 4) for p in range(window)]


class Source(Protocol):
    def __iter__(self) -> Iterator[Row]: ...


def _parse_bool(raw: str) -> bool:
    return raw.strip().lower() in _TRUTHY


def _parse_ts(raw: str, line_no: int) -> datetime:
    raw = raw.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(raw, fmt)
        except ValueError:
            continue
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromtimestamp(float(raw), tz=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise ParseError(line_no, "occurred_at", raw) from exc


def read_events(source: Source, *, strict: bool = False) -> Iterator[Event]:
    """Yield Events, skipping malformed rows unless *strict*."""
    for line_no, row in enumerate(source, start=2):
        try:
            props_raw = row.get("properties") or "{}"
            yield Event(
                user_id=row["user_id"].strip(),
                occurred_at=_parse_ts(row["occurred_at"], line_no),
                name=row.get("event", "unknown"),
                revenue_cents=int(row.get("revenue_cents") or 0),
                properties=json.loads(props_raw),
            )
        except (KeyError, ValueError, json.JSONDecodeError) as exc:
            if strict:
                raise
            logger.warning("skipping row %d: %s", line_no, exc)
            continue


def build_cohorts(
    events: Iterable[Event],
    *,
    signup_event: str = "signup",
    granularity: Bucket = "week",
    window: int = DEFAULT_WINDOW,
) -> dict[date, Cohort]:
    signups: dict[str, tuple[date, datetime]] = {}
    buffered: list[Event] = []

    for ev in events:
        buffered.append(ev)
        if ev.name != signup_event:
            continue
        key = ev.bucket_key(granularity)
        prior = signups.get(ev.user_id)
        if prior is None or ev.occurred_at < prior[1]:
            signups[ev.user_id] = (key, ev.occurred_at)

    cohorts: dict[date, Cohort] = {}
    for user_id, (key, _) in signups.items():
        cohorts.setdefault(key, Cohort(key=key)).users.add(user_id)

    step = {"day": 1, "week": 7, "month": 30}[granularity]
    for ev in buffered:
        entry = signups.get(ev.user_id)
        if entry is None:
            continue
        key, signed_up = entry
        delta_days = (ev.occurred_at - signed_up).days
        period = delta_days // step
        if 0 <= period < window:
            cohorts[key].active[period].add(ev.user_id)

    return dict(sorted(cohorts.items()))


@functools.lru_cache(maxsize=256)
def _confidence_halfwidth(n: int, p: float, z: float = 1.96) -> float:
    if n <= 0:
        return 0.0
    return z * math.sqrt(max(p * (1.0 - p), 0.0) / n)


def summarise(cohorts: Mapping[date, Cohort], window: int = DEFAULT_WINDOW) -> dict[str, Any]:
    rows = []
    for key, cohort in cohorts.items():
        if cohort.size() < MIN_COHORT_SIZE:
            continue
        curve = cohort.curve(window)
        rows.append(
            {
                "cohort": key.isoformat(),
                "size": cohort.size(),
                "curve": curve,
                "ci": [round(_confidence_halfwidth(cohort.size(), p), 4) for p in curve],
            }
        )

    weighted: Counter[int] = Counter()
    totals: Counter[int] = Counter()
    for cohort in cohorts.values():
        for period in range(window):
            weighted[period] += len(cohort.active[period] & cohort.users)
            totals[period] += cohort.size()

    blended = [
        round(weighted[p] / totals[p], 4) if totals[p] else 0.0 for p in range(window)
    ]
    return {"cohorts": rows, "blended": blended, "window": window}


def chunked(seq: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    it = iter(seq)
    while chunk := list(itertools.islice(it, size)):
        yield chunk


def _load(path: Path | str) -> Iterator[Row]:
    path = Path(path)
    if path.suffix == ".jsonl":
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#"):
                    yield json.loads(line)
        return
    with path.open(newline="", encoding="utf-8") as fh:
        yield from csv.DictReader(fh)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path", type=Path, help="csv or jsonl event export")
    parser.add_argument("-w", "--window", type=int, default=DEFAULT_WINDOW)
    parser.add_argument("-g", "--granularity", choices=("day", "week", "month"), default="week")
    parser.add_argument("--strict", action="store_true", help="fail on malformed rows")
    parser.add_argument("-o", "--out", type=argparse.FileType("w"), default=sys.stdout)
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(levelname)s %(name)s: %(message)s",
    )

    try:
        events = read_events(_load(args.path), strict=args.strict)
        cohorts = build_cohorts(events, granularity=args.granularity, window=args.window)
    except (OSError, ParseError) as exc:
        logger.error("failed: %s", exc)
        return 1

    json.dump(summarise(cohorts, args.window), args.out, indent=2, sort_keys=True)
    args.out.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
