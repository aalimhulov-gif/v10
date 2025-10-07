// ===== УПРАВЛЕНИЕ КАРТОЧКАМИ ПОЛЬЗОВАТЕЛЕЙ =====

class UserCardsManager {
    constructor() {
        this.balances = { artur: 0, valeria: 0 };
        this.stats = {
            artur: { income: 0, expense: 0 },
            valeria: { income: 0, expense: 0 }
        };
        this.currency = 'PLN';
        this.setupEventListeners();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики кнопок операций
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action][data-user]');
            if (btn) {
                const action = btn.dataset.action;
                const user = btn.dataset.user;
                this.handleOperationClick(user, action);
            }
        });
    }

    // Обработка клика по кнопке операции
    handleOperationClick(user, action) {
        if (!window.modalManager) {
            showToast('Модальные окна не инициализированы', 'error');
            return;
        }

        // Открываем модальное окно операции
        window.modalManager.showOperationModal(user, action);
    }

    // Обновление баланса пользователя
    updateBalance(userId, amount, currency = 'PLN') {
        if (!this.balances.hasOwnProperty(userId)) {
            console.error(`Неизвестный пользователь: ${userId}`);
            return;
        }

        this.balances[userId] = amount;
        this.currency = currency;
        this.renderBalance(userId);
        this.updateTotalBalance();
    }

    // Обновление статистики пользователя
    updateStats(userId, income = 0, expense = 0) {
        if (!this.stats.hasOwnProperty(userId)) {
            console.error(`Неизвестный пользователь: ${userId}`);
            return;
        }

        this.stats[userId] = { income, expense };
        this.renderStats(userId);
    }

    // Отрисовка баланса пользователя
    renderBalance(userId) {
        const balanceElement = document.getElementById(`${userId}-balance`);
        if (!balanceElement) return;

        const amount = this.balances[userId];
        const formatted = currency.format(amount, this.currency);
        const colorClass = amount >= 0 ? 'positive' : 'negative';

        balanceElement.textContent = formatted;
        balanceElement.className = `user-balance ${colorClass}`;

        // Анимация изменения
        balanceElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            balanceElement.style.transform = 'scale(1)';
        }, 200);
    }

    // Отрисовка статистики пользователя
    renderStats(userId) {
        const incomeElement = document.getElementById(`${userId}-income`);
        const expenseElement = document.getElementById(`${userId}-expense`);

        if (incomeElement) {
            incomeElement.textContent = '+' + currency.format(this.stats[userId].income, this.currency);
        }

        if (expenseElement) {
            expenseElement.textContent = '-' + currency.format(this.stats[userId].expense, this.currency);
        }
    }

    // Обновление общего баланса
    updateTotalBalance() {
        const totalElement = document.getElementById('total-balance');
        if (!totalElement) return;

        const total = this.balances.artur + this.balances.valeria;
        const formatted = currency.format(total, this.currency);
        const colorClass = total >= 0 ? 'positive' : 'negative';

        totalElement.textContent = formatted;
        totalElement.className = `balance-amount ${colorClass}`;

        // Анимация изменения
        totalElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
            totalElement.style.transform = 'scale(1)';
        }, 300);
    }

    // Загрузка данных пользователей
    async loadUserData() {
        try {
            // Попробуем загрузить из Firebase
            if (window.authManager && window.authManager.isAuthenticated()) {
                const user = window.authManager.getCurrentUser();
                const userData = await window.authManager.getUserData();
                const budgetId = userData.budgetId;

                if (window.dbManager && budgetId) {
                    // Подписываемся на изменения бюджета
                    window.dbManager.subscribeToBudget(budgetId, (budgetData) => {
                        this.handleBudgetUpdate(budgetData);
                    });

                    // Подписываемся на операции для статистики
                    window.dbManager.subscribeToOperations(budgetId, (operations) => {
                        this.calculateStats(operations);
                    });
                }
            } else {
                // Загружаем демо данные
                this.loadDemoData();
            }
        } catch (error) {
            helpers.log('Ошибка загрузки данных пользователей', error, 'error');
            this.loadDemoData();
        }
    }

    // Обработка обновления бюджета
    handleBudgetUpdate(budgetData) {
        if (!budgetData || !budgetData.balances) return;

        // Обновляем балансы
        Object.entries(budgetData.balances).forEach(([userId, balance]) => {
            const userName = this.getUserNameById(userId);
            if (userName) {
                this.updateBalance(userName, balance, budgetData.currency || 'PLN');
            }
        });
    }

    // Получение имени пользователя по ID
    getUserNameById(userId) {
        // Здесь должна быть логика сопоставления userId с именами пользователей
        // Пока используем простую логику
        const user = window.authManager.getCurrentUser();
        if (user && user.uid === userId) {
            const name = user.displayName || 'Пользователь';
            return name.toLowerCase().includes('артур') ? 'artur' : 'valeria';
        }
        return null;
    }

    // Вычисление статистики из операций
    calculateStats(operations) {
        const stats = {
            artur: { income: 0, expense: 0 },
            valeria: { income: 0, expense: 0 }
        };

        // Фильтруем операции текущего месяца
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        operations.forEach(operation => {
            const operationDate = operation.date instanceof Date 
                ? operation.date 
                : new Date(operation.date);

            if (operationDate.getMonth() === currentMonth && 
                operationDate.getFullYear() === currentYear) {
                
                const userName = this.getUserNameById(operation.userId);
                if (userName && stats[userName]) {
                    if (operation.type === 'income') {
                        stats[userName].income += operation.amount;
                    } else if (operation.type === 'expense') {
                        stats[userName].expense += operation.amount;
                    }
                }
            }
        });

        // Обновляем статистику
        Object.entries(stats).forEach(([userName, userStats]) => {
            this.updateStats(userName, userStats.income, userStats.expense);
        });
    }

    // Загрузка демо данных
    loadDemoData() {
        // Устанавливаем демо балансы
        this.updateBalance('artur', 2500.50);
        this.updateBalance('valeria', 1800.25);

        // Устанавливаем демо статистику
        this.updateStats('artur', 3000, 500.50);
        this.updateStats('valeria', 2200, 399.75);

        showToast('Загружены демо данные', 'info');
    }

    // Обновление отображения валюты
    updateCurrencyDisplay(newCurrency) {
        this.currency = newCurrency;
        
        // Перерисовываем все балансы и статистику
        Object.keys(this.balances).forEach(userId => {
            this.renderBalance(userId);
            this.renderStats(userId);
        });
        
        this.updateTotalBalance();

        // Обновляем символы валют в интерфейсе
        document.querySelectorAll('.currency-symbol').forEach(symbol => {
            symbol.textContent = currency.getCurrencySymbol(newCurrency);
        });
    }

    // Анимация добавления операции
    animateOperationAdded(userId, type, amount) {
        const card = document.querySelector(`[data-user="${userId}"]`);
        if (!card) return;

        // Создаем анимацию
        const animation = document.createElement('div');
        animation.className = `operation-animation ${type}`;
        animation.innerHTML = `
            <div class="animation-icon">
                ${type === 'income' ? '+' : '-'}${currency.format(amount, this.currency)}
            </div>
        `;

        card.appendChild(animation);

        // Удаляем анимацию через 2 секунды
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 2000);
    }

    // Обновление состояния карточек при смене темы
    updateTheme(theme) {
        const cards = document.querySelectorAll('.user-card');
        cards.forEach(card => {
            card.setAttribute('data-theme', theme);
        });
    }

    // Получение данных для экспорта
    getExportData() {
        return {
            balances: this.balances,
            stats: this.stats,
            currency: this.currency,
            timestamp: new Date().toISOString()
        };
    }

    // Импорт данных
    importData(data) {
        if (data.balances) {
            Object.entries(data.balances).forEach(([userId, balance]) => {
                this.updateBalance(userId, balance, data.currency || 'PLN');
            });
        }

        if (data.stats) {
            Object.entries(data.stats).forEach(([userId, userStats]) => {
                this.updateStats(userId, userStats.income, userStats.expense);
            });
        }
    }
}

// Создание глобального экземпляра
const userCardsManager = new UserCardsManager();

// Функции для глобального использования
window.userCardsManager = userCardsManager;
window.updateUserBalance = (userId, amount, currency) => userCardsManager.updateBalance(userId, amount, currency);
window.updateUserStats = (userId, income, expense) => userCardsManager.updateStats(userId, income, expense);
window.updateCurrencyDisplay = (currency) => userCardsManager.updateCurrencyDisplay(currency);