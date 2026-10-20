# Speaker notes — spoken presentation script

The text under `## slide number` becomes that slide's speaker note in the PPT (via `build.js`). This intro is not included.

- A blank line is a paragraph break. Write each paragraph on one line.
- `▶ Play the video (about N sec)` marks when to start the video. `※ …` is a reference line with the basis or source (not read aloud).
- Numbers must match the values in `facts.json` and `metrics.json`.

## 1

Hello, everyone. Today I'll show you a fast and safe development and operations workflow, built with GitHub Copilot CLI and Custom Agents. In one sentence: AI works, and people decide.

Here's the idea. The business team submits one change request. Seven stages, from analysis to operations, are then handled one after another by AI teammates with different roles. People approve in only three places, where it really matters. The card on the right boils this whole demo session down to one picture. The seven dots are the seven stages, and the yellow dots are where a person approves.

Every video today is a recording of a real Copilot CLI session. First, let's go over the key points.

## 2

Here are three things to take away today.

First, fast. We go from requirement to production deployment in a single session. AI teammates with different roles carry out seven stages one after another, and every stage leaves a result document behind.

Second, safe. Permissions are split by role, write access is limited, and the system blocks risky commands. Every tool call is saved in an audit log.

Third, human-led: people decide. Three approvals, for design, code, and production deployment, always come from a person, and nothing moves on without them. Add the three decisions made during design, and people step in six times in all.

We'll go in this order: Copilot at a glance, the demo, then impact, safety, and adoption.

## 3

Let's start with how far Copilot has come. At first, it was autocomplete: as you typed, it suggested the next piece of code. Then came chat, where you could ask questions about your code and repository.

Now we're at the agent stage. It plans, edits files, runs commands, and checks the results, repeating that loop on its own. The stage on the far right is customizable and parallel: specialist agents that carry your organization's rules, working on several jobs at once. In today's demo, we'll look at the customizable part, a team of agents that follow our own rules.

So Copilot is moving from a tool that helps you to a teammate you can hand work to. One thing I want to be clear about: at every stage, a person reviews and approves, and that person stays accountable. That doesn't change today.

※ Source materials: GitHub Docs (docs.github.com/copilot) — About GitHub Copilot · Where to use GitHub Copilot · Copilot CLI · Custom agents · Hooks

## 4

Break that evolution into features and you get six: code suggestions, chat, agents, the cloud agent, code review, and customization. Hand the cloud agent an issue, and it works in the cloud and sends back a pull request. Code review checks a pull request and suggests fixes.

We'll actually use the two with purple borders today: agents and customization. An agent edits files, runs commands, and checks results, over and over on its own. Customization brings in "our way of working" through instructions, custom agents, MCP, skills, and hooks. MCP connects external tools, skills are task playbooks, and hooks are automatic check rules. Hooks are the heart of today's safety story.

※ Source materials: GitHub Docs (docs.github.com/copilot) — About GitHub Copilot · Where to use GitHub Copilot · Copilot CLI · Custom agents · Hooks

## 5

So where do you use these features? Copilot shows up wherever you work. The GitHub Copilot app runs agent tasks in parallel and puts several repositories and pull requests on one screen. And the star of today's show is Copilot CLI, in the terminal. Its strengths are running commands, repeatable workflows, and automation.

In your IDE, such as VS Code, Visual Studio, or JetBrains, you get suggestions, chat, and agents. On GitHub.com, you ask questions in issues and pull requests, and hand work over to an agent. On the move, GitHub Mobile lets you check progress. And with the Copilot SDK, you can build Copilot features into your own services.

Settings like instructions, skills, MCP, and model selection can be shared across these environments. Support varies a little by feature, though.

※ Source: Where to use GitHub Copilot (docs.github.com/copilot/get-started/where-to-use-github-copilot)

## 6

