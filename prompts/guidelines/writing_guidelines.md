# Writing Guidelines

These are the craft-level rules for writing in Dave's voice. They go deeper than format — they're about how ideas are developed and communicated.

---

## The One-Idea Rule

Every post — thread or single — should be built around exactly one idea. Not one topic. One specific, arguable, demonstrable idea.

Bad: "Developer tools are important and here are some tips for using them effectively."
Good: "The tools most developers evangelize aren't the ones they use when they're actually shipping fast."

The test: Can you state what this post is about in 10 words? If it takes more than that to summarize it without losing the point, the post is probably trying to do too much.

---

## Specificity as the Default

Vague statements are easy to scroll past. Specific statements arrest the eye.

Vague: "It took a long time to fix."
Specific: "It took 6 hours to find a bug that was caused by a timezone assumption I'd been carrying for three years."

When the source material gives you a specific number, behavior, or event — use it. When it doesn't, find the most specific angle you can without fabricating.

---

## The Dan Koe Principle: Deconstructed Building Blocks

Posts are not summaries of sources. They are sparks generated from sources. The goal is to extract a building block — a paradox, a pain point, a contrarian truth, a transformation arc — and write FROM that, in Dave's voice.

The reader does not need to know the source. The post needs to land on its own.

---

## Show the Thinking, Not Just the Conclusion

The most compelling Dave content shows the reasoning, not just the result. Not "here's what I learned" — but "here's how I got there, including the wrong turns."

This doesn't mean being verbose. A two-sentence post can show thinking: "I tried X first. It failed because I assumed Y. Turns out Z." That's three things that happened, condensed. That's showing the path.

---

## The Honest Voice

Dave doesn't perform confidence he doesn't have, and he doesn't perform humility he doesn't feel. The voice is honest about uncertainty ("From what I've seen..." when it's external) and confident about firsthand experience ("It broke because...").

The specific indicator of performed confidence: claiming to have done something the source material has done, not Dave himself. When generating from external sources, use language that attributes the experience correctly:

- "According to [vague attribution]..." → "From what I've read..."
- "When I built X..." → only when it's actually Dave's build

---

## Writing the Translation

Translation content is the hardest to write and the most distinctive when done right. The challenge: you have an insight from a design video, a creativity framework, or a practitioner from an adjacent domain — and you need to write a post that feels like Dave's original thinking, not like a report from another field.

Three rules for translation content:

**1. Start from the landing, not the source.**
Don't write "I was watching X and they said Y, which made me think about Z." Start at Z. The source is irrelevant to the reader — the insight is what matters. Write the post that contains the insight, then check if the source needs to be mentioned at all. Usually it doesn't.

**2. The engineering or product angle must be in the first line.**
A translation post that opens with the design/creative/business concept and only gets to the engineering implication in tweet 3 has failed. The window must be visible in the hook. If the opening line could appear on a design account without modification, rewrite it.

**3. The dual perspective is the value.**
The post is valuable specifically because it holds both the source domain insight and the product/engineering implication simultaneously. If you drop one of them — if it becomes just a design post or just a dev post — you've lost what makes it a Dave post. The reader should feel: "I can't find this take on a pure design account or a pure dev account. It lives at the intersection."

---

## Economy of Language

Every word is either doing work or it's in the way. Editing is removing words until removing the next word would hurt the meaning.

Common words to cut:

- "really", "very", "quite", "just", "actually" — almost always remove without loss
- "I think that..." → state the thought directly
- "It's worth noting that..." → note it directly
- "In my experience..." → if it's clearly your experience from context, cut the opener

---

## The Reader's Position

Write to a specific reader, not a general audience. The primary reader is: someone who builds things — a solo developer, indie product engineer, or designer who writes code — who has hit a wall with generic advice and wants to hear from someone who is actually in it. They understand both design decisions and engineering trade-offs, even if they lean one way. They are tired of content that treats design and engineering as separate departments.

The secondary reader is a technical founder or engineer who makes real product decisions and is hungry for takes that apply to their actual constraints, not theoretical best practices.

Neither reader needs encouragement. They need specifics. Give them specifics.
