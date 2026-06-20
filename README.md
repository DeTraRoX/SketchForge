# 🚀 SketchForge

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-Latest-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-API-black?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>

<p align="center">
  <b>A powerful real-time collaborative whiteboard platform inspired by Excalidraw.</b>
  <br/>
  Create, design, collaborate, and visualize ideas together in real-time.
</p>

---

## ✨ Overview

**SketchForge** is a full-stack collaborative drawing application built using the **MERN stack**.

It allows users to create infinite canvas boards, draw diagrams, collaborate with others in real-time, generate AI-powered diagrams, and manage their creative workspace.

Designed with performance, scalability, and modern UI practices in mind.

---

# 🌟 Features

## 🔐 Authentication & User Management

* Secure user registration and login
* JWT-based authentication
* Protected routes
* User profile management
* Persistent sessions

---

## 🎨 Advanced Drawing Canvas

Create professional diagrams using:

* ✏️ Freehand drawing
* 🖊 Pencil tool
* ▭ Rectangle
* ◯ Ellipse
* ◇ Diamond
* ➡️ Lines & arrows
* 🔤 Text elements
* 🖼 Image insertion
* 🧹 Eraser tool

---

## 🛠 Element Controls

Powerful editing features:

* Move elements
* Resize objects
* Rotate shapes
* Delete elements
* Duplicate objects
* Copy / Paste
* Multi-selection
* Group / Ungroup elements

---

# 🎨 Styling & Customization

Customize your designs with:

* Stroke colors
* Fill colors
* Stroke thickness
* Opacity control
* Font customization
* Dashed borders
* Rounded corners
* Dark / Light mode

---

# 🌎 Infinite Canvas Experience

Features:

* Infinite canvas workspace
* Smooth pan & zoom
* Grid background
* Undo / Redo history
* Keyboard shortcuts
* Optimized rendering

---

# 🤝 Real-Time Collaboration

Collaborate with your team instantly:

* Socket.io powered rooms
* Live cursor tracking
* Online presence indicators
* Real-time element synchronization
* Multi-user editing

---

# 💾 Board Management

Manage your projects easily:

* Automatic saving
* MongoDB cloud storage
* Create unlimited boards
* Rename boards
* Delete boards
* Dashboard workspace

---

# 📤 Export System

Export your creations:

* PNG
* SVG
* JSON
* PDF

---

# 🤖 AI Powered Diagram Generator

Generate diagrams using AI:

Example:

```
Create a system architecture diagram for an e-commerce website
```

SketchForge automatically generates structured diagrams using AI.

---

# 🚀 Advanced Features

Coming with enterprise-level capabilities:

* 🧩 Templates system
* 💬 Comments
* 🔗 Board sharing
* 🕒 Version history
* 📱 Progressive Web App support
* 👤 User profiles

---

# 🏗 Tech Stack

## Frontend

| Technology          | Purpose                 |
| ------------------- | ----------------------- |
| ⚛️ React 19         | UI Framework            |
| ⚡ Vite              | Build Tool              |
| 🎨 Tailwind CSS     | Styling                 |
| 🗃 Zustand          | State Management        |
| 🖌 Fabric.js        | Canvas Engine           |
| 🔌 Socket.io Client | Real-time communication |
| 📡 Axios            | API Requests            |

---

## Backend

| Technology    | Purpose           |
| ------------- | ----------------- |
| 🟢 Node.js    | Runtime           |
| 🚂 Express.js | Backend Framework |
| 🍃 MongoDB    | Database          |
| 🧬 Mongoose   | ODM               |
| 🔌 Socket.io  | Real-time server  |
| 🔑 JWT        | Authentication    |
| 🔒 bcrypt     | Password security |
| ☁️ Cloudinary | Image storage     |

---

# 📂 Project Structure

```
SketchForge/

│
├── client/
│
│   └── src/
│       ├── canvas/          # Fabric.js drawing engine
│       ├── components/      # Reusable UI components
│       ├── pages/           # Application pages
│       ├── store/           # Zustand state
│       └── api/             # API configuration
│
│
└── server/
    
    └── src/
        ├── controllers/     # Business logic
        ├── models/         # Database models
        ├── routes/         # API routes
        ├── middleware/     # Authentication
        ├── sockets/        # Real-time events
        └── utils/          # Helper functions
```

---

# ⚙️ Installation

## Requirements

* Node.js 18+
* MongoDB / MongoDB Atlas

---

## Clone Repository

```bash
git clone https://github.com/yourusername/sketchforge.git

cd SketchForge
```

---

## Install Dependencies

```bash
npm run install:all
```

---

# 🔑 Environment Setup

Create:

```
server/.env
```

Add:

```env
PORT=4000

CLIENT_ORIGIN=http://localhost:5173

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_secret_key

OPENAI_API_KEY=your_openai_key

OPENAI_MODEL=gpt-4o-mini

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Frontend:

```
client/.env
```

```env
VITE_API_BASE_URL=http://localhost:4000
```

---

# ▶️ Run Development Server

Start frontend + backend:

```bash
npm run dev
```

Application:

```
http://localhost:5173
```

Backend:

```
http://localhost:4000
```

---

# ⌨️ Keyboard Shortcuts

| Shortcut         | Action     |
| ---------------- | ---------- |
| Ctrl + Z         | Undo       |
| Ctrl + Shift + Z | Redo       |
| Ctrl + C         | Copy       |
| Ctrl + V         | Paste      |
| Ctrl + D         | Duplicate  |
| Ctrl + G         | Group      |
| Ctrl + Shift + G | Ungroup    |
| Delete           | Remove     |
| Space + Drag     | Pan Canvas |
| Scroll           | Zoom       |

---

# 🔌 API Endpoints

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| POST   | `/api/auth/register`       | Create account      |
| POST   | `/api/auth/login`          | Login               |
| GET    | `/api/boards`              | Fetch boards        |
| POST   | `/api/boards`              | Create board        |
| PUT    | `/api/boards/:id`          | Save board          |
| POST   | `/api/ai/generate`         | Generate AI diagram |
| GET    | `/api/boards/:id/versions` | Version history     |

---

# 🚀 Deployment

## Backend

```bash
cd server

npm start
```

Required:

```
MONGODB_URI
JWT_SECRET
CLIENT_ORIGIN
```

---

## Frontend

Build:

```bash
cd client

npm run build
```

Deploy `dist` folder on:

* Vercel
* Netlify
* AWS
* Nginx

---

# 🛣 Roadmap

* [x] Drawing engine
* [x] Authentication
* [x] Real-time collaboration
* [x] Board saving
* [x] Export system

Future:

* [ ] Team workspaces
* [ ] Advanced permissions
* [ ] Mobile application
* [ ] More AI tools

---

# 🤝 Contributing

Contributions are welcome!

Steps:

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Added feature"
```

4. Push changes

```bash
git push origin feature-name
```

5. Create Pull Request

---

# 📜 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Built with ❤️ using MERN Stack
</p>

<p align="center">
  ⭐ Star this repository if you like SketchForge
</p>