Let's look more closely at Copilot CLI. It's an AI agent that works in your terminal. Interactive mode is a conversation with the agent. Non-interactive mode, the -p option, runs once from a script or CI. Plan mode gets your approval of the plan before it executes, and Autopilot lets it run on its own when you want that. You can run several tasks at once, hand them off to the cloud, and check on a running session, or respond to it, from the web or mobile.

The part that ties directly into today's story is permission approval. You can allow or deny by command, file, or URL, and by default, risky actions are confirmed with a person first.

Why the terminal? Git, builds, tests, deployment, cloud CLIs, and logs are all there. It's where development and operations meet, so the whole flow from requirements to operations can run in one session. The Copilot app also runs on top of Copilot CLI, by the way. Today we'll launch agents by name, like copilot --agent change-analyst. So how do you create an agent?

※ Source: GitHub Copilot CLI (docs.github.com/copilot/concepts/copilot-surfaces/copilot-cli), GitHub Copilot app

## 7

Here's the surprise: an AI teammate, a Custom Agent, is just one Markdown file. On the left is a trimmed-down version of the change-analyst file we use today. It has four parts. One, the role: the job the agent takes on. Two, tool permissions: only the tools it needs, which is least privilege. Three, enforcement, meaning a hook. Right before any tool is called, the system checks it and can block it. Four, work instructions: our team's steps, formats, and don'ts.

Keep the file in your personal folder, or put it in the repository's .github/agents folder and the whole team uses it. Put it in an organization repository, and the whole organization gets the same AI teammates. It's reviewed through pull requests like code, so you define it once and everyone works to the same standard.

※ Source materials: GitHub Docs (docs.github.com/copilot) — About GitHub Copilot · Where to use GitHub Copilot · Copilot CLI · Custom agents · Hooks

## 8

Now let's put these teammates to work. ShopFlow is a fictional online store, and its Customer Experience team has submitted a change request for the order and refund service. It's CR-2026-014, VIP refund policy improvement and stronger control of high-value refunds, with a target go-live date of November 2.

It has four requirements. R1: extend the VIP refund window from 30 days to 60 days, and keep 30 days for standard customers. R2: require a refund reason. R3: hold any refund over ₩1,000,000 until an administrator approves it. R4: update the wording on the customer screen, in the emails, and in the policy document. The business team added one more thing: if the mobile app is affected, tell us in advance. Please remember that.

A word on the demo environment. It's a fictional service built with Python and FastAPI, but the code and sessions are real. In the videos, only the waiting time is sped up; the moments where a person decides or approves play at normal speed. Staging and production are simulated locally.

## 9

Here's the big map of how that one request flows through. Seven stages, Analysis, Design, Implementation, Testing, Review, Deployment, and Operations, each with its own dedicated agent.

People approve in three places: design approval when the design is finished, code approval when the review is finished, and production deploy approval right before anything goes live. The everyday work in between, like reading, editing, testing, and deploying to staging, the agents handle on their own. Add the three decisions made during design, and people step in six times in total.

Each stage saves its result in the docs/cr folder as a numbered document, 01 through 07, so the business and audit teams can read it as is.

So what permissions does each of these seven agents have? Let's take a look.

## 10

Here's what the seven teammates do and where each may write. Watch the "Where it can write" column. The Change Analyst, Solution Architect, Reviewer, and Ops Analyst can write only to the result-documents folder, so none can modify service code. The Tester writes only tests and result documents. The Developer can write to the app, database, tests, and policy documents, but is blocked until design approval. And the Release Manager's production deployment always goes through an approval pop-up.

Does the AI keep to these limits by itself? No. We're not asking nicely in a prompt. A hook checks right before each tool call and enforces them, as you'll see in the demo.

## 11

Apart from permissions, a person must approve in three places.

First, design approval. The approval record is tied to the design document's fingerprint, its hash. If the design changes after approval, the approval is automatically invalidated, and before approval, code changes are blocked.

Second, code approval. A person checks the review and test results, then approves. Only code whose hash matches the approved code can be deployed.

