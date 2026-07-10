# SMS Pro Server

Express API for subscriptions (PayChangu), SendGrid emails, in-app notifications, and automated admin payment reminders.

## Environment variables

Copy `.env.example` to `.env` on your production host:

| Variable | Purpose |
|----------|---------|
| `PROJECT_ID` | Firebase project ID |
| `CLIENT_EMAIL` | Firebase service account email |
| `PRIVATE_KEY` | Firebase service account private key |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `SENDGRID_FROM_EMAIL` | Verified sender (e.g. noreply@ibratechinnovations.com) |
| `SENDGRID_FROM_NAME` | Display name (default: SMS Pro) |
| `APP_URL` | Frontend URL (default: https://sms.ibratechinnovations.com) |
| `PAYCHANGU_SECRET_KEY` | PayChangu payment API key |
| `PORT` | Server port (default 5000) |
| `REMINDER_CRON_MS` | Reminder scan interval in ms (default 86400000 = 24h) |

## How notifications work

1. **In-app** — Every action writes to `users/{uid}/notifications` (bell icon in the app).
2. **Email** — The same event sends a SendGrid email if the user has `preferences.emailNotifications` and (for billing) `preferences.paymentAlerts` enabled (both default **on**).
3. **Client actions** — The React app calls `POST /api/dispatch-notification` so emails fire for approvals, CRUD toggles, etc.
4. **Server actions** — Trial start, payment success, and reminders use `dispatchNotification` directly.

## Admin payment reminders (automatic)

Once per day the server scans all users with `role: admin` and compares `subscriptionenddate` to today.

Emails are sent **14, 7, 3, and 1 day(s)** before expiry (only once per window, tracked in `paymentRemindersSent` on the user doc).

Admins can turn off billing emails in **Settings → Payment alerts**.

## Deploy Firestore rules

From the project root (with Firebase CLI logged in):

```bash
firebase deploy --only firestore:rules
```

## Run locally

```bash
cd server
npm install
npm start
```
