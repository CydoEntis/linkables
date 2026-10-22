# Product Roadmap & Technical Planning Prompt

## Your Role

Act as a senior software architect, product manager, and experienced SaaS founder.

I want you to help me plan and architect a new software product from the ground up.

Your responsibility is to produce a comprehensive, realistic, and actionable product roadmap covering product requirements, user experience, system architecture, database design, technical decisions, development phases, monetization, and future expansion.

**Important:** Do not write application code yet. This is strictly a planning and architecture exercise.

Challenge questionable assumptions, identify unnecessary complexity, and recommend simpler alternatives wherever appropriate.

I am a solo developer. The product must be practical to build, maintain, and operate without a large team.

Do not overengineer the initial architecture.

---

# 1. Product Overview

## The Problem

People constantly discover interesting or useful content online but have no convenient, centralized place to save, organize, retrieve, and share it.

Existing workarounds include:

- Sending YouTube videos to yourself through Discord.
- Keeping hundreds or thousands of browser tabs open.
- Bookmarking websites into poorly organized browser folders.
- Sending research links through Slack, Discord, email, or messaging apps.
- Keeping lists of URLs in documents or note-taking applications.
- Saving interesting articles or videos but forgetting where they were saved.
- Sharing large numbers of links with coworkers and struggling to find them again.

Information becomes fragmented across devices, applications, messages, and browser sessions.

The goal is to make capturing, organizing, retrieving, and sharing online information effortless.

## The Solution

Build a modern, cross-device, collaborative link management and research platform.

Users should be able to save nearly any URL, organize content into collections, search and filter their libraries, share individual resources or collections, and optionally use AI to understand and discover information they've saved.

The product should work equally well for casual users, students, researchers, developers, hobbyists, and small teams.

Examples of supported content include:

- YouTube videos
- Research papers
- Articles and blogs
- Documentation
- GitHub repositories
- Websites
- Tutorials
- Recipes
- Product pages
- News articles
- Podcasts
- Other publicly accessible URLs

Users are saving links to external content, not uploading or hosting the underlying videos or media.

The platform should automatically retrieve useful metadata whenever possible, including titles, descriptions, thumbnails, favicons, authors, publication dates, and content types.

**Product principle: Save anything. Find it later. Share it effortlessly.**

---

# 2. Core Product Philosophy

Follow these principles throughout planning:

1. **Capture must be effortless.** Saving a link should be as easy as sending a message to yourself.
2. **Save now, organize later.** Users should never be forced to categorize content before saving it.
3. **Useful without AI.** The core product must work independently of AI functionality.
4. **Private by default.** Users control what they share.
5. **Cross-device by design.** Saved information should be accessible from home, work, and mobile devices.
6. **Collections over conversations.** Shared information should remain organized and searchable rather than disappearing into chat history.
7. **Simple before powerful.** Avoid complicated productivity workflows and unnecessary settings.
8. **Fast and lightweight.** The interface should prioritize responsiveness and ease of use.
9. **Portable data.** Users should be able to export their saved links and collections.
10. **Solo-developer friendly.** Prefer proven technologies and managed infrastructure over complex distributed systems.

Avoid turning the application into a complicated Notion clone, social network, or general-purpose project management platform.

---

# 3. Target Users and Use Cases

Design the product to support several use cases without making the interface unnecessarily complicated.

## User A: Personal Researcher

A user discovers multiple YouTube videos about programming while browsing at home.

They save the videos to their library.

Later, while at work, they open the application and immediately find everything they saved.

They can search by topic, filter by YouTube videos, mark videos as watched, and organize them into collections.

## User B: Tab Hoarder

A user has hundreds of browser tabs open containing documentation, research, tutorials, and resources.

They want to save selected tabs, an entire browser window, or potentially their full browser session into organized collections.

They can safely close tabs after confirming their links were saved.

Later they can reopen individual URLs or groups of saved URLs.

The platform must distinguish saved URL collections from full browser-session restoration. It should not promise to preserve login sessions, forms, or unsaved page state.

## User C: Team Research

Several coworkers are researching a technical subject.

