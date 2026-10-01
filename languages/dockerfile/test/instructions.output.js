export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 2,
		"match": "# "
	},
	{
		"type": "directive",
		"start": 2,
		"end": 8,
		"match": "syntax"
	},
	{
		"type": "operator",
		"start": 8,
		"end": 9,
		"match": "="
	},
	{
		"type": "comment",
		"start": 9,
		"end": 31,
		"match": "docker/dockerfile:1\n# "
	},
	{
		"type": "directive",
		"start": 31,
		"end": 36,
		"match": "check"
	},
	{
		"type": "operator",
		"start": 36,
		"end": 37,
		"match": "="
	},
	{
		"type": "comment",
		"start": 37,
		"end": 73,
		"match": "skip=JSONArgsRecommended;error=true\n"
	},
	{
		"type": "keyword",
		"start": 73,
		"end": 76,
		"match": "ARG"
	},
	{
		"type": "property",
		"start": 77,
		"end": 81,
		"match": "BASE"
	},
	{
		"type": "operator",
		"start": 81,
		"end": 82,
		"match": "="
	},
	{
		"type": "string",
		"start": 82,
		"end": 93,
		"match": "alpine:3.22"
	},
	{
		"type": "keyword",
		"start": 94,
		"end": 98,
		"match": "FrOm"
	},
	{
		"type": "property",
		"start": 99,
		"end": 109,
		"match": "--platform"
	},
	{
		"type": "operator",
		"start": 109,
		"end": 110,
		"match": "="
	},
	{
		"type": "variable",
		"start": 110,
		"end": 124,
		"match": "$BUILDPLATFORM"
	},
	{
		"type": "variable",
		"start": 125,
		"end": 132,
		"match": "${BASE}"
	},
	{
		"type": "keyword",
		"start": 133,
		"end": 135,
		"match": "aS"
	},
	{
		"type": "string",
		"start": 136,
		"end": 141,
		"match": "build"
	},
	{
		"type": "keyword",
		"start": 142,
		"end": 147,
		"match": "LABEL"
	},
	{
		"type": "property",
		"start": 148,
		"end": 178,
		"match": "org.opencontainers.image.title"
	},
	{
		"type": "operator",
		"start": 178,
		"end": 179,
		"match": "="
	},
	{
		"type": "string",
		"start": 179,
		"end": 192,
		"match": "\"Twinkleplop\""
	},
	{
		"type": "operator",
		"start": 193,
		"end": 195,
		"match": "\\\n"
	},
	{
		"type": "property",
		"start": 201,
		"end": 237,
		"match": "org.opencontainers.image.description"
	},
	{
		"type": "operator",
		"start": 237,
		"end": 238,
		"match": "="
	},
	{
		"type": "string",
		"start": 238,
		"end": 257,
		"match": "'Unicode: café 日本語'"
	},
	{
		"type": "keyword",
		"start": 258,
		"end": 261,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 262,
		"end": 270,
		"match": "NODE_ENV"
	},
	{
		"type": "operator",
		"start": 270,
		"end": 271,
		"match": "="
	},
	{
		"type": "string",
		"start": 271,
		"end": 281,
		"match": "production"
	},
	{
		"type": "property",
		"start": 282,
		"end": 286,
		"match": "PORT"
	},
	{
		"type": "operator",
		"start": 286,
		"end": 287,
		"match": "="
	},
	{
		"type": "string",
		"start": 287,
		"end": 291,
		"match": "8080"
	},
	{
		"type": "property",
		"start": 292,
		"end": 296,
		"match": "PATH"
	},
	{
		"type": "operator",
		"start": 296,
		"end": 297,
		"match": "="
	},
	{
		"type": "string",
		"start": 297,
		"end": 307,
		"match": "\"/app/bin:"
	},
	{
		"type": "variable",
		"start": 307,
		"end": 314,
		"match": "${PATH}"
	},
	{
		"type": "string",
		"start": 314,
		"end": 315,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 316,
		"end": 319,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 320,
		"end": 326,
		"match": "LEGACY"
	},
	{
		"type": "string",
		"start": 327,
		"end": 332,
		"match": "value"
	},
	{
		"type": "string",
		"start": 333,
		"end": 337,
		"match": "with"
	},
	{
		"type": "string",
		"start": 338,
		"end": 344,
		"match": "spaces"
	},
	{
		"type": "keyword",
		"start": 345,
		"end": 348,
		"match": "ARG"
	},
	{
		"type": "property",
		"start": 349,
		"end": 359,
		"match": "TARGETARCH"
	},
	{
		"type": "keyword",
		"start": 360,
		"end": 367,
		"match": "WORKDIR"
	},
	{
		"type": "string",
		"start": 368,
		"end": 372,
		"match": "/app"
	},
	{
		"type": "keyword",
		"start": 373,
		"end": 377,
		"match": "COPY"
	},
	{
		"type": "property",
		"start": 378,
		"end": 384,
		"match": "--link"
	},
	{
		"type": "property",
		"start": 385,
		"end": 391,
		"match": "--from"
	},
	{
		"type": "operator",
		"start": 391,
		"end": 392,
		"match": "="
	},
	{
		"type": "string",
		"start": 392,
		"end": 397,
		"match": "build"
	},
	{
		"type": "property",
		"start": 398,
		"end": 405,
		"match": "--chown"
	},
	{
		"type": "operator",
		"start": 405,
		"end": 406,
		"match": "="
	},
	{
		"type": "string",
		"start": 406,
		"end": 415,
		"match": "1000:1000"
	},
	{
		"type": "property",
		"start": 416,
		"end": 423,
		"match": "--chmod"
	},
	{
		"type": "operator",
		"start": 423,
		"end": 424,
		"match": "="
	},
	{
		"type": "string",
		"start": 424,
		"end": 428,
		"match": "0755"
	},
	{
		"type": "string",
		"start": 429,
		"end": 433,
		"match": "/out"
	},
	{
		"type": "string",
		"start": 434,
		"end": 438,
		"match": "/app"
	},
	{
		"type": "keyword",
		"start": 439,
		"end": 442,
		"match": "ADD"
	},
	{
		"type": "property",
		"start": 443,
		"end": 453,
		"match": "--checksum"
	},
	{
		"type": "operator",
		"start": 453,
		"end": 454,
		"match": "="
	},
	{
		"type": "string",
		"start": 454,
		"end": 467,
		"match": "sha256:abc123"
	},
	{
		"type": "string",
		"start": 468,
		"end": 510,
		"match": "https://example.com/archive.tar.gz#release"
	},
	{
		"type": "string",
		"start": 511,
		"end": 516,
		"match": "/src/"
	},
	{
		"type": "keyword",
		"start": 517,
		"end": 520,
		"match": "RUN"
	},
	{
		"type": "property",
		"start": 521,
		"end": 528,
		"match": "--mount"
	},
	{
		"type": "operator",
		"start": 528,
		"end": 529,
		"match": "="
	},
	{
		"type": "string",
		"start": 529,
		"end": 559,
		"match": "type=cache,target=/root/.cache"
	},
	{
		"type": "property",
		"start": 560,
		"end": 569,
		"match": "--network"
	},
	{
		"type": "operator",
		"start": 569,
		"end": 570,
		"match": "="
	},
	{
		"type": "string",
		"start": 570,
		"end": 574,
		"match": "none"
	},
	{
		"type": "string",
		"start": 575,
		"end": 580,
		"match": "build"
	},
	{
		"type": "string",
		"start": 581,
		"end": 590,
		"match": "--release"
	},
	{
		"type": "keyword",
		"start": 591,
		"end": 595,
		"match": "USER"
	},
	{
		"type": "string",
		"start": 596,
		"end": 605,
		"match": "1000:1000"
	},
	{
		"type": "keyword",
		"start": 606,
		"end": 612,
		"match": "EXPOSE"
	},
	{
		"type": "number",
		"start": 613,
		"end": 617,
		"match": "8080"
	},
	{
		"type": "punctuation",
		"start": 617,
		"end": 618,
		"match": "/"
	},
	{
		"type": "string",
		"start": 618,
		"end": 621,
		"match": "tcp"
	},
	{
		"type": "number",
		"start": 622,
		"end": 626,
		"match": "8000"
	},
	{
		"type": "punctuation",
		"start": 626,
		"end": 627,
		"match": "-"
	},
	{
		"type": "number",
		"start": 627,
		"end": 631,
		"match": "8010"
	},
	{
		"type": "punctuation",
		"start": 631,
		"end": 632,
		"match": "/"
	},
	{
		"type": "string",
		"start": 632,
		"end": 635,
		"match": "udp"
	},
	{
		"type": "keyword",
		"start": 636,
		"end": 642,
		"match": "VOLUME"
	},
	{
		"type": "punctuation",
		"start": 643,
		"end": 644,
		"match": "["
	},
	{
		"type": "string",
		"start": 644,
		"end": 651,
		"match": "\"/data\""
	},
	{
		"type": "punctuation",
		"start": 651,
		"end": 652,
		"match": ","
	},
	{
		"type": "string",
		"start": 653,
		"end": 661,
		"match": "\"/cache\""
	},
	{
		"type": "punctuation",
		"start": 661,
		"end": 662,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 663,
		"end": 673,
		"match": "STOPSIGNAL"
	},
	{
		"type": "string",
		"start": 674,
		"end": 681,
		"match": "SIGTERM"
	},
	{
		"type": "keyword",
		"start": 682,
		"end": 692,
		"match": "STOPSIGNAL"
	},
	{
		"type": "number",
		"start": 693,
		"end": 695,
		"match": "15"
	},
	{
		"type": "keyword",
		"start": 696,
		"end": 707,
		"match": "HEALTHCHECK"
	},
	{
		"type": "property",
		"start": 708,
		"end": 718,
		"match": "--interval"
	},
	{
		"type": "operator",
		"start": 718,
		"end": 719,
		"match": "="
	},
	{
		"type": "string",
		"start": 719,
		"end": 722,
		"match": "30s"
	},
	{
		"type": "property",
		"start": 723,
		"end": 732,
		"match": "--timeout"
	},
	{
		"type": "operator",
		"start": 732,
		"end": 733,
		"match": "="
	},
	{
		"type": "string",
		"start": 733,
		"end": 735,
		"match": "3s"
	},
	{
		"type": "property",
		"start": 736,
		"end": 745,
		"match": "--retries"
	},
	{
		"type": "operator",
		"start": 745,
		"end": 746,
		"match": "="
	},
	{
		"type": "string",
		"start": 746,
		"end": 747,
		"match": "3"
	},
	{
		"type": "keyword",
		"start": 748,
		"end": 751,
		"match": "CMD"
	},
	{
		"type": "string",
		"start": 752,
		"end": 756,
		"match": "curl"
	},
	{
		"type": "string",
		"start": 757,
		"end": 759,
		"match": "-f"
	},
	{
		"type": "string",
		"start": 760,
		"end": 777,
		"match": "http://localhost/"
	},
	{
		"type": "operator",
		"start": 778,
		"end": 780,
		"match": "||"
	},
	{
		"type": "string",
		"start": 781,
		"end": 785,
		"match": "exit"
	},
	{
		"type": "string",
		"start": 786,
		"end": 787,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 788,
		"end": 795,
		"match": "ONBUILD"
	},
	{
		"type": "keyword",
		"start": 796,
		"end": 800,
		"match": "COPY"
	},
	{
		"type": "string",
		"start": 801,
		"end": 802,
		"match": "."
	},
	{
		"type": "string",
		"start": 803,
		"end": 807,
		"match": "/app"
	},
	{
		"type": "keyword",
		"start": 808,
		"end": 815,
		"match": "ONBUILD"
	},
	{
		"type": "keyword",
		"start": 816,
		"end": 819,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 820,
		"end": 824,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 825,
		"end": 830,
		"match": "ready"
	},
	{
		"type": "keyword",
		"start": 831,
		"end": 842,
		"match": "HEALTHCHECK"
	},
	{
		"type": "keyword",
		"start": 843,
		"end": 847,
		"match": "NONE"
	},
	{
		"type": "keyword",
		"start": 848,
		"end": 858,
		"match": "MAINTAINER"
	},
	{
		"type": "string",
		"start": 859,
		"end": 866,
		"match": "Someone"
	},
	{
		"type": "string",
		"start": 867,
		"end": 888,
		"match": "<someone@example.com>"
	},
	{
		"type": "keyword",
		"start": 889,
		"end": 894,
		"match": "SHELL"
	},
	{
		"type": "punctuation",
		"start": 895,
		"end": 896,
		"match": "["
	},
	{
		"type": "string",
		"start": 896,
		"end": 905,
		"match": "\"/bin/sh\""
	},
	{
		"type": "punctuation",
		"start": 905,
		"end": 906,
		"match": ","
	},
	{
		"type": "string",
		"start": 907,
		"end": 911,
		"match": "\"-c\""
	},
	{
		"type": "punctuation",
		"start": 911,
		"end": 912,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 913,
		"end": 923,
		"match": "ENTRYPOINT"
	},
	{
		"type": "punctuation",
		"start": 924,
		"end": 925,
		"match": "["
	},
	{
		"type": "string",
		"start": 925,
		"end": 938,
		"match": "\"/app/server\""
	},
	{
		"type": "punctuation",
		"start": 938,
		"end": 939,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 940,
		"end": 943,
		"match": "CMD"
	},
	{
		"type": "punctuation",
		"start": 944,
		"end": 945,
		"match": "["
	},
	{
		"type": "string",
		"start": 945,
		"end": 953,
		"match": "\"--help\""
	},
	{
		"type": "punctuation",
		"start": 953,
		"end": 954,
		"match": "]"
	}
];
