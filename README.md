# CS-50 EMAIL DASHBOARD
## Video Demo: 
## Description:
What is the email dashboard?

Essentially I created what Apple added in their most recent update, but unknowingly. I got a new phone about halfway through creating this project, and in the mail app it auto summarized what I received. IMAGINE MY SHOCK. But, alas I kept on keeping on. My email dashboard serves as a "One stop shop" for everything you'd want to do on your emails, while also giving the user a Scratch-esque node building experience, where can craft their own workflows as they see fit. 

Why did I make something of this insane scope?

Well, school had just let out and I had a month to finish this project, so I bit off way more than I could chew. I'm starting a job at a startup and they need a full-stack website architected, this project was to familiarize myself with a more robust tech stack. While applying concepts I learned throughout my time in CS-50. Unfortunately, that meant I had to rely a LOT on documentation and wasn't able to nuance the features of TS and Next.js to the level I would've hoped. The added complexity from trying to ensure a secure, and safe, website made this nearly an insurmountable challenge.

## Tech Stack

- **Next.js**: Used with templating, and a lot of the "backend" code as well, it's an incredible industry standard tool for the templating, but not for the backend so much.
- **Tailwind CSS**: I love the sleek and modern look of Tailwind applications, I probably only know a tenth of the features within Tailwind but it helps with the mass formatting, and keeping a cohesive look
- **PostgreSQL**: Used PostgreSQL as my database because it hinges on being online more than anything else, I didn't have to worry about the lack of scaling within SQLite, or the restriction of no-SQL databases like Mongo. Postgre is my go-to. 
- **React 3 Fiber**: Used to render my previously created Three.js webGL shader, I had to port it from JS to TS.
- **React**: Used within the bounds of Next.js - a tool for a tool

## Hosting

- **Supabase**: recommended to me by my tech friends, it's free, easy to use, and very secure. I think the UI was built using a similar tech stack to the one I used for my project too, which is cool
- **Vercel**: Undisputed goat for web hosting free projects. All env variables stored on their secure network.

## File Structure/Uses

### [`prisma/`](prisma/)
- [`migrations/`](prisma/migrations/) - Contains the data on all of my changes in the prisma schema, additions of new tables, variables, etc.
- [`schema.prisma`](prisma/schema.prisma) - contains my database schema, what I used for my zod verifications. 

### [`public/`](public/)
Contains my fonts, images, icons, svg, etc.

### CONTEXT: 
files with parentheses around them are ignored by Next.js, which means they do not have any pages that are accessible to the user within their immediate directory. Next.js requires that app directories contain a page.tsx file inside of them to be accessible as a route. FOR EXAMPLE: if I have a dashboard directory within my app directory, the file labeled page.tsx inside of it would be given the route ~/dashboard when navigating on the page. And if there is a directory called workflows inside of that, the file page.tsx inside of it would direct the user to ~/dashboard/workflows. I put parenthesis on the first directory outside of the app directory to show this convention and explain it here.

### [`src/`](src/)

#### [`src/(silly-shaders)/`](src/(silly-shaders)/)
- [`script.ts`](src/(silly-shaders)/script.ts) - contains the script/config elements of my shaders, needed by renderer to feed into the renderer, the renderer is the formula, this contains the numbers fed into said formula to get an output
- [`shaders.ts`](src/(silly-shaders)/shaders.ts) - contains the formulas needed to display the math based shaders on screen

#### [`src/actions/`](src/actions/)
- [`auth.ts`](src/actions/auth.ts) - assigns cookies to users upon completion of authorization/login
- [`encrypt.ts`](src/actions/encrypt.ts) - utility helper function for encrypting/decrypting data
- [`sessioncookie.ts`](src/actions/sessioncookie.ts) - helper for creating/managing cookies

#### [`src/app/`](src/app/)

