---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight keywords inside call arguments. The two states covering a call's parentheses carried no keyword rules at all, so nothing between them was recognised:

```js
console.log(typeof x)     // typeof read as an identifier
fn(await p)               // await read as an identifier
fn(new Date())            // new read as an identifier, Date as a function
fn(function () {})        // function read as an identifier
fn(null, true)            // null read as an identifier
```

It was inconsistent rather than uniformly wrong, which is why it went unnoticed: `fn(a instanceof B)` was correct, because the leading identifier had already leaked the machine out into `division`, where the keyword rules live. Only a keyword that opened an argument was missed.

Both states now take a keyword list. They end differently, which decides where those keywords may go: a call's own parentheses leave sideways on `)`, so their keywords route to `regex_allow` / `division` as everywhere else — making `fn(this / 2)` a division and `fn(typeof /re/)` a regex. Nested parentheses are pushed and pop on `)`, so theirs stay put; routing them out would strand the frame on the stack. Both also gained a member-access entry, so `fn((x.default))` still reads `default` as a name.

The list is supplied per language, so TypeScript's own words work too: `fn(x as Foo)`, `fn(y satisfies Shape)`, and the parameter property in `constructor(public name: string)`, which was previously an identifier.
