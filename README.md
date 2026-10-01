# test-node

A RESTful API built with Express.js following **clean architecture** principles.

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL (or Supabase)

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Run Locally
```bash
node index.js
```
Then visit: http://localhost:3000/api-docs/#/

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Login and get JWT token |
| `POST` | `/logout` | Invalidate current token |

### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users` | Get all users | ✅ |
| `PUT` | `/users/:id` | Update a user | ✅ |
| `DELETE` | `/users/:id` | Delete a user | ✅ Admin only |
| `GET` | `/me` | Get current user profile | ✅ |
| `POST` | `/api/user/avatar` | Upload profile picture | ✅ |

### Roles
Available roles: `admin`, `student`, `teacher`, `parent`, `hr`, `finance`

---

## Clean Architecture

This project follows a layered architecture pattern to separate concerns:

```
Request → Middleware → Route (Controller) → Service → Repository → Database
```

### Project Structure

```
my-api/
├── config/
│   └── supabase.js              # Supabase client (initialized once)
├── db/
│   └── pool.js                  # PostgreSQL pool + schema init
├── middleware/
│   ├── auth.js                  # authenticate() + authorize() middleware
│   ├── errorHandler.js          # Centralized error handler
│   └── upload.js                # Multer config (memory, 2MB, image-only)
├── repositories/
│   ├── userRepository.js        # All user DB queries (CRUD)
│   ├── tokenRepository.js       # Token blacklist DB queries
│   └── profileRepository.js     # Profile/avatar DB queries
├── services/
│   ├── authService.js           # Signup, login, logout business logic
│   ├── userService.js           # User CRUD business logic
│   └── avatarService.js         # Avatar upload business logic
├── routes/
│   ├── auth.js                  # Thin controller (POST /signup, /login, /logout)
│   ├── users.js                 # Thin controller (GET/PUT/DELETE /users, GET /me)
│   └── avatar.js                # Thin controller (POST /api/user/avatar)
├── index.js                     # App entry point
└── websocket.js                 # WebSocket setup
```

### Layer Responsibilities

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Middleware** | Auth, validation, file upload, error handling | `authenticate()`, `authorize("admin")`, `upload.single("avatar")` |
| **Routes (Controllers)** | Parse HTTP request → call service → send response | `router.delete("/users/:id", authenticate, authorize("admin"), handler)` |
| **Services** | Business logic and validation rules | Hash passwords, verify credentials, enforce role constraints |
| **Repositories** | Raw database queries | `userRepository.findByEmail(email)` |
| **Config** | External service clients | Supabase client initialization |

### Data Flow

```
┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │────▶│ Middleware  │────▶│   Route /   │────▶│   Service   │────▶│Repository│
│ (Request)│     │(auth,upload)│     │ Controller  │     │(biz logic)  │     │  (SQL)   │
└──────────┘     └────────────┘     └─────────────┘     └─────────────┘     └────┬─────┘
                                                                                 │
                                                                           ┌─────▼─────┐
                                                                           │  Database  │
                                                                           │ (Postgres) │
                                                                           └───────────┘
```

### Key Design Decisions

#### 1. Reusable Auth Middleware
JWT verification is handled once in `middleware/auth.js` instead of being duplicated across routes:
```js
// One line protects any route
router.delete("/users/:id", authenticate, authorize("admin"), handler);
```

#### 2. Thin Controllers
Route handlers only handle HTTP concerns (~5 lines each):
```js
router.post("/signup", async (req, res) => {
    try {
        const user = await authService.signup(req.body);
        broadcast({ type: "new_signup", user });
        res.status(201).json({ message: "User created successfully", user });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Server error" });
    }
});
```

#### 3. Repository Pattern
No raw SQL in routes or services. All queries go through repository functions:
```js
// Service calls repository — never touches SQL directly
const user = await userRepository.findByEmail(email);
const deleted = await userRepository.deleteById(id);
```

#### 4. Centralized Error Handling
A single error handler middleware in `index.js` catches multer errors and unhandled exceptions.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT (jsonwebtoken)
- **File Upload**: Multer + Supabase Storage
- **API Docs**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Real-time**: WebSocket (ws)