##### [`src/app/(admin)/`](src/app/(admin)/)
summary of whole file: I never ended up doing anything with admin, I just wanted to know that I could separate users, and allow for the creation of an admin dashboard, nothing in here is even kinda important.

##### [`src/app/(auth)/`](src/app/(auth)/)
- [`layout.tsx`](src/app/(auth)/layout.tsx) - layout files specify conventions that must be used in every other file in the directory, it's a godsend for templating unique pages, with similar conventions, the {children} contain everything added in the other page.tsx 's. This is my login/register template
- **[`login/`](src/app/(auth)/login/)**
    - [`page.tsx`](src/app/(auth)/login/page.tsx) - login page, uses template from components to display an entry box, posts info to zod and redirects user if valid call to database
- **[`register/`](src/app/(auth)/register/)**
    - [`page.tsx`](src/app/(auth)/register/page.tsx) - similar to login, contains registration entry boxes

##### [`src/app/(dashboard)/`](src/app/(dashboard)/)
- **[`analytics/`](src/app/(dashboard)/analytics/)**
    - [`page.tsx`](src/app/(dashboard)/analytics/page.tsx) - unfinished, was going to be a user facing analytics board, ended up putting it in the base dashboard page.tsx, never deleted unused pages because I do plan on finishing this later
- **[`dashboard/`](src/app/(dashboard)/dashboard/)**
    - [`page.tsx`](src/app/(dashboard)/dashboard/page.tsx) - Main user facing dashboard landing page, contains elements created in components/api calls to display user emails send, inbox, and mail ranked in order of importance and potential risks
- **[`emails/`](src/app/(dashboard)/emails/)**
    - **[`compose/`](src/app/(dashboard)/emails/compose/)**
        - [`page.tsx`](src/app/(dashboard)/emails/compose/page.tsx) - unused (unused = explanation from analytics page.tsx)
    - **[`templates/`](src/app/(dashboard)/emails/templates/)**
        - [`page.tsx`](src/app/(dashboard)/emails/templates/page.tsx) - unused
    - [`page.tsx`](src/app/(dashboard)/emails/page.tsx) - email landing page, contains OAuth buttons which allow the user to connect gmail
- **[`integrations/`](src/app/(dashboard)/integrations/)** - unused
- **[`notifications/`](src/app/(dashboard)/notifications/)** - unused
- **[`profile/`](src/app/(dashboard)/profile/)** - unused
- **[`settings/`](src/app/(dashboard)/settings/)** - unused
- **[`workflows/`](src/app/(dashboard)/workflows/)**
    - **[`[id]/`](src/app/(dashboard)/workflows/[id]/)** - broken
    - **[`info/`](src/app/(dashboard)/workflows/info/)**
        - [`page.tsx`](src/app/(dashboard)/workflows/info/page.tsx) - explains the project, what a workflow is, and has a way to commission me
    - **[`manage/`](src/app/(dashboard)/workflows/manage/)**
        - [`page.tsx`](src/app/(dashboard)/workflows/manage/page.tsx) - contains info on saved workflows, allows user to edit, activate, deactivate, or delete them
    - **[`new/`](src/app/(dashboard)/workflows/new/)**
        - [`page.tsx`](src/app/(dashboard)/workflows/new/page.tsx) - contains awesome grid style node/workflow generator, allows user to save the workflows once completed, builder UI using xyreact
    - [`page.tsx`](src/app/(dashboard)/workflows/page.tsx) - contains the workflows dashboard, shows current workflows, what's being used and how, and allows the user to delete workflows as they choose
- [`layout.tsx`](src/app/(dashboard)/layout.tsx) - contains components i want globally, like the sidebar, and navbar

##### [`src/app/(marketing)/`](src/app/(marketing)/) - unused

