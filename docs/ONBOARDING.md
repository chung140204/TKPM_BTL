🚀 BASAO PROJECT – DEVELOPER ONBOARDING GUIDE

Welcome to the Basao AI Dev Team.

Before coding, please read this document carefully.
The project uses an AI + Git Follow + Agentic IDE workflow.
Architecture and process are more important than coding speed.

⸻

1️⃣ PROJECT PHILOSOPHY

🔥 1.1 Architecture is King
	•	Do not break the core structure.
	•	Do not change naming arbitrarily.
	•	Do not duplicate logic.
	•	Do not perform major refactors without prior discussion.

⸻

🔁 1.2 Git Follow

Git Follow means:
	•	Follow the parent branch.
	•	Follow the parent architecture.
	•	Follow the parent patterns.
	•	Follow the parent workflow.

No one should push impulsively.

⸻

2️⃣ BRANCH STRUCTURE

main        → production stable
develop     → integration branch
feature/*   → specific features
subfeature/* → small branches within a feature
hotfix/*    → production bug fixes
experiment/* → AI testing


⸻

3️⃣ STANDARD WORKFLOW

🔹 Step 1 – Clone the project

```bash
git clone <repo-url>
cd <project>
```

⸻

🔹 Step 2 – Create a new branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<feature-name>
```

⸻

🔹 Step 3 – Code according to architecture

⚠ Before generating code using AI, you MUST add this to the prompt:

> Follow existing architecture.
> Do not change core structure.
> Reuse services.
> Avoid duplication.
> Keep backward compatibility.

⸻

🔹 Step 4 – Small and frequent commits

```bash
git add .
git commit -m "feat: add budget schema"
```

❌ Do not use commits like:

* update
* fix
* 123

⸻

🔹 Step 5 – Rebase before pushing

```bash
git fetch origin
git rebase origin/develop
```

Then push:

```bash
git push origin feature/<feature-name>
```

⸻

🔹 Step 6 – Create a Pull Request

A PR must include:
	•	Feature description.
	•	Screenshot (if there is UI).
	•	Impact analysis.
	•	Risk notes.

⸻

4️⃣ HOTFIX PROCESS

If production has an error:

```bash
git checkout main
git checkout -b hotfix/<error-name>
```

After fixing:
	•	Merge into main.
	•	Merge back into develop.

Do not edit develop directly.

⸻

5️⃣ CHANGE MANAGEMENT

Principle:

Large changes must be broken down.

Example:

Instead of editing 20 files at once:
	•	Branch 1: add model.
	•	Branch 2: add service.
	•	Branch 3: add API.
	•	Branch 4: add UI.

Merge step by step.

⸻

6️⃣ MANAGING AI IN THE PROJECT

AI is an assistant, not the lead architect.

When AI generates code:
	•	Review the logic.
	•	Check for duplicates.
	•	Check naming conventions.
	•	Check dependencies.
	•	Test locally before committing.

⸻

If a conflict occurs

Do not fix based on intuition.

Copy the conflict into the AI:

> Resolve this conflict following current architecture.
> Do not duplicate logic.
> Explain what you changed.

Test again after fixing.

⸻

7️⃣ CODING RULES
	•	Separate services clearly.
	•	Do not hardcode environment variables.
	•	Avoid circular imports.
	•	Do not modify global files unless necessary.

⸻

8️⃣ COMMON MISTAKES

❌ Pulling only after coding is finished.
❌ Not rebasing before pushing.
❌ AI renaming core files.
❌ Not testing locally.
❌ Commits are too large.

⸻

9️⃣ CONTINUOUS DEVELOPMENT FLOW

Standard cycle:
	1.	Pull develop.
	2.	Create feature branch.
	3.	Code + AI support.
	4.	Small commits.
	5.	Rebase develop.
	6.	PR.
	7.	Merge.
	8.	Version tagging (if needed).

⸻

🔟 DEVELOPER COMMITMENT

When participating in the project, you commit to:
	•	Respecting the architecture.
	•	Complying with the Git workflow.
	•	Not breaking the core.
	•	Not merging arbitrarily.
	•	Reviewing code before pushing.

⸻

🧠 CONCLUSION

Basao is not just about code.
Basao is:
	•	Git discipline.
	•	Clear architecture.
	•	Controlled AI assistance.
	•	Developers coordinating like a single system.

If you are unsure about anything → ask before editing.
