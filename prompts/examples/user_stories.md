# User Stories — Examples for Generation Reference

These are fictional-but-realistic scenarios that the generator can use as structural inspiration. They represent the kinds of real experiences Dave and his audience have. When generating content, 2–3 of these will be randomly selected and included to give the model a feel for the voice and narrative level.

Do NOT copy these verbatim. They are patterns, not templates.

---

## Story 1: The Wrong Bottleneck

Dave spent 4 hours profiling the database, convinced that was where the API was slowing down. Ran query optimizations, added indices, rebuilt the caching layer. Performance improved by 12%. Then noticed the actual bottleneck: a synchronous file read happening on every request, introduced three weeks ago by a quick "temporary" fix that never got removed. Removed it in 2 minutes. Performance improved by 340%.

**Core lesson:** The bottleneck is almost never where you first look. Profiling instinct is usually wrong because it's shaped by where you've fixed things before.

---

## Story 2: The Documentation Lie

Integrating a payments API. The docs said the webhook payload included a `customer_id` field. Built the whole handler around that assumption. Went live. Webhooks came through without `customer_id` — turns out the field was only included in specific event types, buried in a footnote on page 7 of the documentation. The docs weren't wrong, exactly. They just assumed knowledge that wasn't there.

**Core lesson:** API documentation is written by people who already understand the system. It almost never explains the assumptions it's built on.

---

## Story 3: The Overengineered First Version

Built the first version of a side project with a full microservices architecture because that's what the tutorials for "scalable systems" taught. Spent six weeks on infrastructure. Never got to the product. Scrapped it. Rebuilt as a monolith in two weeks. Shipped. Got first 50 users. Now considering splitting it — when there's an actual reason to.

**Core lesson:** Architecture decisions for scale make sense at scale. Before scale, they're just debt with a technical-sounding name.

---

## Story 4: The Client Who Changed Everything

A client brief came in: "Build us a simple dashboard." Built a beautiful, feature-rich dashboard with filtering, exports, date ranges, custom views. Client demo went well. Three months later, client was using exactly one feature: the number on the homepage. Everything else was ignored. The one useful feature took two days to build. The rest took eight weeks.

**Core lesson:** What clients say they want and what they actually use are almost never the same thing. The gap costs dev time.

---

## Story 5: The Starlink Setup Reality

Setting up the first SkyNetGo access point. The Starlink dish connected fine. The MikroTik routing config took three attempts before the bandwidth shaping worked correctly. First student session dropped every 12 minutes because of a misconfigured session timeout that wasn't in any documentation — found by reading a forum post from 2021. The post was one sentence. Saved two days of debugging.

**Core lesson:** The most useful technical knowledge often lives in obscure forum posts, not official documentation. Knowing where to look matters as much as knowing what to look for.

---

## Story 6: The Rewrite That Wasn't Worth It

Rewrote a utility function because the original code was "ugly." New version was cleaner, used better abstractions, passed more edge cases. Took three days. Ran side by side with the original in production for two weeks. Performance was identical. Zero bugs in the original were fixed. The rewrite solved a problem that existed only in the code review, not in the product.

**Core lesson:** Rewrites that aren't fixing bugs or enabling new features are usually about the dev's discomfort with their past self, not about the product.

---

## Story 7: The Reverse Engineering Win

Wanted to understand how a popular SaaS tool's autosave feature worked — specifically how it handled conflicts when two edits happened within the same second. Couldn't find it in their docs. Opened the network tab, triggered the edge case manually, watched what the client sent. Three requests: flag the edit, send the delta, acknowledge the merge. Built the same pattern into a project in one afternoon. Would have taken days to design from scratch.

**Core lesson:** You can learn more from watching what a working product actually does than from reading a hundred architecture blogs about how it should be done.

---

## Story 8: The Design Decision That Broke the Build Cadence

The engineering team was shipping a new feature every two weeks. Then a design system was introduced. Suddenly, every feature needed a design review because the components didn't map 1:1 to the new system. What had been a 2-day implementation became a 4-day implementation because developers were making design decisions the design system was supposed to have made for them. The problem: the design tokens defined colors and spacing, but not the decision rules for when to use which component in which context. The components existed. The contracts between them didn't.

**Core lesson:** A design system without decision rules pushes design decisions into implementation. Engineers make them anyway — just inconsistently, at the worst possible time (during a build), and without the context the designer had.

---

## Story 9: The Grid That Fixed the API

Dave was designing a dashboard with a lot of data-dense tables. A designer showed him a layout grid: 12 columns, each component snapping to multiples of that base unit. It looked like a visual constraint. It turned out to be a data model constraint. Because the UI now had a fixed column system, the API response structure became obvious — each column mapped to a data field, each breakpoint mapped to a data subset. The frontend component's visual grid became the contract for what the backend needed to return and in what shape. The design decision had answered an API design question Dave had been avoiding for two weeks.

**Core lesson:** The grid isn't a design tool. In a data-driven product, it's an API contract in visual form. Decisions made in Figma have consequences in the response payload. The designer and the backend engineer are making the same decision from different starting points — which means someone is going to have to reconcile them. Better if it happens before the sprint.
