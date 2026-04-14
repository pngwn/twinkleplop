<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>
