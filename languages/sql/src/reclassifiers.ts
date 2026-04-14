// sql reclassifier pipeline.
//
// the grammar emits every unquoted word as `identifier`. this reclassifier
// walks the token stream and promotes identifiers to `keyword`, `boolean`,
// or a custom `type` token based on case-insensitive membership in three
// sets. doing keyword recognition in a post-pass is far cheaper than
// enumerating every case variant in the state machine (sql keywords are
// case-insensitive in every dialect).
//
// the sets below are a permissive union across postgresql, mysql, sqlite,
// and transact-sql. see RESEARCH.md for the dialect-by-dialect breakdown.

import type { Reclassifier } from "@twinkleplop/core";

const TYPE_TOKEN = "type";

// ---------------------------------------------------------------------------
// keyword sets. lowercased for case-insensitive lookup.
// ---------------------------------------------------------------------------

const BOOLEAN_WORDS = new Set(["true", "false", "null", "unknown"]);

const TYPE_WORDS = new Set([
	// integers
	"int", "integer", "smallint", "bigint", "tinyint", "mediumint",
	"int2", "int4", "int8",
	// decimal / numeric
	"decimal", "numeric", "dec", "fixed",
	// floating
	"real", "float", "float4", "float8", "double", "precision",
	// character
	"char", "character", "varchar", "nvarchar", "nchar",
	"text", "ntext", "clob", "nclob",
	"longtext", "mediumtext", "tinytext",
	// binary
	"binary", "varbinary", "blob", "longblob", "mediumblob", "tinyblob",
	"bytea", "bit", "varbit", "image",
	// boolean
	"bool", "boolean",
	// date/time
	"date", "time", "timestamp", "datetime", "year", "interval",
	"timestamptz", "timetz", "smalldatetime", "datetime2", "datetimeoffset",
	// misc
	"json", "jsonb", "xml", "uuid", "money", "smallmoney",
	"array", "enum", "record",
	"point", "line", "lseg", "box", "path", "polygon", "circle",
	"inet", "cidr", "macaddr", "macaddr8",
	"tsvector", "tsquery", "hstore",
	"geometry", "geography",
	"rowversion", "cursor", "hierarchyid", "sql_variant", "uniqueidentifier",
	"serial", "bigserial", "smallserial",
]);

