# Prompt Changelog

All changes to any file in the `prompts/` folder must be logged here before merging to main.

---

## Format

```
## [YYYY-MM-DD] — File changed
**Change:** What was changed and why
**Impact:** Which pipeline stages are affected
**Author:** Who made the change
```

---

## 2026-04-06 — Full Prompt System Alignment (Part 2)

**Files changed:** brand_voice.md, generator_system.md, reviewer_system.md, reply_system.md, hook_templates.md, hook_examples.md, format_templates.md, writing_guidelines.md, best_posts.md, bad_examples.md, user_stories.md

**What changed and why:**

Following the niche_context.md and extractor_system.md rewrite, all remaining prompt files were audited and updated to align with Dave's window: Product Engineering · Design Engineering · Development.

Key changes across the system:

- brand_voice.md: Identity statement expanded to include design-engineering dimension
- generator_system.md: Role updated. Added translation_path usage guide. Added type-specific generation guidance for `intersection` and `translation` types. Added source_lens register guidance.
- reviewer_system.md: Voice Match criterion expanded to include intersection/translation content definitions. New Criterion 5 (Window Fit, 0–2 pts) added. Approval threshold updated to 8/12.
- reply_system.md: Role updated. Source account awareness section added.
- hook_templates.md: Hook Type 9 (Design-Engineering Flip) and Hook Type 10 (Window Translation) added.
- hook_examples.md: New examples for both new hook types added in Dave's voice.
- format_templates.md: Format Selection Guide updated with intersection and translation type rows.
- writing_guidelines.md: Reader's Position expanded to include designer-engineer audience. "Writing the Translation" craft section added.
- best_posts.md: Three new examples added (design-engineering flip, window translation, practitioner translation).
- bad_examples.md: Anti-Pattern 11 (Naked Design Post) added.
- user_stories.md: Two new stories added (design system → API decision, grid → API contract).

Files confirmed correct and not changed: brand_rules.md, offer_context.md, format_guidelines.md, structuring_guide.md, cta_patterns.md.

---

## 2026-04-06 — Niche Context + Extractor System Rewrite

**Files changed:**

- `prompts/brand/niche_context.md` — Full rewrite
- `prompts/system/extractor_system.md` — Full rewrite

**What changed and why:**

niche_context.md was rewritten from a narrow "Dev Cracking / Reverse Engineering"
framing to a broader, more accurate window: Product Engineering · Design Engineering ·
Development. The new version defines the window as a translation layer — not just a
topic filter — and introduces the four source lenses (Trending Tech, Design + Creative
Craft, Raw Practitioner, Unfiltered Opinion) to give the extractor source-type awareness.
Audience definition was made more specific. SkyNetGo extraction trigger was formalized.
Relevance scoring modifiers were rewritten to reflect the window logic.

extractor_system.md was rewritten to match. The extractor now has explicit source lens
awareness, a new mandatory `translation_path` field in its output schema, and a new
`intersection` extraction type for design-engineering content. The `source_lens` field
was added to the output schema. The extraction type taxonomy was expanded from 5 to 7
types. The translation opportunity concept was added as the highest-value extraction
category. SkyNetGo trigger logic was formalized.

**Reason for change:**
Source strategy was finalized: Fireship (trending tech), Tommy Geoco / @designertom
(design + creative craft), Nick Saraev / @nicksaraevunfiltered (raw practitioner),
@riskambition (unfiltered opinion). The old extractor had no awareness of source type
and no translation layer concept. These rewrites make the extraction engine match the
actual sourcing strategy and the actual brand window.

---

## [2026-04-06] — Initial version (v1.0)

**Change:** All prompt files created from scratch. Brand voice, rules, niche context, offer context, all system prompts, hook templates, format templates, guidelines, examples, and registry initialized.
**Impact:** All pipeline stages (extraction, generation, review, reply)
**Author:** Dave (@daviderameh\_)

---

<!-- Add new entries above this line -->