##### [`src/app/api/`](src/app/api/)
- **[`auth/`](src/app/api/auth/)**
    - **[`...nextauth/`](src/app/api/auth/...nextauth/)**
        - [`route.ts`](src/app/api/auth/...nextauth/route.ts) - NextAuth route integration which handles the OAuth/session endpoints
    - **[`login/`](src/app/api/auth/login/)**
        - [`auth.ts`](src/app/api/auth/login/auth.ts) - API route handling with the login logic
    - **[`register/`](src/app/api/auth/register/)**
        - [`auth.ts`](src/app/api/auth/register/auth.ts) - API route handling with register logic, I really could've combined a lot of these files sigh
- **[`connect/`](src/app/api/connect/)**
    - **[`gmail/`](src/app/api/connect/gmail/)**
        - [`route.ts`](src/app/api/connect/gmail/route.ts) - starts the gmail oauth process, uses the cookie helper to create cookies and save the state cookie for connect
    - **[`microsoft/`](src/app/api/connect/microsoft/)** - for all intents and purposes, unused
    - **[`yahoo/`](src/app/api/connect/yahoo/)** - for all intents and purposes, unused
- **[`email/`](src/app/api/email/)**
    - **[`callback/`](src/app/api/email/callback/)**
        - **[`gmail/`](src/app/api/email/callback/gmail/)**
            - [`route.ts`](src/app/api/email/callback/gmail/route.ts) - oauth callback handler, finalizing oauth gmail connection and storing cookies
        - **[`microsoft/`](src/app/api/email/callback/microsoft/)** - unused
        - **[`yahoo/`](src/app/api/email/callback/yahoo/)** - unused
    - **[`new/`](src/app/api/email/new/)**
        - [`route.ts`](src/app/api/email/new/route.ts) - api endpoint to create and send emails based on providers (only gmail works atp)
    - **[`respond-ai/`](src/app/api/email/respond-ai/)**
        - [`route.ts`](src/app/api/email/respond-ai/route.ts) - generates and sends AI generated responses using my OpenAI API key
    - **[`summaries/`](src/app/api/email/summaries/)**
        - [`route.ts`](src/app/api/email/summaries/route.ts) - returns generated email summaries after sending emails upstream to my AI API
    - **[`unsubscribe/`](src/app/api/email/unsubscribe/)**
        - [`route.ts`](src/app/api/email/unsubscribe/route.ts) - functionality for user to send "please unsubscribe me" to junk mail
- **[`login/`](src/app/api/login/)**
    - [`route.ts`](src/app/api/login/route.ts) - api route for handling login POST request/session creation
- **[`logout/`](src/app/api/logout/)**
    - [`route.ts`](src/app/api/logout/route.ts) - api route for handling session deletion, sets cookies to 0
- **[`register/`](src/app/api/register/)**
    - [`route.ts`](src/app/api/register/route.ts) - api route for handling registering users, sending registration details to db
- **[`session/`](src/app/api/session/)**
    - [`route.ts`](src/app/api/session/route.ts) - exposes users current session so i can use it to verify certain info
- **[`workflows/`](src/app/api/workflows/)**
    - **[`[id]/`](src/app/api/workflows/[id]/)**
        - **[`duplicate/`](src/app/api/workflows/[id]/duplicate/)**
            - [`route.ts`](src/app/api/workflows/[id]/duplicate/route.ts) - api to duplicate an existing workflow by id
        - [`route.ts`](src/app/api/workflows/[id]/route.ts) - get/update/delete logic for one workflow
    - **[`run/`](src/app/api/workflows/run/)**
        - [`route.ts`](src/app/api/workflows/run/route.ts) - endpoint to trigger the execution of a workflow
    - **[`triggers/`](src/app/api/workflows/triggers/)**
        - [`route.ts`](src/app/api/workflows/triggers/route.ts) - specifies endpoints to conditionally trigger a workflow, webhook based
    - [`route.ts`](src/app/api/workflows/route.ts) - api to create and list workflows

##### [`src/app/privacy/`](src/app/privacy/)
- [`page.tsx`](src/app/privacy/page.tsx) - basic privacy page, created to try and get approved by google cloud

