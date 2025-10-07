// ===== МОДУЛЬ АУТЕНТИФИКАЦИИ =====

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticatedFlag = false;
        this.authListeners = [];
        this.init();
    }

    // Инициализация
    async init() {
        try {
            // Проверяем сохраненную сессию
            await this.checkStoredSession();
            
            // Настраиваем Firebase Auth если доступен
            if (window.firebase && window.firebase.auth) {
                this.setupFirebaseAuth();
            }

            helpers.log('AuthManager инициализирован');
        } catch (error) {
            helpers.log('Ошибка инициализации AuthManager', error, 'error');
        }
    }

    // Настройка Firebase Authentication
    setupFirebaseAuth() {
        if (!window.firebase?.auth) return;

        // Слушаем изменения состояния аутентификации
        window.firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleFirebaseUser(user);
            } else {
                await this.handleLogout();
            }
        });
    }

    // Обработка Firebase пользователя
    async handleFirebaseUser(firebaseUser) {
        try {
            this.currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                photoURL: firebaseUser.photoURL,
                budgetId: null // Будет загружен из Firestore
            };

            // Загружаем дополнительные данные пользователя
            await this.loadUserData();

            this.isAuthenticatedFlag = true;
            
            // Сохраняем сессию
            this.saveSession();

            // Уведомляем слушателей
            this.notifyAuthListeners('login', this.currentUser);

            helpers.log('Пользователь аутентифицирован', this.currentUser.email);

        } catch (error) {
            helpers.log('Ошибка обработки Firebase пользователя', error, 'error');
        }
    }

    // Проверка сохраненной сессии
    async checkStoredSession() {
        const sessionData = storageManager.get('userSession');
        if (sessionData && sessionData.expiresAt > Date.now()) {
            this.currentUser = sessionData.user;
            this.isAuthenticatedFlag = true;
            
            // Проверяем актуальность данных
            await this.validateSession();
        } else {
            // Очищаем устаревшую сессию
            this.clearSession();
        }
    }

    // Валидация сессии
    async validateSession() {
        try {
            if (window.firebase?.auth?.currentUser) {
                // Firebase сам управляет сессией
                return true;
            }

            // Для других провайдеров - дополнительная проверка
            return true;
        } catch (error) {
            helpers.log('Ошибка валидации сессии', error, 'warn');
            await this.handleLogout();
            return false;
        }
    }

    // Регистрация нового пользователя
    async register(email, password, displayName = null) {
        try {
            if (!window.firebase?.auth) {
                throw new Error('Firebase Auth не доступен');
            }

            // Создаем аккаунт
            const userCredential = await window.firebase.auth()
                .createUserWithEmailAndPassword(email, password);

            // Обновляем профиль
            if (displayName && userCredential.user) {
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
            }

            // Отправляем подтверждение email
            if (userCredential.user) {
                await userCredential.user.sendEmailVerification();
            }

            // Создаем пользовательские данные в Firestore
            await this.createUserProfile(userCredential.user);

            showToast('Аккаунт создан! Проверьте email для подтверждения.', 'success');
            return userCredential.user;

        } catch (error) {
            helpers.log('Ошибка регистрации', error, 'error');
            
            const errorMessages = {
                'auth/email-already-in-use': 'Этот email уже используется',
                'auth/invalid-email': 'Неверный формат email',
                'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
                'auth/operation-not-allowed': 'Регистрация отключена',
            };

            const message = errorMessages[error.code] || 'Ошибка регистрации';
            throw new Error(message);
        }
    }

    // Вход в систему
    async login(email, password) {
        try {
            if (!window.firebase?.auth) {
                // Эмуляция входа для демо-режима
                return await this.demoLogin(email, password);
            }

            const userCredential = await window.firebase.auth()
                .signInWithEmailAndPassword(email, password);

            showToast('Успешный вход в систему', 'success');
            return userCredential.user;

        } catch (error) {
            helpers.log('Ошибка входа', error, 'error');
            
            const errorMessages = {
                'auth/user-not-found': 'Пользователь не найден',
                'auth/wrong-password': 'Неверный пароль',
                'auth/invalid-email': 'Неверный формат email',
                'auth/user-disabled': 'Аккаунт заблокирован',
                'auth/too-many-requests': 'Слишком много попыток входа'
            };

            const message = errorMessages[error.code] || 'Ошибка входа';
            throw new Error(message);
        }
    }

    // Демо-вход (для автономного режима)
    async demoLogin(email, password) {
        // Простая проверка для демо
        const demoUsers = [
            { email: 'artur@demo.com', password: 'demo123', name: 'Artur' },
            { email: 'valeria@demo.com', password: 'demo123', name: 'Valeria' }
        ];

        const user = demoUsers.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error('Неверный email или пароль');
        }

        // Создаем демо-пользователя
        this.currentUser = {
            uid: 'demo_' + Date.now(),
            email: user.email,
            displayName: user.name,
            emailVerified: true,
            budgetId: 'demo_budget',
            isDemo: true
        };

        this.isAuthenticatedFlag = true;
        this.saveSession();
        this.notifyAuthListeners('login', this.currentUser);

        showToast('Демо-режим активирован', 'info');
        return this.currentUser;
    }

    // Выход из системы
    async logout() {
        try {
            if (window.firebase?.auth?.currentUser) {
                await window.firebase.auth().signOut();
            } else {
                await this.handleLogout();
            }

            showToast('Вы вышли из системы', 'info');

        } catch (error) {
            helpers.log('Ошибка выхода', error, 'error');
            throw new Error('Ошибка выхода из системы');
        }
    }

    // Обработка выхода
    async handleLogout() {
        this.currentUser = null;
        this.isAuthenticatedFlag = false;
        this.clearSession();
        this.notifyAuthListeners('logout', null);
    }

    // Сброс пароля
    async resetPassword(email) {
        try {
            if (!window.firebase?.auth) {
                throw new Error('Firebase Auth не доступен');
            }

            await window.firebase.auth().sendPasswordResetEmail(email);
            showToast('Инструкции по сбросу пароля отправлены на email', 'success');

        } catch (error) {
            helpers.log('Ошибка сброса пароля', error, 'error');
            
            const errorMessages = {
                'auth/user-not-found': 'Пользователь с таким email не найден',
                'auth/invalid-email': 'Неверный формат email'
            };

            const message = errorMessages[error.code] || 'Ошибка сброса пароля';
            throw new Error(message);
        }
    }

    // Смена пароля
    async changePassword(currentPassword, newPassword) {
        try {
            const user = window.firebase?.auth?.currentUser;
            if (!user) {
                throw new Error('Пользователь не аутентифицирован');
            }

            // Повторная аутентификация
            const credential = window.firebase.auth.EmailAuthProvider
                .credential(user.email, currentPassword);
            
            await user.reauthenticateWithCredential(credential);

            // Изменяем пароль
            await user.updatePassword(newPassword);

            showToast('Пароль успешно изменен', 'success');

        } catch (error) {
            helpers.log('Ошибка смены пароля', error, 'error');
            
            const errorMessages = {
                'auth/wrong-password': 'Неверный текущий пароль',
                'auth/weak-password': 'Новый пароль слишком слабый',
                'auth/requires-recent-login': 'Необходимо повторно войти в систему'
            };

            const message = errorMessages[error.code] || 'Ошибка смены пароля';
            throw new Error(message);
        }
    }

    // Создание профиля пользователя
    async createUserProfile(user) {
        try {
            if (!window.firebase?.firestore) return;

            const db = window.firebase.firestore();
            const userDoc = {
                email: user.email,
                displayName: user.displayName || user.email,
                budgetId: this.generateBudgetId(),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    currency: 'PLN',
                    theme: 'light',
                    notifications: true,
                    language: 'ru'
                }
            };

            await db.collection('users').doc(user.uid).set(userDoc);

            // Создаем начальный бюджет
            await this.createInitialBudget(userDoc.budgetId);

        } catch (error) {
            helpers.log('Ошибка создания профиля пользователя', error, 'error');
        }
    }

    // Создание начального бюджета
    async createInitialBudget(budgetId) {
        try {
            if (!window.firebase?.firestore) return;

            const db = window.firebase.firestore();
            const budgetDoc = {
                id: budgetId,
                name: 'Семейный бюджет',
                users: [this.currentUser.uid],
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    currency: 'PLN',
                    shared: false
                }
            };

            await db.collection('budgets').doc(budgetId).set(budgetDoc);

        } catch (error) {
            helpers.log('Ошибка создания начального бюджета', error, 'error');
        }
    }

    // Загрузка данных пользователя
    async loadUserData() {
        try {
            if (!this.currentUser || !window.firebase?.firestore) return;

            const db = window.firebase.firestore();
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUser.budgetId = userData.budgetId;
                this.currentUser.settings = userData.settings;
            }

        } catch (error) {
            helpers.log('Ошибка загрузки данных пользователя', error, 'error');
        }
    }

    // Подключение к общему бюджету
    async joinBudget(budgetId) {
        try {
            if (!this.currentUser || !window.firebase?.firestore) {
                throw new Error('Недоступно в автономном режиме');
            }

            const db = window.firebase.firestore();
            
            // Проверяем существование бюджета
            const budgetDoc = await db.collection('budgets').doc(budgetId).get();
            if (!budgetDoc.exists) {
                throw new Error('Бюджет не найден');
            }

            // Добавляем пользователя к бюджету
            await db.collection('budgets').doc(budgetId).update({
                users: window.firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid)
            });

            // Обновляем профиль пользователя
            await db.collection('users').doc(this.currentUser.uid).update({
                budgetId: budgetId
            });

            this.currentUser.budgetId = budgetId;
            this.saveSession();

            showToast('Успешно подключились к общему бюджету', 'success');

        } catch (error) {
            helpers.log('Ошибка подключения к бюджету', error, 'error');
            throw error;
        }
    }

    // Генерация ID бюджета
    generateBudgetId() {
        return 'budget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Сохранение сессии
    saveSession() {
        if (this.currentUser) {
            const sessionData = {
                user: this.currentUser,
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 дней
            };
            storageManager.save('userSession', sessionData);
        }
    }

    // Очистка сессии
    clearSession() {
        storageManager.remove('userSession');
    }

    // Добавление слушателя аутентификации
    addAuthListener(callback) {
        this.authListeners.push(callback);
    }

    // Удаление слушателя аутентификации
    removeAuthListener(callback) {
        const index = this.authListeners.indexOf(callback);
        if (index > -1) {
            this.authListeners.splice(index, 1);
        }
    }

    // Уведомление слушателей
    notifyAuthListeners(event, user) {
        this.authListeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                helpers.log('Ошибка в слушателе аутентификации', error, 'error');
            }
        });
    }

    // Проверка аутентификации
    isAuthenticated() {
        return this.isAuthenticatedFlag;
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }

    // Получение данных пользователя
    async getUserData() {
        if (!this.currentUser) {
            throw new Error('Пользователь не аутентифицирован');
        }

        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            budgetId: this.currentUser.budgetId,
            emailVerified: this.currentUser.emailVerified,
            isDemo: this.currentUser.isDemo || false
        };
    }

    // Обновление профиля
    async updateProfile(data) {
        try {
            if (!this.currentUser) {
                throw new Error('Пользователь не аутентифицирован');
            }

            if (window.firebase?.auth?.currentUser) {
                // Обновляем Firebase профиль
                await window.firebase.auth().currentUser.updateProfile({
                    displayName: data.displayName,
                    photoURL: data.photoURL
                });

                // Обновляем Firestore документ
                if (window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    await db.collection('users').doc(this.currentUser.uid).update(data);
                }
            }

            // Обновляем локальные данные
            Object.assign(this.currentUser, data);
            this.saveSession();

            showToast('Профиль обновлен', 'success');

        } catch (error) {
            helpers.log('Ошибка обновления профиля', error, 'error');
            throw new Error('Ошибка обновления профиля');
        }
    }

    // Удаление аккаунта
    async deleteAccount() {
        try {
            if (!this.currentUser) {
                throw new Error('Пользователь не аутентифицирован');
            }

            const user = window.firebase?.auth?.currentUser;
            if (user) {
                // Удаляем данные из Firestore
                if (window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    await db.collection('users').doc(this.currentUser.uid).delete();
                }

                // Удаляем Firebase аккаунт
                await user.delete();
            }

            await this.handleLogout();
            showToast('Аккаунт удален', 'info');

        } catch (error) {
            helpers.log('Ошибка удаления аккаунта', error, 'error');
            throw new Error('Ошибка удаления аккаунта');
        }
    }
}

// Создание глобального экземпляра
const authManager = new AuthManager();

// Экспорт для глобального использования
window.authManager = authManager;