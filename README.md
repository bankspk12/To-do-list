# 👑 Tasknest - Executive Command Center & Intelligent Task Analytics

A world-class, Fortune 500-level Executive Task Management Command Center built with **Vanilla JavaScript (ES6+)**, featuring a **Gemini 2.0 Flash AI Copilot**, **LINE Messaging API Integration**, **Executive Vault Security (SHA-256)**, **Smart Natural Language Date Parsing**, **3-Chart Analytics Suite**, dual-engine data storage (**Firebase Cloud Firestore + LocalStorage**), and **Executive Board Report Generation**.

![Version](https://img.shields.io/badge/version-3.3--AI_Copilot-6c5ce7?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-00cec9?style=flat-square)
![Tech](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20JS--ES6%20%7C%20Firebase%20%7C%20Gemini_AI-a29bfe?style=flat-square)
![UI](https://img.shields.io/badge/design-Glassmorphism%20%7C%20Dark%20Mode-ff7675?style=flat-square)

---

## ✨ Executive Features (v3.3 Release)

### 🤖 1. AI Copilot — "Nesty" (`js/modules/ai-copilot.js`) ⭐ NEW
- 💬 **Floating AI Assistant**: A human-like AI widget at the bottom-right corner, powered by **Google Gemini 2.0 Flash**.
- 🧠 **Task-Aware Context**: Nesty automatically reads your pending tasks, priorities, and deadlines to provide intelligent advice.
- 📋 **Multi-Conversation History**: Create new chat threads, switch between conversations, and delete old ones — just like a real messaging app.
- 🌐 **General Q&A**: Ask anything — draft emails, translate text, brainstorm ideas, get general knowledge answers.
- 🎯 **Smart Suggestions**: Quick-start chips for common requests (summarize tasks, prioritize work, draft email).
- 🌙 **Theme-Aware UI**: Automatically adapts to Dark/Light mode with Glassmorphism styling.

### 💬 2. LINE Messaging API Integration ⭐ NEW
- 📌 **Create Tasks via LINE**: Type `งาน : [task name]` in LINE chat to instantly create tasks in Tasknest.
- 🎯 **Smart Priority Detection**: Append `P0`, `P1`, or `P2` to auto-set priority levels.
- 📅 **Due Date Parsing**: Include `พรุ่งนี้` to automatically set tomorrow's deadline.
- 📱 **Dual-Tab Form (Rich Menu)**: The LINE form now has 2 tabs — **Calendar** (original) and **Tasknest** (new).
- ☁️ **Real-time Sync**: Tasks created via LINE appear instantly on the Tasknest web dashboard.

### 🔒 3. Executive Vault Security (`js/modules/auth.js`)
- 🔑 **PIN/Passcode Lock Screen**: Glassmorphism numpad with SHA-256 workspace hashing.
- 🛡️ **Data Isolation**: Each unique PIN creates a completely separate, private workspace.
- 🚫 **Anti-Brute-Force**: 15-minute lockout after 5 failed attempts.
- 🔄 **Change PIN**: Seamless workspace rebind mechanism — all tasks transfer to the new PIN automatically.
- 📦 **Legacy Auto-Migration**: Existing tasks automatically migrate to the new workspace on first login.

### 📊 4. Fortune 500 C-Suite Command Center (`index.html`)
- 🟢 **Live System Health Status Pulse**: Real-time operational indicator (`OPTIMAL` / `EXCELLENT VELOCITY` / `ATTENTION REQUIRED`).
- 💎 **Executive KPI Scorecards**: Total Tasks, Completed Accomplishments, Pending Workload with P0 Count, and Velocity Index.
- 🧠 **AI Intelligence Analytics Engine**: 
  - **Velocity Health Score Algorithm (0-100)**: Automatically evaluates project health based on overdue tasks and high-priority bottlenecks.
  - **Automated AI Narrative**: Generates executive summaries ready for C-level board meetings.
  - **Smart Recommendation Chips**: Interactive risk badges and workload breakdowns.
- 📈 **3-Chart Analytics Suite (Chart.js)**:
  - **Status Distribution** (72% Doughnut Chart)
  - **Category Workload Breakdown** (Bar Chart)
  - **Priority Heatmap Analysis** (P0 - High🔴, P1 - Medium🟡, P2 - Low🟢)
- 🛡️ **Executive Priority Watchlist**: Displays high-risk overdue items and top P0 tasks for immediate executive intervention.

### 🤖 5. Smart Natural Language Date Parser (`js/modules/smart-date.js`)
- 🇹🇭 **Thai Natural Language Date Processing**: Automatically detects Thai keywords when creating tasks:
  - `"ส่งรายงานพรุ่งนี้"` ➔ Sets due date to Tomorrow.
  - `"ส่งงานอาทิตย์หน้า"` ➔ Sets due date to 7 days ahead.
  - `"สรุปงบสิ้นเดือน"` ➔ Sets due date to the last day of the current month.
- ⚡ Integrated into both the main task input and the **Quick Dump Inbox (`Ctrl+K`)**.

### 📄 6. Executive Board Report Engine (`report.html`)
- 📅 **Smart Month Filter**: Dynamically populates available months from recorded task dates.
- 📊 **Executive Workload Summary**:
  - **Section 4**: Automatically tracks upcoming 14-day high-priority deliverables.
  - **Section 5**: Identifies overdue items and unassigned deadline risk items.
- 📋 **One-Click Markdown Export**: Instant executive summary text for Slack, Email, LINE, or C-suite slide decks.
  
### ☁️ 7. Dual-Engine Data Storage (`storage-adapter.js`)
- 📦 **Offline-First LocalStorage Fallback**: Works seamlessly out of the box with zero initial configuration.
- ⚡ **Firebase Cloud Firestore**: Real-time multi-device cloud synchronization with offline persistence.
- 🔄 **Order Preservation**: Drag-and-drop custom sequence persisted across LocalStorage and Cloud Firestore documents.

### 🎨 8. Enterprise UI/UX Refinement
- 📱 **Collapsible Sidebar**: Clean compact mode with tooltips, versioning (`v3.3`), and keyboard hints.
- 👆 **Spacious Action Buttons**: Touch-friendly 40px grid layout with FontAwesome icons.

---

## 🛠️ Project Structure

```
To-do-list/
├── index.html              # Executive Command Center Dashboard (KPIs, AI & Charts)
├── tasks.html              # Task Management & Calendar page
├── report.html             # Executive Board Report page
├── css/
│   ├── styles.css          # Executive Design System, Glassmorphism, Responsive Grid
│   └── ai-copilot.css      # AI Copilot floating widget styles
├── js/
│   ├── firebase-config.js  # Firebase configuration manager
│   ├── storage-adapter.js  # Universal data layer (Firestore & LocalStorage)
│   ├── main.js             # Executive Dashboard & App Controller
│   ├── report.js           # Executive report engine logic (XSS hardened)
│   └── modules/
│       ├── ai-copilot.js   # 🤖 AI Assistant (Gemini 2.0 Flash) — NEW
│       ├── auth.js          # Executive Vault (PIN/Passcode Lock)
│       ├── theme.js        # Theme state manager (Dark / Light)
│       ├── toast.js        # Modern toast notification system
│       ├── sidebar.js      # Sidebar loader & collapsed state controller
│       ├── export.js       # Executive PDF & Excel exporters
│       ├── smart-date.js   # Natural language date parser
│       └── modals.js       # Task Edit & Quick Inbox (Ctrl+K) modals
├── img/
│   └── ai-avatar.png       # Nesty AI assistant avatar image
├── components/
│   └── sidebar.html        # Reusable sidebar navigation component
└── README.md
```

---

## 🚀 Quick Start

1. **Clone repository:**
   ```bash
   git clone https://github.com/bankspk12/To-do-list.git
   cd To-do-list
   ```

2. **Serve locally:**
   ```bash
   npx serve .
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

---

## 📝 Recent Changelog (v3.3 Release)

- 🤖 **AI Copilot "Nesty"**: Added floating AI assistant powered by Gemini 2.0 Flash with multi-conversation history, task-aware context, and general Q&A capabilities.
- 💬 **LINE Messaging API Integration**: Create tasks directly via LINE chat with smart priority (`P0`/`P1`/`P2`) and due date (`พรุ่งนี้`) detection.
- 🔒 **Executive Vault Security**: PIN-based authentication with SHA-256 workspace isolation, anti-brute-force lockout, and seamless PIN change with data migration.
- 👑 **Executive Dashboard Overhaul**: Redesigned `index.html` into a Fortune 500 Command Center featuring AI Intelligence Engine, Priority Heatmap, and Executive Watchlist.
- 🧠 **Smart Date Integration**: Implemented Thai natural language date parser into task input and `Ctrl+K` modal.
- 📊 **Report Filter Fix**: Resolved month filter dropdown dynamic population and aligned report sections with 14-day upcoming priority tasks and risk items.
- 🎨 **Action Icons Upgrade**: Replaced text/emoji task actions with modern FontAwesome 6.5.1 touch-friendly buttons.
- 🧹 **Codebase Streamlining**: Cleaned up legacy Firebase settings modal and dead code bindings.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
