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
