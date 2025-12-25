This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Email Provider OAuth (env vars)

These routes expect OAuth credentials to be present at runtime:

- Microsoft connect: `/api/connect/microsoft` → callback: `/api/email/callback/microsoft`
	- `MICROSOFT_CLIENT_ID`
	- `MICROSOFT_CLIENT_SECRET`
	- `MICROSOFT_REDIRECT_URI`

- Gmail (Google) connect: `/api/connect/gmail` → callback: `/api/email/callback/gmail`
	- `GOOGLE_CLIENT_ID`
	- `GOOGLE_CLIENT_SECRET`
	- `GOOGLE_REDIRECT_URI`

- Yahoo connect: `/api/connect/yahoo` → callback: `/api/email/callback/yahoo`
	- `YAHOO_CLIENT_ID`
	- `YAHOO_CLIENT_SECRET`
	- `YAHOO_REDIRECT_URI`

Token encryption:

- `OAUTH_TOKEN_ENC_KEY` (base64-encoded 32 bytes)


First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