##### [`src/app/terms/`](src/app/terms/)
- [`page.tsx`](src/app/terms/page.tsx) - basic terms page, created to try and get approved by google cloud

#### [`src/components/`](src/components/)
- **[`dashboard/`](src/components/dashboard/)**
    - [`EmailSummaryCard.tsx`](src/components/dashboard/EmailSummaryCard.tsx) - ui card displaying email summary
- **[`layouts/`](src/components/layouts/)**
    - [`entrybox.tsx`](src/components/layouts/entrybox.tsx) - basic entrybox used in both login and register, able to be appended to to add new fields
    - [`navbar.tsx`](src/components/layouts/navbar.tsx) - top screen navbar, changes color of text based on current page
- **[`ui/`](src/components/ui/)**
    - [`footer.tsx`](src/components/ui/footer.tsx) - boring footer with links
    - [`providers.tsx`](src/components/ui/providers.tsx) - react context, for theme, so i can change the color of the site on buttonclick w the light to dark mode component
- **[`workflow/`](src/components/workflow/)**
    - [`ManageWorkflowsClient.tsx`](src/components/workflow/ManageWorkflowsClient.tsx) - client UI for managing workflows
    - [`NewWorkflowPanel.tsx`](src/components/workflow/NewWorkflowPanel.tsx) - the beautiful side panel you see when you click nodes in the workflow graph, or when you add new workflows
- [`WorkflowBuilder.tsx`](src/components/WorkflowBuilder.tsx) - elk, xyreact, visual workflow builder with components
- [`workflowCanvas.tsx`](src/components/workflowCanvas.tsx) - the canvas component that renders the built workflow

#### [`src/generated/prisma/`](src/generated/prisma/)
all of this was generated by prisma when i imported the library, i had no hand in it other than
- [`schema.prisma`](src/generated/prisma/schema.prisma) - generated prisma DB schema, made by me

#### [`src/lib/`](src/lib/)
- [`auth.ts`](src/lib/auth.ts) - server side auth helpers for session/user retrieval and checks, used by middleware
- [`prisma.ts`](src/lib/prisma.ts) - prisma client and db helpers
- [`server-session.ts`](src/lib/server-session.ts) - server side helper for Next.js server routes
- [`session.ts`](src/lib/session.ts) - client/server utilities and types
- [`util.ts`](src/lib/util.ts) - general utility functions used around

#### [`src/services/`](src/services/)
- **[`ai/`](src/services/ai/)**
    - [`openai.ts`](src/services/ai/openai.ts) - server helper that calls openAI chat completes and returns text output
- **[`email/`](src/services/email/)**
    - [`ai-email-summary.ts`](src/services/email/ai-email-summary.ts) - generates email based on context provided from email and then returns it
    - [`google.ts`](src/services/email/google.ts) - gmail helper for sending, labeling, and fetching emails, id have one for yahoo and microsoft if i got that far
    - [`summarize-login-window.ts`](src/services/email/summarize-login-window.ts) - logic to summarize a user's recent login window emails
- **[`workflow/`](src/services/workflow/)**
    - [`conditions.ts`](src/services/workflow/conditions.ts) - helpers to evaluate workflow trigger and conditions
    - [`run-workflows.ts`](src/services/workflow/run-workflows.ts) - loads, parses, and executes saved workflows, and records the metadata

#### [`src/types/`](src/types/)
- [`workflow.ts`](src/types/workflow.ts) - typescript types, defining different shapes of workflow nodes, conditions and actions

#### [`src/middleware.ts`](src/middleware.ts)
used for routing, actually the worst thing EVER. it contains server checks to verify the user doesn't go where they aren't supposed to, but super arcane and deprecated. i designate routes which i then use in navigation

---

### Access the page at: https://cs-50-final-project-zeta.vercel.app/