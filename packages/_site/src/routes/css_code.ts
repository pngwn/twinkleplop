export const css = `:root {
  --gap: 1.25rem;
  --brand: hsl(200 80% 50%);
}

@media (min-width: 600px) {
  body {
    font-family: system-ui, sans-serif;
    background: linear-gradient(
      45deg, 
      var(--brand), 
      white
    );
  }

  /* nesting */
  .card {
    display: grid;
    gap: var(--gap);

    & a[href^="http"]::after {
      content: "↗";
      margin-left: 0.25em;
    }
  }
}`;
