# Terra Scenik 🌿📸

**Terra Scenik** is a fully functional, production-ready full-stack social media web application built for nature photography enthusiasts. It allows users to share, discover, and engage with scenic nature content through a clean, modern, dark-themed interface.

## 🚀 Live Demo
**[Visit Terra Scenik Live](https://terra-scenik.onrender.com)**

## 🌟 Key Features

### Custom Single Page Application (SPA)
Built entirely with **Vanilla JavaScript**, avoiding heavy frontend frameworks while maintaining a highly dynamic and responsive SPA architecture. It features custom client-side routing, state management, and seamless view switching.

### Robust Authentication & User Management
- **Secure Registration:** Enforces strong password complexity (8+ characters, numbers, and special characters).
- **Session Management:** Utilizes HTTP-only cookies and secure server-side sessions.
- **Auto-Login:** Smooth session restoration handling.
- **Profile Customization:** Users can edit their profiles and upload profile pictures.

### Dual-Source Image Creation
- **Local Uploads:** Upload high-quality images directly from your device (up to 15MB) with strict MIME-type validation.
- **Unsplash Integration:** Seamlessly search and attach professional, high-res nature photos directly via the Unsplash API.

### Social Engagement
- **Dynamic Feed:** Scroll through community posts.
- **Interactive Elements:** Like posts and follow other users.
- **User Search:** Search for users or posts, with user-scoped search history that persists across sessions.

### Integrated AI Chatbot
- A built-in AI assistant to help users navigate the platform and answer questions directly from the UI.

## 🔒 Production-Grade Security
Terra Scenik was rigorously audited and hardened for live multi-user deployment:
- **Password Security:** Powered by `bcrypt` (12 salt rounds) — zero plaintext storage.
- **XSS Prevention:** Comprehensive server-side input sanitization via custom middleware.
- **CSRF Protection:** Origin and referer validation enforced on all mutable requests.
- **Rate Limiting:** Protects against brute-force and DDoS attacks (specific limits for login, registration, and general API endpoints).
- **ReDoS Prevention:** Regex escaping on all database search queries.
- **Security Headers:** Implements `helmet` for robust Content Security Policies (CSP).

## 🛠️ Technology Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (NoSQL) with compound unique indexes
- **Storage:** Multer (Local disk persistent storage)
- **Deployment:** Render.com

## 🏃‍♂️ Running Locally

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file based on `.env.local` (or standard template) and add your `MONGODB_URI`, `SESSION_SECRET`, and `UNSPLASH_KEY`.
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Visit `http://localhost:3000`.

## 📜 License
This project was created as part of a coursework submission and is open for portfolio demonstration purposes.
