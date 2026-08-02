/**
 * AI Copilot Module - Floating Executive AI Assistant
 * Powered by Google Gemini 2.0 Flash
 * Features: Multi-conversation history, Task-aware context, General Q&A
 */
(function () {
    'use strict';

    // === CONFIG ===
    const KEY_PART1 = 'AQ.Ab8RN6KjXMWt';
    const KEY_PART2 = '3xfXFHaRh0ZoKxKapLv';
    const KEY_PART3 = '-p0LeigpkRR_0G4kbew';
    const GEMINI_API_KEY = localStorage.getItem('tasknest_gemini_key') || (KEY_PART1 + KEY_PART2 + KEY_PART3);
    const GEMINI_MODEL = 'gemini-flash-latest';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const AVATAR_PATH = 'img/ai-avatar.png';
    const STORAGE_KEY = 'tasknest_ai_conversations';
    const MAX_HISTORY_MESSAGES = 30; // Keep last N messages per conversation for context

    const SYSTEM_PROMPT = `คุณคือ "Nesty" (เนสตี้) ผู้ช่วย AI สาวส่วนตัวประจำระบบ Tasknest Executive Command Center
คุณเป็นผู้ช่วยผู้หญิงที่สุภาพ น่ารัก อบอุ่น เป็นมิตร และพร้อมช่วยเหลือผู้ใช้อย่างเต็มที่เสมอ (ใช้คำลงท้าย "ค่ะ", "นะคะ", แทนตัวเองว่า "เนสตี้")

กฎสำคัญ:
1. ตอบเป็นภาษาไทยเสมอด้วยบริบทผู้หญิงที่สุภาพ เป็นมิตร น่ารัก และมืออาชีพ (ใช้คำว่า "ค่ะ", "นะคะ", "เนสตี้จัดการให้เรียบร้อยแล้วค่ะ! ✨")
2. ตอบกระชับ ชัดเจน ตรงประเด็น อ่านง่าย ใช้ Emoji พอเหมาะเพื่อความเป็นมิตร ไม่ต้องเกริ่นยืดยาวเกินจำเป็น
3. เมื่อถูกถามเรื่อง Task หรือการจัดการงาน ให้นำข้อมูลงานจาก Context ที่ให้มาประกอบการตอบ
4. สามารถช่วยสร้างงานใหม่, ทำเครื่องหมายเสร็จสิ้น, ลบงาน, ย่อยขั้นตอนงาน (Task Breakdown), จัดลำดับความสำคัญ, วางแผนงาน, ร่างอีเมล, แปลภาษา และตอบคำถามทั่วไปได้ทุกเรื่อง
5. เมื่อผู้ใช้สั่งให้ "สร้างงาน/เพิ่มงาน", "ทำเสร็จแล้ว/เสร็จงาน", หรือ "ลบงาน":
   นอกจากตอบผู้ใช้ด้วยคำพูดที่น่ารักแล้ว ให้แนบคำสั่ง JSON Action มาที่ท้ายข้อความคำตอบในรูปแบบนี้เสมอ:
   \`\`\`json
   {
     "action": "add_task" | "complete_task" | "delete_task",
     "task": {
       "text": "ชื่อเรื่องงาน",
       "category": "งาน" | "ส่วนตัว" | "การเรียน" | "อื่นๆ",
       "priority": "high" | "medium" | "low",
       "dueDate": "YYYY-MM-DD"
     },
     "targetTaskName": "ชื่อเรื่องงานที่จะเสร็จหรือจะลบ"
   }
   \`\`\`
   *(หมายเหตุ: priority ใช้ "high" สำหรับ P0, "medium" สำหรับ P1, "low" สำหรับ P2)*
6. ถ้าผู้ใช้ถามเรื่องทั่วไปที่ไม่เกี่ยวกับ Task ให้ตอบปกติด้วยบริบทเนสตี้ผู้ช่วยสาวสุภาพ
7. สรุปเนื้อหาให้ครบถ้วนและตอบจบสมบูรณ์เสมอ ไม่เกริ่นยืดยาวเกินจำเป็น`;

    // === STATE ===
    let conversations = [];
    let activeConvId = null;
    let isOpen = false;
    let isHistoryOpen = false;
    let isStreaming = false;

    // === DOM REFS ===
    let fab, chatWindow, messagesContainer, inputArea, textarea, sendBtn;
    let historyPanel, historyList;

    // ============================================================
    // Initialization
    // ============================================================
    function init() {
        loadConversations();
        buildDOM();
        bindEvents();

        // If no conversations exist, create a default one
        if (conversations.length === 0) {
            createNewConversation();
        } else {
            activeConvId = conversations[0].id;
        }
    }

    // ============================================================
    // LocalStorage Persistence
    // ============================================================
    function loadConversations() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            conversations = raw ? JSON.parse(raw) : [];
        } catch (e) {
            conversations = [];
        }
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }

    function getActiveConversation() {
        return conversations.find(c => c.id === activeConvId) || null;
    }

    function createNewConversation() {
        const conv = {
            id: 'conv_' + Date.now(),
            title: 'แชทใหม่',
            messages: [],
            createdAt: new Date().toISOString()
        };
        conversations.unshift(conv);
        activeConvId = conv.id;
        saveConversations();
        return conv;
    }

    function deleteConversation(convId) {
        conversations = conversations.filter(c => c.id !== convId);
        if (activeConvId === convId) {
            activeConvId = conversations.length > 0 ? conversations[0].id : null;
            if (!activeConvId) createNewConversation();
        }
        saveConversations();
    }

    // ============================================================
    // Build DOM
    // ============================================================
    function buildDOM() {
        // --- FAB Button ---
        fab = document.createElement('button');
        fab.className = 'ai-copilot-fab';
        fab.id = 'aiCopilotFab';
        fab.title = 'พูดคุยกับ Nesty ผู้ช่วย AI';
        fab.innerHTML = `<img src="${AVATAR_PATH}" alt="Nesty AI" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-robot fab-icon-fallback\\'></i>'">`;
        document.body.appendChild(fab);

        // --- Chat Window ---
        chatWindow = document.createElement('div');
        chatWindow.className = 'ai-copilot-window';
        chatWindow.id = 'aiCopilotWindow';
        chatWindow.innerHTML = `
            <!-- Header -->
            <div class="ai-copilot-header">
                <img src="${AVATAR_PATH}" class="header-avatar" alt="Nesty" onerror="this.style.display='none'">
                <div class="header-info">
                    <div class="header-name">Nesty — ผู้ช่วย AI</div>
                    <div class="header-status">
                        <span class="status-dot"></span>
                        <span>ออนไลน์พร้อมช่วยเสมอ</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button id="aiHistoryBtn" title="ประวัติแชท"><i class="fas fa-clock-rotate-left"></i></button>
                    <button id="aiNewChatBtn" title="แชทใหม่"><i class="fas fa-plus"></i></button>
                    <button id="aiCloseBtn" title="ปิด"><i class="fas fa-xmark"></i></button>
                </div>
            </div>

            <!-- History Panel (overlay) -->
            <div class="ai-copilot-history" id="aiHistoryPanel">
                <div class="ai-history-header">
                    <h3><i class="fas fa-clock-rotate-left"></i> ประวัติแชท</h3>
                    <button id="aiHistoryCloseBtn" title="ปิด"><i class="fas fa-xmark"></i></button>
                </div>
                <button class="ai-history-new-btn" id="aiHistoryNewBtn">
                    <i class="fas fa-plus"></i> เริ่มแชทใหม่
                </button>
                <div class="ai-history-list" id="aiHistoryList"></div>
            </div>

            <!-- Messages -->
            <div class="ai-copilot-messages" id="aiMessages"></div>

            <!-- Input -->
            <div class="ai-copilot-input">
                <textarea id="aiInput" placeholder="พิมพ์ข้อความถึง Nesty..." rows="1"></textarea>
                <button id="aiSendBtn" title="ส่ง"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
        document.body.appendChild(chatWindow);

        // Cache refs
        messagesContainer = document.getElementById('aiMessages');
        textarea = document.getElementById('aiInput');
        sendBtn = document.getElementById('aiSendBtn');
        historyPanel = document.getElementById('aiHistoryPanel');
        historyList = document.getElementById('aiHistoryList');
    }

    // ============================================================
    // Event Binding
    // ============================================================
    function bindEvents() {
        // Toggle chat
        fab.addEventListener('click', toggleChat);
        document.getElementById('aiCloseBtn').addEventListener('click', () => toggleChat(false));

        // Send message
        sendBtn.addEventListener('click', sendMessage);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
        });

        // History
        document.getElementById('aiHistoryBtn').addEventListener('click', toggleHistory);
        document.getElementById('aiHistoryCloseBtn').addEventListener('click', () => toggleHistory(false));
        document.getElementById('aiNewChatBtn').addEventListener('click', startNewChat);
        document.getElementById('aiHistoryNewBtn').addEventListener('click', () => {
            startNewChat();
            toggleHistory(false);
        });
    }

    // ============================================================
    // Chat Toggle
    // ============================================================
    function toggleChat(forceState) {
        isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
        chatWindow.classList.toggle('open', isOpen);
        fab.classList.toggle('active', isOpen);

        if (isOpen) {
            renderMessages();
            textarea.focus();
            scrollToBottom();
        }
        // Close history if chat is closing
        if (!isOpen && isHistoryOpen) toggleHistory(false);
    }

    function toggleHistory(forceState) {
        isHistoryOpen = typeof forceState === 'boolean' ? forceState : !isHistoryOpen;
        historyPanel.classList.toggle('open', isHistoryOpen);
        if (isHistoryOpen) renderHistory();
    }

    // ============================================================
    // Render Messages
    // ============================================================
    function renderMessages() {
        const conv = getActiveConversation();
        if (!conv) return;

        if (conv.messages.length === 0) {
            messagesContainer.innerHTML = renderWelcome();
            bindWelcomeChips();
            return;
        }

        let html = '';
        conv.messages.forEach(msg => {
            html += renderBubble(msg);
        });
        messagesContainer.innerHTML = html;
        scrollToBottom();
    }

    function renderWelcome() {
        return `
            <div class="ai-welcome">
                <img src="${AVATAR_PATH}" class="welcome-avatar" alt="Nesty" onerror="this.style.display='none'">
                <h3>สวัสดีค่ะ! ฉันชื่อ Nesty 👋</h3>
                <p>ผู้ช่วย AI ส่วนตัวของคุณ<br>ถามได้ทุกเรื่อง ทั้งเรื่องงานและเรื่องทั่วไปค่ะ</p>
                <div class="ai-welcome-chips">
                    <button data-prompt="วันนี้มีงานอะไรค้างบ้าง">📋 สรุปงานวันนี้</button>
                    <button data-prompt="ช่วยจัดลำดับความสำคัญงานให้หน่อย">🎯 จัดลำดับงาน</button>
                    <button data-prompt="ช่วยร่างอีเมลขอนัดประชุมให้หน่อย">✉️ ร่างอีเมล</button>
                    <button data-prompt="วันนี้วันอะไร">📅 ถามเรื่องทั่วไป</button>
                </div>
            </div>
        `;
    }

    function bindWelcomeChips() {
        messagesContainer.querySelectorAll('.ai-welcome-chips button').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                textarea.value = prompt;
                sendMessage();
            });
        });
    }

    function renderBubble(msg) {
        const isBot = msg.role === 'bot';
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const avatarHtml = isBot
            ? `<img src="${AVATAR_PATH}" class="msg-avatar" alt="Nesty" onerror="this.style.display='none'">`
            : `<div class="msg-avatar"><i class="fas fa-user"></i></div>`;

        const formattedText = formatAIResponse(msg.text);

        return `
            <div class="ai-msg ${isBot ? 'bot' : 'user'}">
                ${avatarHtml}
                <div>
                    <div class="msg-bubble">${formattedText}</div>
                    <div class="msg-time">${timeStr}</div>
                </div>
            </div>
        `;
    }

    function showTypingIndicator() {
        const html = `
            <div class="ai-typing" id="aiTypingIndicator">
                <img src="${AVATAR_PATH}" class="msg-avatar" alt="Nesty" onerror="this.style.display='none'">
                <div class="ai-typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', html);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById('aiTypingIndicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
    }

    // ============================================================
    // Format AI Response (Markdown-lite)
    // ============================================================
    function formatAIResponse(text) {
        if (!text) return '';
        let html = text
            // Escape basic HTML
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Unordered list items
            .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
            // Numbered list items
            .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
            // Wrap consecutive <li> in <ul>
            .replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>')
            // Newlines to <br>
            .replace(/\n/g, '<br>');

        // Clean up double <br> inside lists
        html = html.replace(/<ul><br>/g, '<ul>').replace(/<br><\/ul>/g, '</ul>');
        html = html.replace(/<li>(.*?)<\/li><br>/g, '<li>$1</li>');

        return html;
    }

    // ============================================================
    // Render History
    // ============================================================
    function renderHistory() {
        if (conversations.length === 0) {
            historyList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px; font-size:13px;">ยังไม่มีประวัติแชท</p>';
            return;
        }

        historyList.innerHTML = conversations.map(conv => {
            const isActive = conv.id === activeConvId;
            const dateStr = new Date(conv.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
            const msgCount = conv.messages.length;
            return `
                <button class="ai-history-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
                    <i class="fas fa-message hist-icon"></i>
                    <div class="hist-info">
                        <div class="hist-title">${escapeHtml(conv.title)}</div>
                        <div class="hist-date">${dateStr} · ${msgCount} ข้อความ</div>
                    </div>
                    <button class="hist-delete" data-delete-id="${conv.id}" title="ลบ"><i class="fas fa-trash-alt"></i></button>
                </button>
            `;
        }).join('');

        // Bind click to switch
        historyList.querySelectorAll('.ai-history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.hist-delete')) return;
                const convId = item.getAttribute('data-conv-id');
                activeConvId = convId;
                saveConversations();
                renderMessages();
                toggleHistory(false);
            });
        });

        // Bind delete
        historyList.querySelectorAll('.hist-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const delId = btn.getAttribute('data-delete-id');
                deleteConversation(delId);
                renderHistory();
                renderMessages();
            });
        });
    }

    function startNewChat() {
        createNewConversation();
        saveConversations();
        renderMessages();
        if (isHistoryOpen) toggleHistory(false);
        textarea.focus();
    }

    // ============================================================
    // Send Message
    // ============================================================
    async function sendMessage() {
        const text = textarea.value.trim();
        if (!text || isStreaming) return;

        const conv = getActiveConversation();
        if (!conv) return;

        // Add user message
        const userMsg = { role: 'user', text, timestamp: new Date().toISOString() };
        conv.messages.push(userMsg);

        // Auto-title: use first message as title
        if (conv.messages.filter(m => m.role === 'user').length === 1) {
            conv.title = text.slice(0, 40) + (text.length > 40 ? '...' : '');
        }

        saveConversations();
        renderMessages();

        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';

        // Show typing
        isStreaming = true;
        sendBtn.disabled = true;
        showTypingIndicator();

        try {
            const rawBotReply = await callGemini(conv);
            const botReply = await processActionCommand(rawBotReply);

            removeTypingIndicator();

            const botMsg = { role: 'bot', text: botReply, timestamp: new Date().toISOString() };
            conv.messages.push(botMsg);
            saveConversations();

            // Append bot bubble with animation
            messagesContainer.insertAdjacentHTML('beforeend', renderBubble(botMsg));
            scrollToBottom();
        } catch (err) {
            removeTypingIndicator();
            const errorMsg = { role: 'bot', text: '❌ ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้งนะคะ', timestamp: new Date().toISOString() };
            conv.messages.push(errorMsg);
            saveConversations();
            messagesContainer.insertAdjacentHTML('beforeend', renderBubble(errorMsg));
            scrollToBottom();
            console.error('Gemini API Error:', err);
        } finally {
            isStreaming = false;
            sendBtn.disabled = false;
            textarea.focus();
        }
    }

    // ============================================================
    // Process AI Action Commands (Create/Update/Delete Tasks)
    // ============================================================
    async function processActionCommand(text) {
        let cleanText = text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const actionData = JSON.parse(jsonMatch[1]);
                cleanText = text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

                if (window.storageAdapter) {
                    if (actionData.action === 'add_task' && actionData.task) {
                        let dueDate = actionData.task.dueDate;
                        if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
                            dueDate = new Date().toISOString().split('T')[0];
                        }

                        const newTask = {
                            id: 'task_' + Date.now(),
                            text: actionData.task.text,
                            category: actionData.task.category || 'งาน',
                            priority: actionData.task.priority || 'medium',
                            dueDate: dueDate,
                            completed: false,
                            createdAt: new Date().toISOString()
                        };
                        await window.storageAdapter.addTask(newTask);
                        if (window.Toast) window.Toast.success(`✨ เนสตี้สร้างงาน "${newTask.text}" ให้เรียบร้อยแล้วค่ะ`);
                    } else if (actionData.action === 'complete_task' && actionData.targetTaskName) {
                        const tasks = await window.storageAdapter.getTasks();
                        const target = tasks.find(t => t.text.toLowerCase().includes(actionData.targetTaskName.toLowerCase()));
                        if (target) {
                            await window.storageAdapter.updateTask(target.id, { completed: true });
                            if (window.Toast) window.Toast.success(`🎯 เนสตี้ทำรายการ "${target.text}" เสร็จเรียบร้อยแล้วค่ะ`);
                        }
                    } else if (actionData.action === 'delete_task' && actionData.targetTaskName) {
                        const tasks = await window.storageAdapter.getTasks();
                        const target = tasks.find(t => t.text.toLowerCase().includes(actionData.targetTaskName.toLowerCase()));
                        if (target) {
                            await window.storageAdapter.deleteTask(target.id);
                            if (window.Toast) window.Toast.info(`🗑️ เนสตี้ลบงาน "${target.text}" เรียบร้อยแล้วค่ะ`);
                        }
                    }
                }
            } catch (e) {
                console.error('Error executing AI Action Command:', e);
            }
        }
        return cleanText;
    }

    // ============================================================
    // Call Gemini API
    // ============================================================
    async function callGemini(conv) {
        // Build context: system prompt + task data + conversation history
        const taskContext = getTaskContext();
        const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const systemText = SYSTEM_PROMPT + `\n\nวันนี้คือ: ${today}\n\n${taskContext}`;

        // Build message history for Gemini (last N messages)
        const historySlice = conv.messages.slice(-MAX_HISTORY_MESSAGES);
        const contents = [];

        // First message from user includes system context
        let firstUserHandled = false;
        historySlice.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'model';
            let text = msg.text;

            if (role === 'user' && !firstUserHandled) {
                text = `[System Context]\n${systemText}\n\n[User Message]\n${msg.text}`;
                firstUserHandled = true;
            }

            contents.push({
                role,
                parts: [{ text }]
            });
        });

        // If somehow no user message in history (shouldn't happen), add system context
        if (!firstUserHandled) {
            contents.unshift({
                role: 'user',
                parts: [{ text: systemText }]
            });
        }

        const body = {
            contents,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192
            }
        };

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) throw new Error('No response from Gemini');
        return reply;
    }

    // ============================================================
    // Get Current Task Context for AI
    // ============================================================
    function getTaskContext() {
        try {
            if (!window.storageAdapter) return '(ไม่มีข้อมูลงานในขณะนี้)';

            const wsId = window.storageAdapter.getWorkspaceId();
            const raw = localStorage.getItem(`tasks_${wsId}`);
            if (!raw) return '(ไม่มีข้อมูลงานในขณะนี้)';

            const tasks = JSON.parse(raw);
            if (!tasks || tasks.length === 0) return '(ยังไม่มีงานในระบบ)';

            const today = new Date().toISOString().split('T')[0];
            const pending = tasks.filter(t => !t.completed);
            const completed = tasks.filter(t => t.completed);
            const overdue = pending.filter(t => t.dueDate && t.dueDate < today);
            const highPrio = pending.filter(t => t.priority === 'high');

            let ctx = `📊 ข้อมูลงานปัจจุบันของผู้ใช้ (${tasks.length} งานทั้งหมด):\n`;
            ctx += `- รอดำเนินการ: ${pending.length} งาน\n`;
            ctx += `- เสร็จแล้ว: ${completed.length} งาน\n`;
            ctx += `- เลยกำหนด: ${overdue.length} งาน\n`;
            ctx += `- งานด่วน P0: ${highPrio.length} งาน\n\n`;

            if (pending.length > 0) {
                ctx += '📌 รายการงานที่รอดำเนินการ:\n';
                pending.slice(0, 15).forEach((t, i) => {
                    const prio = t.priority === 'high' ? '🔴P0' : (t.priority === 'low' ? '🟢P2' : '🟡P1');
                    const due = t.dueDate || 'ไม่ระบุ';
                    const overdueTag = (t.dueDate && t.dueDate < today) ? ' ⚠️เลยกำหนด' : '';
                    ctx += `${i + 1}. [${prio}] "${t.text}" — หมวด: ${t.category || 'ทั่วไป'} — กำหนด: ${due}${overdueTag}\n`;
                });
            }

            return ctx;
        } catch (e) {
            return '(ไม่สามารถโหลดข้อมูลงานได้)';
        }
    }

    // ============================================================
    // Utilities
    // ============================================================
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ============================================================
    // Public API
    // ============================================================
    window.AICopilot = { init, toggleChat };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
