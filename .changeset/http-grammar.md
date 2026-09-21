---
"@twinkleplop/http": patch
"@twinkleplop/core": patch
"@twinkleplop/theme-github": patch
"@twinkleplop/theme-atom-one": patch
---

Add `@twinkleplop/http` for raw HTTP requests and responses and for `.http` request files from the VS Code REST Client and the JetBrains HTTP Client. JSON and HTML bodies, `{% %}` scripts and `curl` requests are highlighted in their own language, and a `{{variable}}` inside a body leaves the text around it intact:

```http
POST https://{{host}}/comments
Content-Type: application/json

{ "created_at": "{{$datetime iso8601}}" }
```

Core adds `raw_json` and `raw_markup` placeholder tokens for the embedded bodies, and both themes map them to the default text colour.