Instead of posting dozens of URLs into Slack or Discord, they create a shared collection.

Members can contribute resources, add notes, search, filter, pin important links, and see who contributed each resource.

New additions become visible to everyone with access.

## User D: Student or Researcher

A student saves academic papers, documentation, lectures, and articles about a topic.

They organize sources, add personal notes, and optionally ask AI to summarize or compare accessible source material.

AI-generated answers should reference their original sources.

## User E: Casual Organizer

Someone saves recipes, travel destinations, shopping links, and hobby resources.

They want a simple interface that doesn't feel like enterprise productivity software.

They can create attractive collections to share with friends.

---

# 4. Core Features

Analyze and specify the following features.

For each feature, document:

- Purpose and user problem
- User stories
- Functional requirements
- Expected UX
- Data requirements
- Edge cases
- Security and privacy considerations
- Implementation difficulty
- Dependencies
- Acceptance criteria
- Whether it belongs in MVP, V1, V2, or a later release

## 4.1 Link Saving

Users should be able to:

- Paste URLs into the application.
- Save links through a browser extension.
- Save links directly into their Inbox.
- Optionally select a collection before saving.
- Save multiple URLs in a single operation.
- Detect duplicates and allow users to decide whether to reuse an existing resource or save it in another collection.
- Edit titles, descriptions, tags, and notes.
- Archive or delete saved resources.
- Pin important links.
- Track saved dates and optional last-visited dates.

Investigate URL normalization and canonicalization, including tracking parameters, redirects, canonical URLs, and cases where URL variants refer to different content.

Design metadata extraction with safeguards against SSRF, malicious redirects, private network access, excessive downloads, and untrusted HTML.

Metadata extraction should be performed asynchronously where appropriate.

## 4.2 Universal Inbox

Every user has a default Inbox.

Saving a link should not require choosing a collection.

Users can organize saved links later.

Investigate batch actions, bulk tagging, and bulk collection assignment.

Prioritize a very fast save workflow.

## 4.3 Collections

Users can create and manage collections.

Features to consider:

- Collection names and descriptions
- Optional cover images
- Custom icons or colors
- Private, unlisted, and public visibility
- Shared collections
- Pinning favorite collections
- Collection sorting
- Optional nested collections
- Assigning one resource to multiple collections
- Collection-level notes
- Collection-specific search and filters

Evaluate whether nested collections are necessary for the initial release.

Avoid overly complicated organizational hierarchies.

## 4.4 Search, Sorting, and Filtering

Users should be able to find saved content through:

- Title search
- Description search
- URL and domain search
- Tags
- Collections
- Content type
- Date saved
- Source website
- Pinned status
- Read/watched status
- Contributor
- Personal or shared resources

Evaluate PostgreSQL full-text search for the MVP.

Explain when dedicated search infrastructure or vector search becomes justified.

Users should not need AI to perform ordinary search.

## 4.5 Browser Extension

Support Chrome and other Chromium-based browsers initially.

Consider Firefox later.

The extension should allow users to:

- Save the current tab.
- Save selected tabs.
- Save every tab in the current window.
- Save tabs from multiple windows.
- Choose an existing collection.
- Save to Inbox by default.
- Create a new collection.
- Optionally close selected tabs after successfully saving them.
- See whether a URL is already saved.
- Open the web application quickly.

Investigate browser extension permissions, authentication, syncing, and Manifest V3 requirements.

Prioritize minimal permissions and reliable tab-saving confirmation.

Do not close tabs unless persistence has been confirmed and the user explicitly requested it.

## 4.6 Sharing and Collaboration

Users should be able to:

- Share individual links.
- Share collections through URLs.
- Invite other users to private collections.
- Allow authorized collaborators to contribute.
- Control permissions.
- Follow shared collections to receive updates.
- Browse shared collections without requiring an account when allowed.
- Revoke access to private collections.
- See basic contributor attribution.

Define appropriate roles, such as owner, editor, and viewer.

Investigate whether public collections should be indexed by search engines.

Make sure private resources cannot leak through public APIs, search indexes, metadata endpoints, or AI responses.

