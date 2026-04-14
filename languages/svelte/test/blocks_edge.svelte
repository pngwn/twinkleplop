<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}