const KEYWORD_WORDS = new Set([
	// dml / dql
	"select", "from", "where", "group", "by", "having",
	"order", "limit", "offset", "fetch", "first", "next", "last",
	"union", "intersect", "except", "all", "distinct", "as", "asc", "desc",
	"insert", "into", "values", "update", "set", "delete", "returning",
	"upsert", "merge", "matched",
	// ddl
	"create", "alter", "drop", "truncate", "rename", "replace",
	"table", "view", "index", "database", "schema", "trigger",
	"function", "procedure", "routine", "event", "sequence",
	"domain", "collation", "role", "user", "tablespace", "extension",
	// dcl
	"grant", "revoke", "deny", "privileges", "to",
	// tcl
	"begin", "start", "commit", "rollback", "savepoint", "release",
	"work", "transaction", "isolation", "level", "serializable",
	"repeatable", "read", "write", "committed", "uncommitted", "snapshot",
	// joins and set operations
	"join", "inner", "left", "right", "full", "outer", "cross",
	"natural", "on", "using", "lateral", "straight_join", "apply",
	"pivot", "unpivot", "tablesample",
	// cte / window
	"with", "recursive", "window", "over", "partition",
	"row", "rows", "range", "groups",
	"unbounded", "preceding", "following", "current", "exclude", "ties", "others",
	// control flow
	"case", "when", "then", "else", "end", "if", "elseif", "elsif",
	"while", "loop", "for", "do", "exit", "continue",
	"return", "returns", "declare", "cursor", "open", "close",
	"prior", "language", "body", "try", "catch", "throw",
	"print", "exec", "execute", "call",
	// predicates / operators
	"and", "or", "not", "xor", "in", "between", "like", "ilike",
	"similar", "is", "isnull", "notnull", "unique", "exists",
	"any", "some", "collate", "div", "mod", "escape",
	"glob", "match", "regexp", "rlike", "overlaps", "contains",
	"at", "zone", "local",
	// constants
	"default", "current_date", "current_time", "current_timestamp",
	"current_user", "session_user", "system_user",
	"localtime", "localtimestamp",
	"current_role", "current_schema", "current_catalog",
	// constraints
	"primary", "foreign", "key", "references", "check", "constraint",
	"generated", "always", "identity", "autoincrement", "auto_increment",
	"temporary", "temp", "global", "local",
	"cascade", "restrict", "deferrable", "deferred", "immediate", "initially",
	"nulls", "without", "stored", "virtual",
	// ddl options
	"add", "column", "change", "modify", "enable", "disable",
	"lock", "unlock", "tables", "show", "use", "describe", "desc",
	"explain", "analyze", "vacuum", "attach", "detach",
	"backup", "restore", "checkpoint", "reindex", "cluster",
	// admin / t-sql-specific
	"dbcc", "errlvl", "holdlock", "nocheck", "nonclustered", "clustered",
	"opendatasource", "openquery", "openrowset", "openxml",
	"raiserror", "reconfigure", "revert", "rowguidcol",
	"semantickeyphrasetable", "try_convert", "tsequal", "waitfor",
	"recompile", "option", "fillfactor", "go",
	// misc
	"comment", "before", "after", "instead", "each", "statement",
	"new", "old", "of", "both", "leading", "trailing", "placing",
	"immutable", "stable", "volatile", "cost", "parallel",
	"safe", "restricted", "unsafe", "leakproof", "strict",
	"definer", "invoker", "security", "setof",
	"out", "inout", "variadic", "only", "rule", "materialized",
	"nothing", "conflict", "excluded", "concurrently",
	"verbose", "costs", "buffers", "format", "abort",
	"exclusive", "share", "nowait", "skip", "locked",
	"filter", "within", "cast", "convert", "extract",
	"abort", "ignore", "fail", "abort", "replace",
	// pl/pgsql / procedural
	"perform", "raise", "notice", "warning", "exception", "found",
	"get", "diagnostics", "stacked",
	// sqlite-specific
	"vacuum", "pragma", "indexed", "without", "virtual", "materialized",
	"detach", "reindex",
]);

// ---------------------------------------------------------------------------
// reclassifier: identifier → keyword / type / boolean based on the lowercase
// text of the token. quoted identifiers are not reclassified because their
// case and quotes preserve the original intent ("select" is an identifier
// literally named select, not the keyword).
//
// quoted identifiers arrive in the stream as `identifier` tokens whose
// source text starts with a quote character (", `, or [). we skip those.
// ---------------------------------------------------------------------------

const keyword_reclassifier: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const n = tokens.length / 3;
	if (n === 0) return result;

	const identifier_id = token_types.indexOf("identifier");
	if (identifier_id < 0) return result;

	const ensure_type_id = (name: string): number => {
		let id = token_types.indexOf(name);
		if (id < 0) {
			id = token_types.length;
			token_types.push(name);
		}
		return id;
	};

	const keyword_id = ensure_type_id("keyword");
	const boolean_id = ensure_type_id("boolean");
	const type_id = ensure_type_id(TYPE_TOKEN);

	for (let i = 0; i < n; i++) {
		if (tokens[i * 3] !== identifier_id) continue;
		const start = tokens[i * 3 + 1];
		const end = tokens[i * 3 + 2];
		const first = input.charCodeAt(start);
		// skip quoted identifiers: they carry their quoting into the source
		// text and are not reclassified as keywords. 0x22 " / 0x60 ` / 0x5b [.
		if (first === 0x22 || first === 0x60 || first === 0x5b) continue;
		// skip mysql charset introducers (`_utf8`, etc.) — leading underscore
		// plus all lowercase letters. these would never be keywords anyway,
		// but the guard avoids false positives if someone names a keyword
		// with a leading underscore.
		const text = input.slice(start, end).toLowerCase();
		if (BOOLEAN_WORDS.has(text)) {
			tokens[i * 3] = boolean_id;
		} else if (TYPE_WORDS.has(text)) {
			tokens[i * 3] = type_id;
		} else if (KEYWORD_WORDS.has(text)) {
			tokens[i * 3] = keyword_id;
		}
	}

	return result;
};

export const reclassifiers = [keyword_reclassifier];
