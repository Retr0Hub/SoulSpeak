SoulSpeak: Caretaker/Patient yes/no communication with gesture input. Next.js frontend, Express + SQLite backend.

## Getting Started

Run the development servers:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the app. Backend runs on http://localhost:4000.

Key flows:
- Patient: Open Patient View. A 6-digit PIN is auto-generated and displayed. Share it with caretaker; when they connect, you are forwarded to the question screen.
- Caretaker: Sign up or login. In Add Patient, enter patient name and the patient's PIN to connect.

Auth:
- Uses opaque random session tokens. Endpoints available at `/signup` and `/login` (aliases of `/api/register` and `/api/login`).

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
