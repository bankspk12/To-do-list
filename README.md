# ✅ Todo App — Modern Task Manager

A sleek, feature-rich To-Do application built with **Vanilla JavaScript**, designed with a modern glassmorphism UI and dark-mode-first approach.

![Version](https://img.shields.io/badge/version-2.0-6c5ce7?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-00cec9?style=flat-square)
![Tech](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-a29bfe?style=flat-square)

---

## ✨ Features

### Core

- ➕ **Add / Edit / Delete Tasks** — Full CRUD with an elegant edit modal.
- ✅ **Mark Complete** — Toggle task status with a single click.
- 🏷️ **Categorize** — Organize by Work, Personal, Homework, or Other.
- 🎯 **Priority Levels** — High, Medium, Low with color-coded indicators.
- 📅 **Due Dates** — Set deadlines for every task.

### New in v2.0

- 🔍 **Real-time Search** — Instantly filter tasks as you type.
- ✏️ **Edit Task Modal** — Modify any field of an existing task via a popup modal.
- ⏰ **Due Date Alerts** — Visual warnings for overdue, due today, or due soon (within 3 days).
- 🖐️ **Drag & Drop Reorder** — Rearrange tasks by dragging them up or down.
- 📊 **Progress Bar** — Live progress tracker showing how many tasks are completed.
- 📅 **Calendar View** — Toggle between list and calendar view to see tasks on a monthly calendar (Thai month names & Buddhist Era year).

### Dashboard & Export

- 📈 **Dashboard** — Overview statistics with interactive Chart.js graphs (Doughnut + Bar).
- 📄 **Export to PDF** — Download your task list or dashboard as a PDF.
- 📊 **Export to Excel** — Download as an `.xlsx` spreadsheet.

### UI/UX

- 🌙 **Dark / Light Mode** — Toggle theme with a single click; preference is saved.
- 💎 **Glassmorphism Design** — Modern frosted-glass UI with gradient accents.
- 🎨 **Smooth Animations** — Fade-in, hover effects, and a shimmering progress bar.
- 📱 **Responsive** — Works on desktop, tablet, and mobile.
- 💾 **Local Storage** — All data is saved in your browser. No server required.

---

## 🛠️ Tech Stack

| Layer        | Technology                                                      |
| ------------ | --------------------------------------------------------------- |
| Structure    | HTML5                                                           |
| Styling      | CSS3 (Custom Properties, Grid, Flexbox, Animations)             |
| Logic        | JavaScript (ES6+, IIFE pattern)                                 |
| Charts       | [Chart.js](https://www.chartjs.org/)                            |
| PDF Export   | [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)         |
| Excel Export | [SheetJS (xlsx)](https://sheetjs.com/)                          |
| Icons        | [Font Awesome 6](https://fontawesome.com/)                      |
| Font         | [Inter (Google Fonts)](https://fonts.google.com/specimen/Inter) |

---

## 🚀 Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/bankspk12/To-do-list.git
   cd To-do-list
   ```

2. **Run locally** (recommended to avoid CORS issues with sidebar fetch):

   ```bash
   npx serve .
   ```

3. **Open in your browser:**
   ```
   http://localhost:3000
   ```

> 💡 You can also open `index.html` directly, but the sidebar component may not load due to browser security (CORS) restrictions on `file://` protocol.

---

## 📁 Project Structure

```
To-do-list/
├── index.html              # Dashboard page
├── tasks.html              # Task management page
├── css/
│   └── styles.css          # All styles (variables, layout, components)
├── js/
│   └── main.js             # All application logic
├── components/
│   └── sidebar.html        # Reusable sidebar navigation
└── README.md
```

---

## 📝 Changelog

### v2.0 (2026-02-17)

- ✅ Added: Real-time search
- ✅ Added: Edit task modal
- ✅ Added: Due date warnings (overdue / today / soon)
- ✅ Added: Drag & drop task reordering
- ✅ Added: Progress bar with animation
- ✅ Added: Calendar view (Thai months + Buddhist Era)
- 🔧 Fixed: XSS vulnerability (switched from innerHTML to createElement)
- 🔧 Fixed: Nav active state not updating on page change
- 🎨 Redesigned: Complete UI overhaul with glassmorphism and modern color palette
- 🎨 Redesigned: Dark mode as default theme

### v1.0

- Initial release with basic task management, dashboard, charts, and export features.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