## 4.7 Notes and Resource Status

Users can optionally attach notes to saved links.

Consider:

- Personal notes
- Shared notes
- Unread
- In progress
- Completed
- Archived
- Favorites
- Pins

Evaluate whether read/watched status should be user-specific in shared collections.

Avoid building a full document editor unless there is a compelling need.

## 4.8 Mobile Experience

The application must have a responsive web interface.

Investigate a PWA and mobile share-target integration, accounting for differences between Android and iOS.

Prioritize opening saved resources, searching collections, and quickly saving links.

Evaluate whether native mobile applications are ever necessary.

---

# 5. AI Features

AI should be optional and introduced after the foundational product works.

Research and plan the following capabilities.

## 5.1 AI Summarization

Users can request summaries of:

- Accessible website content
- Articles
- YouTube transcripts when available and permitted
- Research papers available through supported sources
- Individual resources
- Selected groups of resources

AI should clearly distinguish retrieved source text from metadata-only summaries.

Never imply that a video was analyzed if only its title and description were available.

## 5.2 Semantic Search

Allow users to search using natural-language queries.

Examples:

"Find the video I saved about Go channels."

"Find the research paper discussing distributed caching strategies."

"Show resources about PostgreSQL optimization."

Explain embedding generation, vector storage, hybrid search, retrieval, and indexing strategies.

Evaluate PostgreSQL with pgvector against external vector databases.

## 5.3 Ask Your Library

Allow users to ask questions about their saved content.

Examples:

"Summarize everything I've saved about Kubernetes."

"What are the main differences between these three papers?"

"Which saved resources discuss distributed queues?"

"Find arguments against using microservices in small applications."

Answers should provide citations linking to original resources and, where available, relevant sections or timestamps.

Define how the system handles unavailable, inaccessible, contradictory, and outdated sources.

## 5.4 Automatic Organization

Investigate optional AI functionality for:

- Suggested tags
- Suggested collections
- Duplicate detection
- Topic classification
- Related-resource discovery
- Automatic titles and summaries

Do not require expensive AI calls when deterministic methods are sufficient.

## 5.5 AI Architecture and Costs

Recommend an architecture that supports multiple AI providers.

Consider:

- OpenAI
- Anthropic
- Google
- Other compatible providers

Do not hardcode the application around a single model.

Design an abstraction for AI operations.

Recommend strategies for:

- Token accounting
- Per-user rate limits
- AI credit systems
- Model selection
- Summary caching
- Embedding caching
- Background processing
- Failure handling
- Budget caps
- Monitoring
- Abuse prevention
- Content extraction limits

AI must never generate unlimited unmetered costs.

Consider the security implications of prompt injection from saved websites and documents.

Explain how to keep retrieved content isolated from system instructions and privileged actions.

## 5.6 AI Billing Model

Evaluate a hybrid approach:

**Free users:** Core bookmarking and sharing, with a small one-time AI trial.

**Pro users:** Monthly AI credits included with the subscription.

**Heavy users:** Optional additional credits or BYOK (Bring Your Own API Key).

**Teams:** Shared or individual AI allowances.

Compare the advantages and drawbacks of provider-funded AI versus BYOK.

Explain secure storage and handling of user API keys.

Use verified provider pricing when preparing actual cost estimates.

Provide example unit economics under low, moderate, and heavy usage scenarios.

Distinguish model inference charges from content acquisition, transcription, embeddings, storage, and other infrastructure costs.

---

# 6. Technical Architecture

My strongest programming language is TypeScript.

I have experience with Node.js, React, Next.js, and backend web development.

I want this project to improve my software engineering skills without becoming unnecessarily complicated.

Evaluate and recommend an architecture based around:

- TypeScript
- Next.js or React with a separate Node.js backend
- PostgreSQL
- An ORM or query builder
- Background jobs
- Object storage only where justified
- A browser extension
- External AI APIs

Discuss whether a monolith, modular monolith, or separate frontend/backend architecture makes the most sense.

Explain the recommendation and tradeoffs.