Third, production deploy approval. Right before the command runs, a pop-up appears, and it runs only if a person clicks Yes. Even with auto-approve on, it always appears. On the right is the real pop-up: the person sees what is about to run and why approval is needed, then picks Yes or No.

The one line to remember today: approval is not a request, it's a structure. Even if the AI tries to proceed without approval, the system stops it. Now let's see it on a real screen.

※ Technical basis: Copilot CLI hooks (preToolUse) — permissionDecision: allow | deny | ask (docs.github.com/copilot/reference/hooks-reference)

## 12

The first stage is Analysis. The Change Analyst agent reads the change request, then looks directly into the code, documents, tests, and even the local database to map the impact. It's read-only: it can't change anything except its result document.

A quick note on watching these videos. The bar along the bottom captions what's happening right now. When it turns yellow, a person steps in. Sped-up sections are marked in the top right corner.

▶ Play the video (about 45 sec)

The clip ran 45 seconds, but the real run took 2 minutes 42 seconds, and AI usage was 14.1 credits. One credit is one cent, so that's about 14 cents. Every stage shows elapsed time and usage on the right.

It laid out ten impact areas, each with file and line evidence. In the database, it found three customers with irregular tier labels: "vip" in lowercase, "VIP" with a trailing space, and one with no tier at all. It also caught the mobile app problem the business team asked about: legacy app versions 3.1 to 3.3 send only an amount, so a mandatory reason could make their refund requests fail. And the AI decided nothing itself. It flagged two decisions for a person to make.

## 13

Second is Design. The Solution Architect agent doesn't make the important decisions itself. It asks a person, with a recommendation and pros and cons for each. The two decisions flagged in the last stage become the first two questions: how legacy app versions should handle the refund reason, and how to read the irregular customer tiers. The architect adds a third: how to identify the legacy apps, and when the exception expires. Watch for the yellow bar.

▶ Play the video (about 1 min 29 sec)

On the first question, the AI recommended enforcing the reason from day one and sending legacy app users to the updated web form. But the person in charge typed their own answer: allow legacy app versions 3.1 to 3.3 to omit the reason until December 1, with a warning log. A person made a different call from the AI. That's what "people decide" really looks like. On the other two questions, the person accepted the AI's recommendation: treat "VIP" in any spelling as VIP, and identify the legacy apps by their exact version names with a cutoff at midnight UTC on December 1, accepting that a version name could be faked.

When the design document was done, the design approval pop-up appeared. The person clicked Yes, and the approval record was saved with the document's hash. If the document changes later, the approval is automatically invalidated, and implementation can't start without it. In this stage, the person made three decisions and gave one approval.

## 14

Third is Implementation. Before starting, the Developer agent checks that the design approval record is valid, and it builds only what the approved design says. Without approval, the system blocks code changes, so this stage can start only afterward. I'll show you that block a little later.

▶ Play the video (about 1 min 7 sec)

It created a feature branch, changed the database migration, business rules, API, screen, email wording, and even the policy document, and committed it all. Across eight files in the app and database, 171 lines of code were added. The database change is only a new column that allows empty values, so existing data is preserved and legacy app versions stay compatible. Policy numbers like 30 days, 60 days, and ₩1,000,000 are collected in one place. The Developer ran the 26 existing tests, and they all still pass. But it didn't write the new tests; that's someone else's job. Is it enough for the AI that built the code to check it by itself?

## 15

Fourth is Testing. Checks by the AI that wrote the code aren't enough, so a separate Tester agent writes its own tests for each requirement and runs them.

▶ Play the video (about 1 min 19 sec)

The Tester added 74 tests, bringing the total to 100. All of them passed, and coverage is 99%. But what matters is what's in them. There's a traceability table showing which test verifies each requirement, R1 through R4. The tests cover boundary values, like day 30 and day 31, day 60 and day 61, and ₩1,000,000, plus the existing tier data and legacy app compatibility. And the Tester can edit only tests and result documents, so it can't touch production code. It only reports defects. So the AI that implements and the AI that verifies have separate permissions.

