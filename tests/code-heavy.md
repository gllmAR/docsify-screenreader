# Code heavy test

By default code blocks are **skipped**. Enable "Read code blocks" in the widget panel and the page re-chunks with them included.

## A JavaScript example

```js
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

greet('world');
```

## A shell example

```sh
npm install
npm run build
npm run serve
```

## Inline code in prose

The config option `window.$docsify.screenreader` accepts an object. The variable `readCode` controls whether fenced blocks are spoken.

## Code inside a list

1. Clone the repository
2. Run `npm install`
3. Start the dev server

Inline code should always be read as part of its sentence regardless of the toggle.
