# PARSE — Project Context

## 1. Product Vision

PARSE is a personal operating system for people whose lives are complex, ambitious, and mentally noisy.

Its purpose is not to maximize productivity metrics. Its purpose is to reduce cognitive load and convert large ambitions, responsibilities, ideas, and worries into a small number of concrete actions that can be executed now.

Core philosophy:

> Dream at the scale of a lifetime.  
> Plan at the scale of a season.  
> Execute at the scale of today.  
> Focus at the scale of now.

The app should absorb complexity and return clarity.

The central question PARSE should answer is:

> What should I be doing right now?

A secondary question is:

> What do I need to know so I can stop thinking about everything else?

---

## 2. Product Principles

1. **Parse everything down**
   - Large goals should be decomposed until the next physical action is obvious.
   - “Finish nursery” is not a task.
   - “Measure the final section of the south wall” is a task.

2. **Hide irrelevant complexity**
   - The system may contain many projects, notes, commitments, ideas, and future plans.
   - The user should see only what matters now.

3. **Limit concurrency**
   - Too many simultaneous goals destroy execution.
   - PARSE should explicitly distinguish Active work from Parked/Someday work.

4. **Capture first, organize later**
   - The user should be able to dump thoughts immediately by text or voice.
   - AI and background logic should categorize, connect, and route captured information later.
   - The user should not have to become a librarian.

5. **No productivity theater**
   - Avoid giant dashboards, excessive metrics, complicated tagging, unnecessary gamification, and infinite lists.
   - The product exists to drive action, not produce the appearance of organization.

6. **Presence matters**
   - PARSE should help the user stop mentally living in the future.
   - Once today's priorities are selected, the rest of the system should largely get out of the way.

7. **Completion beats planning**
   - PARSE should favor small finished outcomes over elaborate planning systems.

---

## 3. Primary User Context

The initial product is being designed around a highly ambitious user with multiple competing life domains:

### Employment
- Works Monday through Thursday.
- Workday: approximately 6:00 AM–4:30 PM.
- Commute: approximately one hour each way.
- Weekday discretionary time is therefore limited.

### Family
- Married.
- First child arriving soon.
- Needs to maintain household cleanliness and execute home projects.
- Needs awareness of birthdays, anniversaries, holidays, trips, fairs, festivals, appointments, and other family commitments.

### Faith
- Wants to attend church consistently.
- Wants to pray daily.
- Wants to practice surrendering worries instead of constantly carrying them mentally.
- Wants to cultivate virtue.
- Wants to become more present.

### Health and Fitness
- Recently completed a first Half Ironman.
- Intends to continue endurance training.
- Has access to:
  - swimming
  - cycling classes
  - yoga
  - weights
  - tennis
  - pickleball
  - basketball
  - pool
  - desk treadmill

### Education
- Completing a Master’s degree in Artificial Intelligence.
- Wants to continue learning through books, textbooks, courses, certifications, and professional development.

### Work Outside Primary Job
- AI accounting startup.
- AI 911 software startup.
- Numerous personal software and engineering projects.
- Frequent new product and business ideas.
- Major recurring problem: too many projects started and too few finished.

### Knowledge / Inspiration
The user currently keeps many lists and notes involving:
- travel destinations
- gift ideas
- child names
- business ideas
- project ideas
- funny quotes
- genealogy
- art
- music
- design
- architecture
- wisdom
- things to build
- interesting stories
- surprising facts
- cars
- humor
- book ideas
- play ideas
- movie/script ideas
- music-writing ideas

Traditional knowledge-management systems such as Obsidian/Zettelkasten are appealing but create too much manual maintenance.

PARSE should provide similar retrieval value with dramatically less friction.

---

## 4. Initial App Structure

V1 should remain intentionally small.

Primary navigation should contain only five major destinations:

1. **Today**
2. **Inbox**
3. **Projects**
4. **Life**
5. **Ask**

Avoid adding more top-level navigation unless there is a compelling product reason.

---

## 5. Today

Today is the default and most important screen.

It should answer:

> What should I do today?

And ideally:

> What should I do now?

Suggested structure:

### Now
One clearly emphasized current action.

### Today
Tasks grouped into:
- Must
- Should
- Could

Constraint:
- Maximum of approximately 3 “Must” items per day.

### Schedule
A lightweight timeline showing commitments and available windows.

### Training
Today's workout only.

### Reflection / Faith
Small prompts where appropriate.

The Today screen must never become a giant backlog view.

---

## 6. PARSE Function

PARSE is the signature product capability.

The user can enter a vague or oversized item such as:

- Finish nursery
- Get healthier
- Launch portfolio
- Finish degree
- Start business

The system should recursively break it into increasingly concrete steps.

Example:

Finish nursery  
→ Finish wall treatment  
→ Finish south wall  
→ Install remaining wainscoting  
→ Measure final section  
→ Cut three boards  
→ Install boards  
→ Fill nail holes

The result surfaced to the user should be the smallest sensible next action.

A project should always attempt to maintain an explicit **Next Action**.

---

## 7. Inbox / Capture

Capture must be extremely fast.

The user should be able to:
- type a thought
- dictate a thought
- potentially share content into the app later

Examples:
- “Cool architecture idea: courtyard house with an orange tree.”
- “Buy Dad that watch.”
- “Business idea involving AI inspections.”
- “Quote from Mike: …”
- “Look up this book.”
- “Remember this baby name.”

The user should not be required to categorize the item during capture.