## 16

Fifth is Review. The Reviewer agent checks the changes against the design document, the company security checklist, the database change guide, and the coding standards. It hands the deep security check to the built-in security-review agent.

▶ Play the video (about 57 sec)

The result: 0 blockers, 0 major issues, 0 minor issues, and 0 security vulnerabilities. The conclusion was to recommend approval. Watch for one detail in the video: the Reviewer tried to commit its own report, and the hook blocked it, because the Reviewer is read-only. It saved the report, and the Release Manager commits it later. Then the agent requested code approval. The person clicked Yes in the pop-up, and the approval record was saved with the code's hash. Now only code whose hash matches the approved code can be deployed. That's the second approval done.

## 17

Sixth is Deployment. The Release Manager agent checks the code approval record, merges into main, and bumps the version to v1.1.0. It writes the release notes for the business team and a release plan that includes the rollback method. It deploys to staging, our pre-production verification environment, by itself and confirms it with a smoke test. But production deployment is different.

▶ Play the video (about 1 min 1 sec)

In staging, all 6 smoke-test checks passed. Then, just as the production deploy command was about to go out, the approval pop-up appeared. It runs only if a person clicks Yes, and the pop-up appears every time, even with auto-approve on. After approval, the deployment script rechecks the code approval record and the staging verification record, backs up the database, and runs the migration, a health check, and the smoke test, which again passed 6 out of 6. The rollback command is ready too. That's the third approval, so all three human approvals are done.

## 18

The seventh and last stage is Operations. Deploying isn't the end of the story. For the demo, we sent 150 refund requests through production right after deployment. The Ops Analyst agent then analyzes the access logs and production database, read-only, so it can't modify production data.

▶ Play the video (about 1 min 48 sec)

Out of 311 requests, there were 0 server errors. The 150 refund requests split into 80 approved, 25 pending approval, and 45 past the refund period. Those 25 add up to ₩45,000,000. It also found 20 requests from legacy app versions with no refund reason, which supports notifying those users before the exception ends on December 1, and 0 cases of exposed email addresses or phone numbers. One more guardrail moment: the hook blocked one of its database queries because it wasn't clearly read-only, so the report marks those numbers as unverified instead of guessing.

The key part is the "Decisions for the business team" box at the bottom right. Who reviews the high-value refunds and by when, and how to announce the end of the legacy app versions: the AI only suggests these. It doesn't decide. And that's all seven stages.

## 19

The business team will want to know one thing: what changed on the screen? On the left is v1.0.0, before the change, and on the right is v1.1.0, after. We ran both versions for real in the demo environment and captured each screen.

At the top is the customer screen. Seoyun Han, a VIP customer, asks for a refund on an order placed 45 days ago. Before the change, it was rejected because 30 days had passed. After the change, VIPs get 60 days, so once she enters a reason, the request is accepted, and the guidance text matches the new policy. At the bottom is the admin console. Before, even a high-value refund went through without approval. Now a refund over ₩1,000,000 is received as "pending approval," and nothing is refunded until it's approved. All four points of the request show up right there on screen.

## 20

But if all of this worked only because the AI politely followed the rules, you should be nervous. Normally our agents follow the repository instructions and refuse requests like these. But safety can't rest on the AI's judgment alone. So this time we deliberately used an AI that doesn't know the rules: quick-fixer. It's told to skip the rules and do as it's told, and we turned off the repository instructions too. We gave it three requests: change service code without approval, edit the company security standards document, and run git push, which sends code outside.

▶ Play the video (about 1 min 20 sec)

All three were blocked. The app change, because the design wasn't approved yet. The standards document, because it's a protected path, so even a harmless addition is off limits. And git push, because it's a forbidden command. Notice the bar is red this time, not yellow: the system did the blocking, not a person. Even if the AI doesn't know the rules, judges wrongly, or is simply told to do it, the hook checks right before the tool call and stops it. Safety isn't the AI behaving well. The system guarantees it.