Do not introduce microservices, Kubernetes, event streaming infrastructure, or a dedicated vector database without a clear justification.

Consider using PostgreSQL as the initial system of record and delaying Redis or additional services until they solve demonstrated problems.

## System Components

Describe the responsibilities of:

1. Web application
2. Backend API
3. Database
4. Metadata extraction workers
5. Browser extension
6. Authentication system
7. Search system
8. Sharing and permissions system
9. AI integration layer
10. Subscription and usage metering system

Include a system architecture diagram using Mermaid.

## Repository Structure

Recommend either a monorepo or a simpler repository structure.

If using a monorepo, evaluate a structure such as:

    apps/
      web/
      extension/
      worker/
    packages/
      database/
      shared/
      ai/
      ui/

Explain which packages should actually exist in the MVP.

Avoid creating abstraction-heavy packages before they are needed.

## Background Processing

Identify operations that should run asynchronously, such as:

- Metadata retrieval
- Article extraction
- Thumbnail processing
- AI summarization
- Embedding generation
- Batch imports
- Bulk tab processing

Explain when a simple database-backed job system is adequate versus when Redis and BullMQ become worthwhile.

---

# 7. Database Design

Develop an initial relational database schema.

Consider entities such as:

- Users
- Resources or links
- User-saved resources
- Collections
- Collection memberships
- Collection collaborators
- Tags
- Resource-tag relationships
- Notes
- Sharing permissions
- Resource metadata
- Processing jobs
- AI summaries
- AI usage records
- Subscription records

Distinguish globally reusable URL metadata from user-specific saved-resource state.

Explain how resources belonging to multiple collections should be modeled.

Explain how shared collections and private user notes should coexist.

Evaluate deduplication and how it affects permissions.

Provide:

- An entity relationship diagram
- Table descriptions
- Primary keys and relationships
- Important constraints
- Suggested indexes
- Deletion and cascading behavior
- Migration strategy

Start with the MVP schema and identify later additions separately.

---

# 8. UI/UX Design

Design an interface that feels modern, minimal, and fast.

Avoid excessive dashboards, productivity gimmicks, and visual clutter.

The interface should be approachable for casual users while powerful enough for researchers.

## Important Screens

Plan the following screens:

1. Sign in / account creation
2. Main library
3. Universal Inbox
4. Collection details
5. Individual saved resource
6. Shared collection
7. Search results
8. Browser extension popup
9. Settings
10. AI interface (later)
11. Subscription and usage management (later)

## Primary Navigation

Consider:

- Inbox
- Library
- Collections
- Shared with Me
- Favorites
- Archive

Evaluate whether all these sections are necessary.

## Layout Options

Investigate:

- Grid/card view
- Compact list view
- Table view for dense research collections

Cards should make videos and visually rich resources recognizable.

List or table views should make large collections easy to scan.

Include keyboard shortcuts, bulk actions, and accessible interactions where appropriate.

Provide rough wireframe descriptions and user flows.

---

# 9. Privacy, Security, and Reliability

This application will store personal browsing and research information.

Security and privacy are important.

Plan for:

- Secure authentication
- User authorization
- Resource ownership
- Collection sharing permissions
- Server-side access controls
- Secure public sharing tokens
- Rate limiting
- Abuse prevention
- URL validation
- SSRF protection
- Safe HTML handling
- Secure credential storage
- Data export
- Account deletion
- Backup and recovery
- Retention policies
- Logs and monitoring

Saved URLs may contain private tokens or sensitive query parameters.

Discuss URL handling, safe logging, and redaction strategies.

Consider privacy implications of extracting content from shared links.

Do not expose private user content to AI providers without appropriate disclosure and controls.

---

# 10. Monetization and Business Model

The primary goal is to create a product I personally use.

Commercial success would be a bonus, but I want the architecture to support future monetization.

Evaluate a freemium SaaS model.

Possible plans:

**Free**
- Unlimited basic link saving
- Collections
- Basic search and filters
- Browser extension
- Basic sharing

**Pro — proposed $5/month**
- AI summaries
- Semantic search
- Advanced organization
- Monthly AI credits
- Advanced research features

