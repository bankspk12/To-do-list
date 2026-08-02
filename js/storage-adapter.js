/**
 * StorageAdapter - Universal Data Layer (v3.1 Robust Edition)
 * - Safe async initialization with Promise resolution (prevents race conditions)
 * - Order preservation for drag & drop across LocalStorage & Cloud Firestore
 */
(function() {
    class StorageService {
        constructor() {
            this.listeners = [];
            this.db = null;
            this.isFirebaseReady = false;
            this.unsubscribeListener = null;
            this.workspaceId = this.getWorkspaceId();
            // Store initialization promise to prevent race condition
            this.readyPromise = this.initFirebase();
        }

        getWorkspaceId() {
            return (window.AuthModule && typeof window.AuthModule.getWorkspaceId === 'function')
                ? window.AuthModule.getWorkspaceId()
                : 'default_public_workspace';
        }

        setWorkspace(wsId) {
            this.workspaceId = wsId;
            if (this.unsubscribeListener) {
                this.unsubscribeListener();
                this.unsubscribeListener = null;
            }
            if (this.isFirebaseReady) {
                this.listenFirestore();
            }
            this.getTasks().then(tasks => this.notifyListeners(tasks));
        }

        async initFirebase() {
            const config = window.APP_CONFIG?.firebaseConfig;
            if (window.APP_CONFIG?.useFirebase && window.firebase) {
                try {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(config);
                    }
                    this.db = firebase.firestore();
                    try {
                        await this.db.enablePersistence({ synchronizeTabs: true });
                    } catch (err) {
                        console.warn('Firestore offline persistence notice:', err.code);
                    }
                    this.isFirebaseReady = true;
                    console.log('⚡ Connected to Cloud Firestore!');
                    this.listenFirestore();
                } catch (e) {
                    console.error('Firebase init error, fallback to LocalStorage:', e);
                    this.isFirebaseReady = false;
                }
            } else {
                console.log('📦 Using LocalStorage Engine (Firebase ready to connect anytime).');
            }
        }

        async ensureReady() {
            if (this.readyPromise) {
                await this.readyPromise;
            }
        }

        // --- Helper: Sort Tasks by Order ---
        sortTasks(tasks) {
            return tasks.sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 999999;
                const orderB = typeof b.order === 'number' ? b.order : 999999;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });
        }

        // --- Event Subscription ---
        onTasksUpdated(callback) {
            if (typeof callback === 'function') {
                this.listeners.push(callback);
            }
        }

        notifyListeners(tasks) {
            const sorted = this.sortTasks(tasks);
            this.listeners.forEach(cb => cb(sorted));
        }

        async migrateLegacyTasks(currentWs) {
            // 1. LocalStorage Migration
            const legacyLocal = localStorage.getItem('tasks');
            if (legacyLocal) {
                try {
                    const legacyTasks = JSON.parse(legacyLocal);
                    if (Array.isArray(legacyTasks) && legacyTasks.length > 0) {
                        const currentTasks = JSON.parse(localStorage.getItem(`tasks_${currentWs}`) || '[]');
                        const existingIds = new Set(currentTasks.map(t => t.id));
                        const migrated = legacyTasks.map(t => ({ ...t, workspaceId: currentWs }));
                        
                        migrated.forEach(t => {
                            if (!existingIds.has(t.id)) currentTasks.push(t);
                        });

                        localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(this.sortTasks(currentTasks)));
                        localStorage.removeItem('tasks'); // Clean up legacy key
                    }
                } catch (e) {
                    console.warn('Legacy LocalStorage migration notice:', e);
                }
            }

            // 2. Firestore Migration
            if (this.isFirebaseReady && this.db) {
                try {
                    const allSnap = await this.db.collection('tasks').get();
                    const batch = this.db.batch();
                    let needsCommit = false;

                    allSnap.forEach(doc => {
                        const data = doc.data();
                        if (!data.workspaceId || data.workspaceId === 'default_public_workspace') {
                            batch.update(doc.ref, { workspaceId: currentWs });
                            needsCommit = true;
                        }
                    });

                    if (needsCommit) {
                        await batch.commit();
                        console.log('✨ Migrated legacy Firestore tasks to workspace:', currentWs);
                    }
                } catch (e) {
                    console.warn('Firestore legacy migration notice:', e);
                }
            }
        }

        listenFirestore() {
            if (!this.db) return;
            const currentWs = this.getWorkspaceId();

            if (this.unsubscribeListener) {
                this.unsubscribeListener();
            }

            this.unsubscribeListener = this.db.collection('tasks')
                .onSnapshot((snapshot) => {
                    const tasks = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.workspaceId === currentWs || !data.workspaceId || data.workspaceId === 'default_public_workspace') {
                            tasks.push({ id: doc.id, ...data, workspaceId: currentWs });
                        }
                    });
                    const sorted = this.sortTasks(tasks);
                    localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(sorted));
                    this.notifyListeners(sorted);
                }, (error) => {
                    console.error('Firestore listener error:', error);
                });
        }

        // --- Data Access Methods ---
        async getTasks() {
            await this.ensureReady();
            const currentWs = this.getWorkspaceId();
            await this.migrateLegacyTasks(currentWs);

            let tasks = [];

            if (this.isFirebaseReady && this.db) {
                try {
                    const snapshot = await this.db.collection('tasks').get();
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.workspaceId === currentWs || !data.workspaceId || data.workspaceId === 'default_public_workspace') {
                            tasks.push({ id: doc.id, ...data, workspaceId: currentWs });
                        }
                    });
                    tasks = this.sortTasks(tasks);
                    localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(tasks));
                    return tasks;
                } catch (e) {
                    console.error('Error fetching from Firestore, returning local:', e);
                }
            }

            try {
                tasks = JSON.parse(localStorage.getItem(`tasks_${currentWs}`) || '[]');
                return this.sortTasks(tasks);
            } catch (e) {
                return [];
            }
        }

        async saveTasks(tasks) {
            await this.ensureReady();
            const currentWs = this.getWorkspaceId();
            // Assign order index and workspaceId
            const orderedTasks = tasks.map((task, idx) => ({
                ...task,
                order: idx,
                workspaceId: currentWs
            }));

            localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(orderedTasks));

            if (this.isFirebaseReady && this.db) {
                const batch = this.db.batch();
                orderedTasks.forEach(task => {
                    const ref = this.db.collection('tasks').doc(task.id);
                    batch.set(ref, task, { merge: true });
                });
                await batch.commit();
            }
            this.notifyListeners(orderedTasks);
        }

        async addTask(task) {
            await this.ensureReady();
            const tasks = await this.getTasks();
            const currentWs = this.getWorkspaceId();
            const newTask = { ...task, order: 0, workspaceId: currentWs };

            // Shift existing tasks order
            const updated = [newTask, ...tasks.map(t => ({ ...t, order: (t.order || 0) + 1 }))];
            await this.saveTasks(updated);
            return newTask;
        }

        async updateTask(id, updates) {
            await this.ensureReady();
            const tasks = await this.getTasks();
            const currentWs = this.getWorkspaceId();
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString(), workspaceId: currentWs };
                localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(tasks));

                if (this.isFirebaseReady && this.db) {
                    await this.db.collection('tasks').doc(id).update({ ...updates, workspaceId: currentWs });
                }
                this.notifyListeners(tasks);
            }
        }

        async deleteTask(id) {
            await this.ensureReady();
            let tasks = await this.getTasks();
            const currentWs = this.getWorkspaceId();
            tasks = tasks.filter(t => t.id !== id);
            localStorage.setItem(`tasks_${currentWs}`, JSON.stringify(tasks));

            if (this.isFirebaseReady && this.db) {
                await this.db.collection('tasks').doc(id).delete();
            }
            this.notifyListeners(tasks);
        }
    }

    window.storageAdapter = new StorageService();
})();
