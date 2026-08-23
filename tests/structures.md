# Structure test

This page exercises the chunker against common markdown output. Every prose element here should be read exactly once, in document order.

## Lists

- First bullet point
- Second bullet point with a [link to Docsify](https://docsify.js.org) in the middle
- Third bullet point
  - A nested item that must not be read twice
  - Another nested item

1. Ordered item one
2. Ordered item two
3. Ordered item three

## Tables

| Feature | Desktop | Mobile |
| ------- | ------- | ------ |
| Play / pause | Yes | Yes |
| Word highlight | Yes | Yes |
| Background playback | Varies | Android yes, iOS resume |

Each table cell above should be spoken as its own segment.

## Blockquotes

> Blockquotes contain paragraphs which should be read like any other paragraph.
>
> This is the second paragraph of the same blockquote.

## Inline formatting

Text with **bold**, *italic*, `inline code`, and a [link](https://example.com) should flow naturally without odd gaps or duplicated words.

## Nested headings

### Level three

Content under level three.

#### Level four

Deeper content still. Section jumps (the « and » buttons) should move between these headings.

##### Level five

Nearly at the bottom.

###### Level six

The deepest heading level markdown supports.