**Team — proposed $8/user/month**
- Collaborative workspaces
- Shared research libraries
- Team permissions
- Group AI budgets
- Team management

Treat prices as hypotheses.

Evaluate the actual costs and whether these tiers make financial sense.

Provide estimates for:

- 100 active users
- 1,000 active users
- 10,000 active users

Include storage, compute, metadata processing, AI usage, database hosting, and other meaningful operating costs.

Explain which features genuinely justify charging money.

Avoid making the Free plan so restrictive that the product becomes useless.

---

# 11. Competitive Analysis

Research relevant competitors, including:

- Raindrop.io
- Recall
- Fabric
- Are.na
- Linkwarden
- Any other directly relevant competitors

Compare:

- Core functionality
- Collaboration
- Search
- AI features
- Pricing
- User experience
- Target audience
- Differentiation
- Potential gaps

Do not invent competitive advantages.

Identify which proposed features are already widely available.

Recommend a narrow positioning strategy that has a credible chance of attracting early users.

Clearly distinguish verified competitor facts from hypotheses.

---

# 12. Development Roadmap

Create a phased roadmap optimized for a solo developer.

Do not assume I am working on the project full time.

Use the following general progression, but adjust it if there's a better ordering.

## Phase 0 — Product Definition

Define the smallest valuable product.

Choose initial technologies.

Identify major architectural decisions.

Document what is explicitly out of scope.

## Phase 1 — Personal MVP

Goal: Replace sending myself Discord messages containing URLs.

Required capabilities:

- Authentication
- Save URLs
- Automatic metadata retrieval
- Universal Inbox
- Collections
- Search
- Sorting and filtering
- Cross-device synchronization
- Basic responsive interface

Deliverable: A fully usable personal link library.

## Phase 2 — Browser Extension

Goal: Make saving links and browser tabs effortless.

Required capabilities:

- Save current page
- Save multiple selected tabs
- Save an entire browser window
- Save to Inbox or selected collection
- Detect already-saved URLs
- Optional close-after-save functionality

Deliverable: A reliable browser extension.

## Phase 3 — Sharing and Collaboration

Goal: Let coworkers and friends organize resources together.

Required capabilities:

- Public and private collections
- Shareable URLs
- Invitations
- Permissions
- Shared contributions
- Pinned resources
- Collaborative notes
- Followed collections

Deliverable: A useful shared research library.

## Phase 4 — AI Features

Goal: Help users understand and find their saved information.

Required capabilities:

- On-demand summaries
- Source-aware search
- Semantic search
- AI questions about collections
- Citations
- Caching
- Usage metering

Deliverable: An optional AI-assisted research experience.

## Phase 5 — Commercialization

Goal: Validate whether users will pay.

Possible capabilities:

- Subscription billing
- AI credits
- Additional credits
- BYOK
- Team subscriptions
- Usage analytics
- Billing management

Deliverable: A monetizable product with controlled costs.

## Phase 6 — Future Expansion

Evaluate potential additions such as:

- Native mobile apps
- Advanced team management
- Browser session workflows
- More powerful search
- Import/export integrations
- Public curated resource directories
- Recommendations
- Advanced AI research tools
- Integrations with external productivity apps

Do not assume these features will all be built.

Evaluate each based on user demand and complexity.

---

# 13. Testing Strategy

Provide a realistic quality-assurance plan.

Include:

- Unit tests for business logic
- Integration tests for database operations
- API testing
- Authorization testing
- Browser extension testing
- End-to-end user workflows
- Metadata extraction tests
- Broken URL handling
- Search correctness
- AI usage accounting
- Payment and webhook testing when billing is introduced

Identify which tests are essential from day one.

Define reliable handling of duplicates, network failures, metadata fetch failures, and partial batch saves.

---

# 14. Product Validation

I can personally use the application immediately.

I also have coworkers who frequently keep large numbers of browser tabs open and may find the product useful.

Create a lightweight validation strategy.

Include:

