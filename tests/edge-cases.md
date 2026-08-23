# Edge cases

Odd content that should not break the reader or the highlighter.

## Empty and sparse sections

This paragraph is followed by a heading with no body.

## 

A heading with no text above this line (empty heading markdown produces an empty h2 here).

## Unicode and emoji

Reading should handle café, naïve, 日本語のテキスト, Ελληνικά, and emoji 🎧🚀 without stalling.

Math-ish symbols: x ≤ y, a ≠ b, π ≈ 3.14159.

## Very long unbroken token

Supercalifragilisticexpialidociousantidisestablishmentarianismpneumonoultramicroscopicsilicovolcanoconiosis

## Punctuation clusters

Wait--- what?! Really... Yes!! Absolutely. "Quoted speech," he said, 'and more.'

## Abbreviations

The U.S. EPA was created in 1970. Dr. Smith et al. reported e.g. three cases, cf. previous work, at 5 p.m. on Jan. 4th.

## Links and images

![a decorative image](data:image/gif;base64,R0lGODlhAQABAAAAACw=)

Visit [the docsify site](https://docsify.js.org) for more. Alt text of images is intentionally not read.

## HTML entities

Tom &amp; Jerry &lt;tagged&gt; 5 &gt; 3 &copy; 2026