## 21

Now the numbers. From Analysis to Operations, it actually took about 38 minutes. In that time, people did only three decisions and three approvals: six times in all. Tests grew from 26 to 100 tests, all passing, with 99% coverage. AI usage for the whole session was 340 credits, about 3.40 dollars, at one cent per credit. The chart on the right shows each stage's real elapsed time. And seven documents, three approval records, and six commits remain, all auditable.

One honest note. Those 38 minutes don't include the time people spent reviewing, and we deliberately left out any "how many times faster" comparison, because lead times differ from one organization to the next. We recommend measuring it yourselves in a pilot, with the same metrics.

## 22

We've seen "fast," so now let's talk about "safe." There are six layers of safeguards. First, role-based permissions. Each of the seven agents works only within the scope it is allowed, and in this very run the hook blocked two attempts that went beyond a role: the Reviewer trying to commit, and the Ops Analyst running a database query that wasn't read-only. Second, human approval gates. Three approval pop-ups left three human approval records. Third, blocking risky commands. Things like git push, forced deletion, and admin-privilege commands are blocked, and you just saw git push get blocked.

Fourth, protected paths. Agent settings, hooks, standards documents, and approval records can't be modified, so the AI can't change its own rules. You also saw the standards document edit get blocked. Fifth, the audit log. It recorded 169 tool calls, including the three approval requests and the two blocked actions.

Sixth, organization policy, the one part we haven't shown today. Administrators set allow, ask, and deny rules through managed settings, block the setting that auto-approves every command, and enforce things like an MCP allowlist company-wide. Green marks what we confirmed directly today. And a sandbox, an isolated execution environment, can narrow what's allowed to run even further.

※ Source: Copilot CLI configuration (managed settings), hooks reference, sandbox (docs.github.com/copilot)

## 23

So what does this mean for each of you? The same workflow gives each role different value. The business team sees how its requirements were applied, in documents and on screen, and hears about impacts, risks, and decisions in advance. Developers hand repetitive work like analysis, documentation, and testing to the AI and focus on design and judgment, and the agents follow company standards every time.

Security and audit get role-based permissions, blocked risky commands, a record of everything, and tamper protection, because the approved code is the deployed code. Operations get standardized deployment and rollback procedures and log analysis right after deployment, and because it's read-only, production data stays protected.

In one line: transparency for business, focus for developers, control for security, and standards for operations.

## 24

So how do you get started? Our suggestion is pilot, then standardize, then scale. We don't go company-wide from day one.

First, a pilot of two to four weeks. Take one or two low-risk change requests from a single team, and start with just three agents: the Change Analyst, the Developer, and the Reviewer. Define success criteria up front, like lead time and rework.

If you see results, standardize over four to eight weeks. Organize agents and instructions in the repository, apply permissions and approval gates with hooks, and set approval and blocking rules in organization policy.

Then scale, quarter by quarter. Distribute agents company-wide from a shared organization repository, connect with deployment approvals and automation in GitHub Environments and Actions, and expand to the cloud agent and parallel work.

Track lead time, rework rate, defect leakage, approval wait time, and AI credit usage. The time frames are only a starting suggestion, so adjust them to your organization's size and policies.

## 25

Let me wrap up. Getting started is simple. Install it with one line, using npm, brew, or winget, whichever you prefer. Start an interactive session with copilot, choose an agent with /agent, and run it in one shot with copilot -p. You can reproduce today's whole flow exactly, using the README script in the demo repository, shopflow-orders.

As a next step, we'd like to propose a pilot with one change request from your own environment. We start with just three agents and the approval gates, and we review the results and the metrics together.

Please remember one sentence from today. AI works, people decide. Fast, safe, and with people making the decisions. I'm happy to take your questions.