- Personal dogfooding
- Small coworker beta
- Feedback collection
- Measuring repeat usage
- Save-flow friction
- Collection creation
- Search usage
- Sharing behavior
- Browser extension adoption
- Feature requests
- Willingness to pay

Recommend meaningful metrics that show whether the product solves a recurring problem.

Avoid vanity metrics.

Explain what evidence would justify investing in AI and monetization.

---

# 15. Deliverables

Produce the following planning documents as Markdown files:

1. `README.md` — Concise product overview, principles, and project goals.
2. `PRODUCT.md` — Product requirements, personas, core workflows, and features.
3. `ROADMAP.md` — Phased development roadmap with milestones and acceptance criteria.
4. `ARCHITECTURE.md` — Technical architecture, stack recommendations, diagrams, and tradeoffs.
5. `DATABASE.md` — Data model, relationships, schema design, and indexing strategy.
6. `DESIGN.md` — UI/UX principles, screens, navigation, and interaction flows.
7. `AI.md` — AI architecture, provider integrations, retrieval, usage limits, and cost controls.
8. `BUSINESS.md` — Competitive analysis, positioning, pricing hypotheses, and validation.
9. `SECURITY.md` — Threat model, privacy considerations, access controls, and safeguards.
10. `TASKS.md` — Ordered, actionable development tasks for the first MVP.

Do not merely create empty or generic documents.

Each document should contain concrete, project-specific decisions, assumptions, recommendations, and implementation guidance.

Where research or live verification is required, identify the source and verification date. If web access is unavailable, clearly mark pricing and competitor claims as unverified rather than fabricating details.

---

# 16. Roadmap Requirements

The roadmap must be exceptionally actionable.

For each phase, provide:

- Objective
- User-visible functionality
- Technical components
- Dependencies
- Major engineering tasks
- Acceptance criteria
- Risks
- Explicitly deferred functionality
- Definition of done

For individual tasks, include:

- Task identifier
- Description
- Priority
- Dependencies
- Estimated complexity (S/M/L)
- Verification or testing criteria

Avoid arbitrary deadlines and overly optimistic development estimates.

Identify the critical path to getting a working personal MVP.

Highlight the first point where I can stop development and have a genuinely useful product.

---

# 17. Architecture Decision Records

For significant technical choices, document:

- The problem
- Options considered
- Recommended decision
- Reasoning
- Tradeoffs
- Conditions that would justify revisiting the decision

Important decisions include:

- Next.js full-stack versus separate API
- Database and query layer
- Authentication solution
- Background job processing
- Metadata extraction design
- Resource deduplication
- Search architecture
- Browser extension architecture
- AI provider abstraction
- Hosting and deployment strategy

Prefer the simplest architecture that meets the current requirements.

---

# 18. Final Instructions

Before finalizing the roadmap, critically review the entire proposed product.

Identify:

1. Features that are unnecessary for the MVP.
2. Features that introduce disproportionate complexity.
3. Features that competitors already implement well.
4. Security or privacy risks.
5. Potential recurring infrastructure costs.
6. Assumptions that need user validation.
7. The product's strongest potential differentiators.
8. Ways to reduce development and maintenance effort.
9. Opportunities to make the product feel significantly faster or easier than existing alternatives.
10. Features most likely to encourage repeated daily usage.

Be critical rather than simply agreeing with every proposed feature.

**Do not build a massive platform before proving the core experience works.**

The initial success condition is simple:

I discover an interesting YouTube video, article, or website on my home computer, save it effortlessly, and later find it from my work computer without using Discord messages or leaving browser tabs open.

Everything else should build upon that experience.

## Expected Response Format

Start with:

1. Executive product assessment.
2. Recommended product positioning.
3. Recommended MVP scope.
4. Recommended technical stack and architectural decisions.
5. Major risks and open assumptions.
6. Phased roadmap overview.

Then produce the detailed Markdown planning documents.

If you have access to the project filesystem, create the documents in a `docs/` directory, with `README.md` at the project root.

If no filesystem is available, output each document in a separate, clearly labeled Markdown section.

Do not generate application code.

Prioritize decisions that result in a maintainable, enjoyable product that I can build incrementally as a solo developer.
