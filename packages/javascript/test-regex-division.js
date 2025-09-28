// Test cases for regex vs division disambiguation

// Clear division cases
const a = 10 / 2;
const b = x / y;
const c = foo() / bar();
const d = arr[0] / arr[1];
const e = obj.prop / 5;
const f = (x + y) / z;
result = value / 10;
x /= 5;
y = z / 2 / 3;

// Clear regex cases
const r1 = /pattern/g;
const r2 = /test/;
if (/^test/.test(str)) {}
return /\d+/;
throw /error/;
typeof /regex/;
new RegExp(/base/);
void /test/;
delete /prop/;
case /pattern/:
else /test/;

// Ambiguous cases that need correct handling
// After operators - should be regex
x = /test/;
y + /pattern/;
z - /regex/;
a * /test/;
b < /pattern/;
c > /regex/;
d === /test/;
e !== /pattern/;
f && /regex/;
g || /test/;
h ? /pattern/ : /other/;
i , /regex/;

// After opening brackets - should be regex
(/test/);
[/pattern/];
{/regex/};
func(/test/);
arr[/pattern/];

// After identifiers/values - should be division
foo / bar;
123 / 456;
true / false;
null / undefined;
this / that;
super / duper;
"string" / 2;  // This would be an error but syntactically valid
) / x;
] / y;
} / z;

// Complex edge cases
const complex1 = condition ? a / b : c / d;
const complex2 = /regex/.test(s) / 2;  // regex.test() returns boolean, then divided
const complex3 = x++ / y--;
const complex4 = await promise / 2;
const complex5 = yield value / 3;
const complex6 = function() { return x / y; };
const complex7 = () => a / b;

// After keywords
return /test/;  // regex
return x / y;    // depends on x
throw /error/;   // regex
throw err / 2;   // depends on err (would be runtime error)
typeof /test/;   // regex
typeof x / y;    // typeof has higher precedence, so (typeof x) / y

// In expressions
const expr1 = x + y / z;  // division
const expr2 = x * /test/;  // regex (though unusual)
const expr3 = /test/ + /other/;  // two regexes
const expr4 = a / b / c;  // two divisions
const expr5 = /a/ / /b/;  // regex divided by regex (unusual but valid)

// Method chains and property access
obj.method() / value;  // division
/regex/.test() / 2;     // division (after method call)
value / obj.prop;       // division
/test/ .flags;          // property access on regex

// After semicolons and commas
x = 1; /test/;  // regex
arr = [1, /test/];  // regex
obj = {a: 1, b: /test/};  // regex

// Start of statement
/test/.exec(str);  // regex with method call
/pattern/g;        // regex with flags

// Arrow functions and division
const arrow1 = x => x / 2;
const arrow2 = () => /test/;
const arrow3 = (a, b) => a / b;

// Special: Division by regex (unusual but syntactically valid)
const weird1 = 10 / /test/;  // number divided by regex
const weird2 = /a/ / /b/;    // regex divided by regex