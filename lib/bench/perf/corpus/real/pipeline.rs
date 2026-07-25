//! Streaming record pipeline.
//!
//! Reads newline-delimited JSON off an async source, validates and enriches
//! each record, then fans the results out to a set of sinks with bounded
//! back-pressure. The whole thing is generic over the transport so tests can
//! drive it from an in-memory buffer.

use std::borrow::Cow;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt::{self, Display, Formatter};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::{mpsc, RwLock, Semaphore};

pub const MAX_BATCH: usize = 512;
pub const DEFAULT_FLUSH: Duration = Duration::from_millis(250);

static SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Error)]
pub enum PipelineError {
    #[error("decode failed at offset {offset}: {source}")]
    Decode {
        offset: usize,
        #[source]
        source: serde_json::Error,
    },
    #[error("record {id} rejected: {reason}")]
    Rejected { id: String, reason: Cow<'static, str> },
    #[error("sink {0} is closed")]
    SinkClosed(&'static str),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

pub type Result<T, E = PipelineError> = std::result::Result<T, E>;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct Record {
    pub id: String,
    #[serde(default)]
    pub kind: Kind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub attrs: BTreeMap<String, Value>,
    #[serde(default)]
    pub weight: f64,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum Kind {
    #[default]
    Unknown,
    Event,
    Metric,
    Trace,
}

impl Display for Kind {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        let name = match self {
            Kind::Unknown => "unknown",
            Kind::Event => "event",
            Kind::Metric => "metric",
            Kind::Trace => "trace",
        };
        f.write_str(name)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Value {
    Bool(bool),
    Int(i64),
    Float(f64),
    Text(String),
    List(Vec<Value>),
}

impl Value {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Value::Text(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn numeric(&self) -> Option<f64> {
        match *self {
            Value::Int(i) => Some(i as f64),
            Value::Float(f) => Some(f),
            Value::Bool(b) => Some(if b { 1.0 } else { 0.0 }),
            _ => None,
        }
    }
}

pub trait Enricher: Send + Sync {
    fn name(&self) -> &'static str;
    fn enrich(&self, rec: &mut Record) -> Result<()>;
}

pub struct LabelEnricher {
    labels: HashMap<&'static str, &'static str>,
}

impl LabelEnricher {
    pub fn new(labels: impl IntoIterator<Item = (&'static str, &'static str)>) -> Self {
        Self { labels: labels.into_iter().collect() }
    }
}

impl Enricher for LabelEnricher {
    fn name(&self) -> &'static str {
        "labels"
    }

    fn enrich(&self, rec: &mut Record) -> Result<()> {
        for (k, v) in &self.labels {
            rec.attrs.entry((*k).to_owned()).or_insert_with(|| Value::Text((*v).to_owned()));
        }
        Ok(())
    }
}

pub struct Dedup<'a> {
    seen: RwLock<HashSet<Cow<'a, str>>>,
    capacity: usize,
}

impl<'a> Dedup<'a> {
    pub fn with_capacity(capacity: usize) -> Self {
        Self { seen: RwLock::new(HashSet::with_capacity(capacity)), capacity }
    }

    pub async fn admit(&self, key: &'a str) -> bool {
        {
            let guard = self.seen.read().await;
            if guard.contains(key) {
                return false;
            }
        }
        let mut guard = self.seen.write().await;
        if guard.len() >= self.capacity {
            guard.clear();
        }
        guard.insert(Cow::Borrowed(key))
    }
}

#[derive(Debug, Default)]
pub struct Stats {
    pub accepted: u64,
    pub rejected: u64,
    pub flushed: u64,
    pub elapsed: Duration,
}

impl Stats {
    pub fn rate(&self) -> f64 {
        let secs = self.elapsed.as_secs_f64();
        if secs <= f64::EPSILON {
            return 0.0;
        }
        self.accepted as f64 / secs
    }
}

pub struct Pipeline {
    enrichers: Vec<Arc<dyn Enricher>>,
    permits: Arc<Semaphore>,
    batch: Vec<Record>,
    flush_after: Duration,
    last_flush: Instant,
    stats: Stats,
}

impl Pipeline {
    pub fn builder() -> PipelineBuilder {
        PipelineBuilder::default()
    }

    pub fn push(&mut self, mut rec: Record) -> Result<bool> {
        if rec.id.is_empty() {
            self.stats.rejected += 1;
            return Err(PipelineError::Rejected {
                id: String::from("<empty>"),
                reason: Cow::Borrowed("missing id"),
            });
        }
        for enricher in &self.enrichers {
            enricher.enrich(&mut rec).map_err(|e| match e {
                PipelineError::Rejected { id, reason } => PipelineError::Rejected {
                    id,
                    reason: Cow::Owned(format!("{}: {reason}", enricher.name())),
                },
                other => other,
            })?;
        }
        rec.weight = rec
            .attrs
            .values()
            .filter_map(Value::numeric)
            .fold(0.0_f64, |acc, n| acc + n.abs());
        self.batch.push(rec);
        self.stats.accepted += 1;
        Ok(self.batch.len() >= MAX_BATCH || self.last_flush.elapsed() >= self.flush_after)
    }

    pub async fn flush<S>(&mut self, sink: &mut S) -> Result<usize>
    where
        S: Sink + ?Sized,
    {
        if self.batch.is_empty() {
            return Ok(0);
        }
        let _permit = self.permits.acquire().await.map_err(|_| PipelineError::SinkClosed("permits"))?;
        let drained: Vec<Record> = std::mem::take(&mut self.batch);
        let n = drained.len();
        sink.write_batch(&drained).await?;
        self.last_flush = Instant::now();
        self.stats.flushed += n as u64;
        Ok(n)
    }

    pub fn stats(&self) -> &Stats {
        &self.stats
    }
}

#[derive(Default)]
pub struct PipelineBuilder {
    enrichers: Vec<Arc<dyn Enricher>>,
    concurrency: Option<usize>,
    flush_after: Option<Duration>,
}

impl PipelineBuilder {
    #[must_use]
    pub fn enricher(mut self, e: impl Enricher + 'static) -> Self {
        self.enrichers.push(Arc::new(e));
        self
    }

    #[must_use]
    pub fn concurrency(mut self, n: usize) -> Self {
        self.concurrency = Some(n.max(1));
        self
    }

    pub fn build(self) -> Pipeline {
        Pipeline {
            enrichers: self.enrichers,
            permits: Arc::new(Semaphore::new(self.concurrency.unwrap_or(4))),
            batch: Vec::with_capacity(MAX_BATCH),
            flush_after: self.flush_after.unwrap_or(DEFAULT_FLUSH),
            last_flush: Instant::now(),
            stats: Stats::default(),
        }
    }
}

#[async_trait::async_trait]
pub trait Sink: Send {
    async fn write_batch(&mut self, records: &[Record]) -> Result<()>;
}

pub struct ChannelSink {
    tx: mpsc::Sender<Vec<Record>>,
}

#[async_trait::async_trait]
impl Sink for ChannelSink {
    async fn write_batch(&mut self, records: &[Record]) -> Result<()> {
        self.tx
            .send(records.to_vec())
            .await
            .map_err(|_| PipelineError::SinkClosed("channel"))
    }
}

pub fn next_sequence() -> u64 {
    SEQUENCE.fetch_add(1, Ordering::Relaxed)
}

pub fn parse_lines(buf: &str) -> impl Iterator<Item = Result<Record>> + '_ {
    buf.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .enumerate()
        .map(|(offset, line)| {
            serde_json::from_str::<Record>(line)
                .map_err(|source| PipelineError::Decode { offset, source })
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn weight_is_sum_of_absolute_numerics() {
        let mut p = Pipeline::builder().concurrency(2).build();
        let mut rec = Record { id: "a".into(), ..Default::default() };
        rec.attrs.insert("x".into(), Value::Int(-3));
        rec.attrs.insert("y".into(), Value::Float(1.5));
        rec.attrs.insert("label".into(), Value::Text("ignored".into()));
        p.push(rec).expect("push");
        assert_eq!(p.batch[0].weight, 4.5);
    }

    #[tokio::test]
    async fn dedup_admits_once() {
        let d = Dedup::with_capacity(8);
        assert!(d.admit("k").await);
        assert!(!d.admit("k").await);
    }
}
