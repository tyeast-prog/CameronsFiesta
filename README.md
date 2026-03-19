# Cameron's 50th Surprise Fiesta — Party App

A web app for managing invitations, RSVPs, and side dish sign-ups for Cameron's surprise birthday party.

---

## Deployment Overview

| Layer    | Service         | Purpose                                      |
|----------|-----------------|----------------------------------------------|
| Hosting  | GitHub Pages    | Serves the static HTML/CSS/JS files publicly |
| Database | Firebase Firestore | Stores RSVPs, side dish data, event config |
| Auth     | Firebase Auth   | Protects the admin dashboard and setup pages |

---

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, give it a name (e.g. `camerons-fiesta`), and click through the setup wizard.

### Enable Firestore

1. In the left sidebar click **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (the rules file handles access)
4. Select a region close to you and click **Enable**

### Enable Authentication

1. In the left sidebar click **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Click **Save**

### Add an Admin User

1. Still in Authentication, click the **Users** tab
2. Click **Add user**
3. Enter the email and password you'll use to log into the dashboard and setup pages
4. Click **Add user**

---

## Step 2 — Copy Your Firebase Config

1. In the Firebase Console, click the gear icon ⚙️ → **Project settings**
2. Scroll down to **Your apps** and click **Add app → Web** (if you haven't already)
3. Register the app (nickname doesn't matter)
4. Copy the `firebaseConfig` values shown

Open `js/firebase-config.js` and fill in your values:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project-id.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

---

## Step 3 — Apply Firestore Security Rules

1. In the Firebase Console go to **Firestore Database → Rules**
2. Delete the existing placeholder rules
3. Copy the entire contents of `firestore.rules` (in this project folder) and paste it in
4. Click **Publish**

---

## Step 4 — Seed the Side Dish Items (one-time setup)

After deploying, open the **Setup** page (`/setup.html`) and log in. If no side dish items exist yet, you'll see a **"Seed Default Items"** button — click it to populate the 8 default side dishes. You can then add, edit, or remove items as needed.

---

## Step 5 — Deploy to GitHub Pages

### First-time setup

1. Create a new repository on [github.com](https://github.com) (can be private or public — GitHub Pages works with both for free accounts on public repos; private requires GitHub Pro)
2. Initialize git in the project folder and push:

```bash
cd camerons-party
git init
git add .
git commit -m "Initial party app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Enable GitHub Pages

1. On GitHub, open your repository
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Set branch to `main` and folder to `/ (root)`
5. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

The dashboard and setup pages are at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/dashboard.html
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/setup.html
```

---

## Pushing Updates

After making changes to any file:

```bash
git add .
git commit -m "Update event details"
git push
```

GitHub Pages re-deploys automatically within about a minute.

---

## File Structure

```
camerons-party/
├── index.html          — Public invitation & RSVP form
├── dashboard.html      — Admin: live RSVP monitoring (login required)
├── setup.html          — Admin: event details, menu & side dish management
├── firestore.rules     — Paste into Firebase Console → Firestore → Rules
├── css/
│   └── styles.css      — All styling
└── js/
    ├── firebase-config.js  — Your Firebase credentials (fill this in)
    └── app.js              — Firebase/Firestore API layer
```

---

## Admin Login

Use the email + password you created in **Step 1 → Add an Admin User**.

To change the admin password, go to **Firebase Console → Authentication → Users**, find your email, and use the menu to update it. There is no password management inside the app itself.

---

## Updating Event Details

Log into `/setup.html` to:
- Update the date, venue, time, dress code, contact info, and welcome message
- Edit the menu sections and items
- Add/edit/remove side dish items and adjust how many of each are needed
- View and export all RSVPs as CSV
- Reset all RSVPs (useful before sending invitations if testing)

---

## Tips

- **Share only `index.html`** with guests — the dashboard and setup URLs should be kept private.
- The RSVP form works on all devices (phone, tablet, desktop).
- The dashboard updates in real time — you'll see new RSVPs appear instantly without refreshing.
- If a side dish slot fills up while a guest is filling out the form, the transaction will catch it and ask them to choose another item.
