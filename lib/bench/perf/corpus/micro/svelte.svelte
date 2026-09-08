<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>
