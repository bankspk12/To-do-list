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
            // Store initialization promise to prevent race condition
            this.readyPromise = this.initFirebase();
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

        listenFirestore() {
            if (!this.db) return;
            this.db.collection('tasks').onSnapshot((snapshot) => {
                const tasks = [];
                snapshot.forEach(doc => {
                    tasks.push({ id: doc.id, ...doc.data() });
                });
                const sorted = this.sortTasks(tasks);
                localStorage.setItem('tasks', JSON.stringify(sorted));
                this.notifyListeners(sorted);
            }, (error) => {
                console.error('Firestore listener error:', error);
            });
        }

        // --- Data Access Methods ---
        async getTasks() {
            await this.ensureReady();
            let tasks = [];
            if (this.isFirebaseReady && this.db) {
                try {
                    const snapshot = await this.db.collection('tasks').get();
                    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
                    tasks = this.sortTasks(tasks);
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    return tasks;
                } catch (e) {
                    console.error('Error fetching from Firestore, returning local:', e);
                }
            }
            try {
                tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                return this.sortTasks(tasks);
            } catch (e) {
                return [];
            }
        }

        async saveTasks(tasks) {
            await this.ensureReady();
            // Assign order index to maintain drag & drop sequence
            const orderedTasks = tasks.map((task, idx) => ({ ...task, order: idx }));
            localStorage.setItem('tasks', JSON.stringify(orderedTasks));

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
            const newTask = { ...task, order: 0 };
            
            // Shift existing tasks order
            const updated = [newTask, ...tasks.map(t => ({ ...t, order: (t.order || 0) + 1 }))];
            await this.saveTasks(updated);
            return newTask;
        }

        async updateTask(id, updates) {
            await this.ensureReady();
            const tasks = await this.getTasks();
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
                localStorage.setItem('tasks', JSON.stringify(tasks));

                if (this.isFirebaseReady && this.db) {
                    await this.db.collection('tasks').doc(id).update(updates);
                }
                this.notifyListeners(tasks);
            }
        }

        async deleteTask(id) {
            await this.ensureReady();
            let tasks = await this.getTasks();
            tasks = tasks.filter(t => t.id !== id);
            localStorage.setItem('tasks', JSON.stringify(tasks));

            if (this.isFirebaseReady && this.db) {
                await this.db.collection('tasks').doc(id).delete();
            }
            this.notifyListeners(tasks);
        }
    }

    window.storageAdapter = new StorageService();
})();
