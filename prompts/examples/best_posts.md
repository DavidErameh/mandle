# Best Posts — Examples for Generation Reference

These are examples of high-performing post types written in Dave's voice. They represent the quality bar the generator is aiming for. 2 will be randomly selected per generation run to calibrate the output.

Do NOT copy these. They are voice and quality references only.

---

## Example 1: Single Take — Blunt Fact

```
Most "junior dev" problems aren't skill problems.

They're assumption problems.

The senior dev doesn't know more syntax. They just know which of their assumptions to distrust.
```

**Why it works:** Three lines. One arc. No padding. States something specific that the target reader immediately recognizes as true.

---

## Example 2: Mini-Thread — Contrarian

```
Tweet 1:
Clean architecture is advice for teams of 8+.

If you're building solo, you don't have a maintenance problem yet. You have a shipping problem.

Here's what actually matters when you're building alone:

Tweet 2:
1/ The code doesn't need to be pretty. It needs to be findable.

You're the only one reading it. Write it so future-you can understand it at 11pm after a week away from the project.

Tweet 3:
2/ Abstractions cost you more than they save — until you've duplicated the same logic 3+ times.

Then you abstract. Not before.

Tweet 4:
3/ The test that matters most isn't unit tests. It's: can I ship this today and find the bugs that actually break real users?

Tweet 5:
You can refactor when the project has users who'd notice the downtime.

Until then: ship the ugly version.
```

**Why it works:** Takes a real position that challenges common advice. Each tweet earns its place. Landing is practical, not preachy.

---

## Example 3: Day Series Post

```
Day 18 of cracking dev challenges to first client from X.

The content pipeline is running. Mandle pushed 4 posts today without me touching it.

The weird part: the AI version of my voice is 80% right. The 20% it gets wrong is actually useful — it shows me which parts of my voice I haven't documented clearly enough.

Next: tighten the brand_rules.md. The system is only as smart as what I put into it.
```

**Why it works:** Honest, specific, shows the meta-level thinking. The reader learns something while watching the build. Not triumphant — honest.

---

## Example 4: Single Take — Direct Opinion

```
Reverse engineering a working product teaches you more than building from a tutorial.

Tutorials explain what someone decided to build.

Breaking down a live product shows you what survived contact with real users.
```

**Why it works:** Three sentences, clear structure, specific claim. Anti-hype by implication (tutorials are the default — this challenges them).

---

## Example 5: Breakdown Thread — Technical

```
Tweet 1:
How most APIs actually handle authentication vs. how the docs describe it — thread

Tweet 2:
The docs say: "Pass your API key in the Authorization header."

What's actually happening: the server is running your key through a lookup table, checking expiry, confirming scope, and logging the request before it ever touches your endpoint.

Tweet 3:
Why this matters: that lookup adds latency. Usually under 5ms. But if you're making 200 API calls in a batch, that's a second of invisible overhead nobody talks about.

Tweet 4:
The pattern that eliminates most of it: cache the auth token result for the session duration, not per-request.

Most SDKs do this automatically. Most custom integrations don't.

Tweet 5:
Check your integration. If you're authenticating per-request and wondering why batches are slow, that's probably it.

Not the server. Your code.
```

**Why it works:** Specific mechanism (not vague), practical implication, actionable conclusion. Makes the reader feel like they learned something real.

---

## Example 6: Bold Take — Short

```
The framework wars are a distraction.

The developers winning in the market right now aren't the ones with the best opinions about React vs. Vue.

They're the ones who shipped something people use.
```

**Why it works:** Direct. No hedging. Three sentences. Credible because it's obviously true once stated.

---

## Example 7: Specific Observation

```
There's a thing that happens at month 2 of a side project.

The first version is working. The second version isn't built yet.

That gap is where 90% of side projects stop.

Not because of skill. Because month 2 is where the excitement runs out and the actual product work begins.
```

**Why it works:** Names a specific experience the reader recognizes. Gives a precise explanation for why it happens. No fake motivational ending — just the honest observation.

---

## Example 8: Single Take — Design-Engineering Flip

```
A design token isn't a design decision.

It's a contract between the designer who sets intent and the engineer who implements it.

When that contract doesn't exist, you get two teams making the same decision independently — and a UI that drifts every sprint.
```

**Why it works:** Opens with a reframe that surprises both designers and engineers. Three sentences. Each does a different job: reframe, explain, consequence. Zero padding. Holds both disciplines simultaneously — neither side can claim this fully.

---

## Example 9: Specific Observation — Window Translation

```
There's a principle in typography called optical alignment.

You don't center things where the math says center. You center them where they look centered — which is slightly above the actual midpoint.

API design works the same way.

The technically correct response shape isn't always the one the consumer can actually use. Design for perception, not just correctness.
```

**Why it works:** Opens in design without signaling it's a design post. By tweet 4, it's a product engineering post. The reader who doesn't know typography still follows the logic. The reader who does get the typography reference feels the depth of the translation. No source needed, no setup required.

---

## Example 10: Mini-Thread — Practitioner Translation

```
Tweet 1:
The best film editors describe the goal as "the cut you don't notice."

That's the same goal as the best developer tooling.

Tweet 2:
You only notice a bad cut because something felt wrong and you couldn't ignore it.
You only notice bad tooling because it interrupted the actual work.

Tweet 3:
The difference between a tool that gets adopted and one that gets abandoned isn't features. It's whether it gets out of the way fast enough.

Tweet 4:
"Invisible when working" is a higher bar than "powerful." Most tools optimize for the second one.
```

**Why it works:** Source is film editing. It is never mentioned after tweet 1. By tweet 2, the reader is thinking about their dev tools. Tweet 3 is the engineering implication. Tweet 4 lands the counterintuitive position. Sounds like Dave noticed this from building, not from watching a filmmaking video.
