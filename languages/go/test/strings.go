package strs

const (
	plain   = "hello, world"
	escapes = "a\tb\nc\\d\"e\r\v\f\b\a"
	hexes   = "\x00\xFF"
	unis    = "\u00e4\U0001F600"
	octs    = "\000\377"
	empty   = ""
)

const raw = `no escapes here: \n \t \"`

const multiline = `line one
line two
line three`

const backticksInterp = "use ` inside a regular string, that's fine"

type User struct {
	Name string `json:"name,omitempty" xml:"name"`
	Age  int    `json:"age"`
}

var runes = []rune{
	'a',
	'ä',
	'本',
	'\t',
	'\n',
	'\\',
	'\'',
	'\000',
	'\007',
	'\377',
	'\x07',
	'\xff',
	'\u12e4',
	'\U00101234',
}
