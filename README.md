# Social Network

A full-stack social media web app where users can create profiles, follow each other, post content, chat, and join groups — built as a school project.

---

## What's Inside

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Go (Golang) |
| Database | SQLite |
| Real-time | WebSocket |
| Icons | Lucide React |
| Email (OTP) | Gmail SMTP |

---

## Tech Concepts Explained

### JavaScript & TypeScript
JavaScript is the language of the web — it makes pages interactive. TypeScript is JavaScript with types added on top, which helps catch mistakes before the code runs. This project uses TypeScript everywhere on the frontend.

### React.js
React is a library for building user interfaces. Instead of writing a whole HTML page, you break the UI into small reusable pieces called **components** (like a post card, a button, a profile header). Each component manages its own content and updates automatically when data changes.

### `useState` — Remembering things inside a component
When you need a component to remember something (like whether a button is clicked, or what text is typed in a box), you use `useState`. Example:

```ts
const [likes, setLikes] = useState(5);
// likes = current value (5)
// setLikes = function to change it
```

When you call `setLikes(6)`, React automatically re-renders the component to show the new value. Without `useState`, the value would reset every time.

### `useEffect` — Running code at the right time
`useEffect` lets you run code *after* the component appears on screen. The most common use is fetching data from the server when a page loads:

```ts
useEffect(() => {
  fetch("/api/users/john").then(res => setProfile(res));
}, []); // the [] means "run once when page loads"
```

You can also make it watch a value — if that value changes, the effect runs again. It is also used to set up WebSocket listeners and clean them up when you leave the page.

### Next.js
A framework built on top of React. The big thing it adds is **file-based routing** — if you create a file at `app/profile/page.tsx`, it automatically becomes the `/profile` page in the browser. No extra configuration needed.

### Tailwind CSS
Instead of writing a separate CSS file, Tailwind lets you style things directly in the HTML using short class names. For example: `className="text-lg font-bold text-center p-4"`. It speeds up styling a lot.

### Go (Backend)
The backend is written in Go — a fast, compiled language. It handles all API requests, talks to the database, manages sessions, and controls the WebSocket server. It runs on port **8080**.

### SQLite
A lightweight database stored as a single file (`social-network.db`). No separate database server needed — the Go backend reads and writes to it directly.

### WebSocket
A persistent connection between the browser and the server that allows real-time communication. Used for live follow notifications, chat messages, group invitations, and online user tracking.

### Cookie-based Sessions
When you log in, the server creates a session and sends a cookie to your browser. Every future request automatically includes that cookie so the server knows who you are — no passwords sent again.

---

## How to Run

**Backend:**
```bash
cd backend
go run ./cmd/server/main.go
# Runs on http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Both must run at the same time. The frontend talks to the backend at port 8080.

---

## Pages

### `/register`
Sign-up form. Collects first name, last name, username, email, password, date of birth, and optionally a nickname and profile picture.

### `/login`
Log in with either your username or email plus your password.

### `/feed`
The home feed. Shows posts from people you follow. You can create new posts here with text and images. Posts can be set to public, followers-only, or close friends only.

### `/profile/[username]`
Any user's profile page. Shows:
- Their avatar, name, bio, and join date
- A public/private badge
- Follower and following counts (clickable — switches to that tab)
- **Posts tab** — their posts with infinite scroll (more load as you scroll down)
- **Followers tab** — grid of people who follow them, each with a follow/unfollow button
- **Following tab** — grid of people they follow
- **Activity tab** (own profile only) — animated rings showing total posts, likes received, and comments received
- **Sidebar** — shows nickname, email, birthday, member since, and a verification badge

On your own profile you also get:
- A toggle to switch between public and private
- An "Edit Profile" button that goes to settings
- A follow requests count that updates live

### `/settings`
Edit your profile information: name, username, nickname, email, date of birth, bio, avatar, and password. You can also toggle privacy here and delete your account permanently.

### `/notifications`
Shows all notifications — follow requests, group invitations, and activity. You can accept or decline follow requests directly from here.

### `/search`
Search for people, posts, and groups. Results appear as you type.

### `/chat`
Private one-on-one messaging between users. Messages are delivered in real-time via WebSocket.

### `/groups`
Browse all groups and the groups you belong to. You can create a group with a name, description, and cover image.

### `/groups/[id]`
A specific group's page. Has a feed of group posts, a member list, events, a group chat, and invite/join controls.

### `/posts/[username]/[id]`
A full single-post page with all its comments and replies.

---

## OTP — Email Verification

When you want to verify your account, you click the verification badge on your profile. Here is what happens step by step:

1. You click "Send Verification Code"
2. The backend generates a random **6-digit code** and stores it in the database with a 10-minute expiry
3. The code is sent to your email via Gmail
4. You type the code into the input field
5. The backend checks: does this code match what's in the database, and has it expired?
6. If valid → your account is marked as verified, the code is deleted from the database
7. Your profile shows a teal verified badge

The email credentials (Gmail address and app password) are stored in `backend/.env` and are never sent to the client.

---

## Project Structure (simplified)

```
social-network/
├── frontend/
│   ├── app/           ← pages (one folder = one route)
│   ├── components/    ← reusable UI pieces
│   └── lib/           ← API call functions, WebSocket, utilities
│
└── backend/
    ├── cmd/server/    ← entry point (starts the server)
    └── internal/
        ├── auth/      ← register, login, logout
        ├── profile/   ← edit profile, privacy, delete account
        ├── posts/     ← create, like, comment
        ├── follow/    ← follow, unfollow, requests
        ├── groups/    ← all group features
        ├── otp/       ← email verification
        ├── chat/      ← private messaging
        ├── ws/        ← WebSocket real-time events
        └── db/        ← database queries and migrations
```