Potential AI classification can later identify:
- Task
- Project
- Idea
- Person
- Quote
- Travel
- Gift
- Genealogy
- Book
- Movie
- Music
- Architecture
- Design
- Business
- Software
- Writing
- Someday
- Reference

---

## 8. Projects

Every meaningful project should contain, at minimum:

- Title
- Desired outcome / definition of done
- Status
- Next action
- Optional due date
- Optional domain
- Optional notes / references

Suggested statuses:
- Active
- Waiting
- Parked
- Someday
- Done

Avoid building Jira for personal life.

Projects should primarily exist to generate executable next actions.

---

## 9. Active Slots

PARSE should limit concurrent active commitments.

Some life domains are permanently active:
- Family
- Faith
- Health
- Primary employment

Other discretionary work should use constrained slots.

Possible model:

### Build
1 active project

### Learn
1 active subject

### Personal
1 active project

Everything else remains Parked or Someday.

This should be configurable later, but the product philosophy should strongly discourage unlimited concurrency.

---

## 10. Life

The Life screen groups supporting domains without cluttering primary navigation.

Potential sections:

### Family
- Birthdays
- Anniversaries
- Appointments
- Trips
- Important events
- Relationship reminders

### Faith
- Prayer
- Church
- Daily reflection
- Gratitude
- Examen
- Virtue focus

Avoid manipulative streak mechanics.

### Fitness
- Today's workout
- Weekly training plan
- Basic completion tracking

Do not attempt to replace Strava, Garmin, or TrainingPeaks in V1.

### Home
- Recurring chores
- Maintenance
- Home projects
- Repairs

### Learning
- Current primary learning objective
- Secondary reading
- Later queue

### Knowledge Vault
Retrieved captured ideas, references, inspiration, genealogy, books, quotes, etc.

---

## 11. Learning Queue

The user has more learning ambitions than available time.

PARSE should explicitly separate:

### Learning Now
Very limited active items.

### Later
Everything else.

Example:

Primary:
- Master’s coursework

Secondary:
- One current book

Later:
- PMI certification
- online courses
- textbooks
- other certifications

The existence of a future interest must not make it feel like a current obligation.

---

## 12. Someday / Maybe

PARSE should have a large, safe storage area for ambitions that are not current commitments.

Items in Someday are:
- not forgotten
- not deleted
- not obligations
- intentionally hidden from daily execution

This is psychologically important.

The system should communicate:

> You do not owe this idea anything today.

---

## 13. News / Personal Brief

PARSE should not become another infinite content feed.

A future Personal Brief may include:
- AI developments
- software / tooling updates
- engineering news
- technology relevant to active projects
- important local or personal-context developments

The brief should be finite.

Example target:
- approximately five minutes to read
- no infinite scroll
- clear completion state: “You’re caught up.”

---

## 14. Weekly Review

A lightweight weekly review should take roughly 10–15 minutes.

Potential flow:

1. What was completed?
2. What moved forward?
3. What stalled?
4. What upcoming commitments matter?
5. What needs attention?
6. Select next week's limited priorities.
7. Move inactive work back to Parked/Someday.

The review should reduce anxiety, not create administrative work.

---

## 15. Ask

Ask is the conversational interface to the user’s life.

Example questions:

- What should I work on tonight?
- I have two free hours. What should I do?
- What matters most this week?
- What home projects have stalled?
- When can I fit in a swim?
- What birthdays are coming up?
- What travel destinations have I saved?
- What Portuguese baby names did I like?
- What project should I resume after I finish my degree?
- What was that architecture idea I saved?

Ask should use actual PARSE data rather than behave like a generic chatbot.

---

## 16. UX Tone

PARSE should feel:
- calm
- focused
- intelligent
- restrained
- confident
- modern
- low-friction

It should not feel:
- corporate
- childish
- gamified
- cluttered
- judgmental
- guilt-inducing

The UI should encourage forward movement without making the user feel punished for falling behind.

---

## 17. Important Product Language

Key phrases worth preserving:

> Dream at the scale of a lifetime.  
> Plan at the scale of a season.  
> Execute at the scale of today.  
> Focus at the scale of now.

> What should I be doing right now?

> What do I need to know so I can stop thinking about everything else?

> Nothing else is required of you right now.

> You do not owe this idea anything today.

> Capture first. Organize later.

---

## 18. V1 Technical Direction

Initial client:
- React Native
- Expo
- TypeScript

Recommended baseline:
- Expo Router
- strict TypeScript
- ESLint
- Prettier
- modern component architecture

Early development should favor speed and iteration.

Do not prematurely build:
- complex backend services
- elaborate AI orchestration
- social functionality
- custom sync engines
- excessive abstractions
- enterprise architecture

First prove the core interaction:

**Capture chaos → Parse it → Select today's work → Execute one next action.**

---

## 19. V1 Milestone

The first meaningful milestone is complete when the app allows a user to:

1. Launch into Today.
2. Create/capture tasks or ideas rapidly.
3. Create a project.
4. Give the project a desired outcome.
5. Break the project into actionable next steps.
6. Select a small number of tasks for today.
7. Display one emphasized “Now” action.
8. Mark actions complete.
9. Park a project without losing it.
10. Retrieve captured information later.

Everything else is secondary until this loop feels excellent.

---

## 20. Development Rule

This project itself must follow the philosophy of PARSE.

Do not try to build the whole vision simultaneously.

At every development stage ask:

> What is the smallest useful next action?

Build that.

Finish it.

Then parse again.
