// ===== КОМПОНЕНТ ГЛАВНОЙ СТРАНИЦЫ =====

class HomePage {
    constructor() {
        this.refreshInterval = null;
        this.isVisible = false;
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        // Кнопки быстрых действий
        document.addEventListener('click', (e) => {
            if (e.target.closest('#quick-income-btn')) {
                this.showQuickOperation('income');
            } else if (e.target.closest('#quick-expense-btn')) {
                this.showQuickOperation('expense');
            } else if (e.target.closest('#quick-add-goal-btn')) {
                this.showQuickGoal();
            } else if (e.target.closest('#refresh-data-btn')) {
                this.refreshData();
            }
        });

        // Отслеживание видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            } else if (!document.hidden && this.isVisible) {
                this.startAutoRefresh();
            }
        });
    }

    // Инициализация страницы
    async init() {
        this.isVisible = true;
        await this.loadData();
        this.startAutoRefresh();
        this.updateQuickStats();
    }

    // Деинициализация страницы
    destroy() {
        this.isVisible = false;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Загрузка всех данных
    async loadData() {
        this.setLoading(true);
        
        try {
            await Promise.all([
                this.loadUserCards(),
                this.loadRecentOperations(),
                this.loadUpcomingGoals(),
                this.loadMonthlyStats()
            ]);
        } catch (error) {
            helpers.log('Ошибка загрузки данных главной страницы', error, 'error');
            showToast('Ошибка загрузки данных', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Загрузка карточек пользователей
    async loadUserCards() {
        if (window.userCardsManager) {
            await window.userCardsManager.loadUserData();
        }
    }

    // Загрузка последних операций
    async loadRecentOperations() {
        const container = document.getElementById('recent-operations-list');
        if (!container) return;

        try {
            let operations = [];

            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    operations = await window.dbManager.getOperations(userData.budgetId, { 
                        limit: 5,
                        orderBy: 'date',
                        orderDirection: 'desc'
                    });
                }
            } else {
                operations = storageManager.get('operations', [])
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);
            }

            this.renderRecentOperations(operations);

        } catch (error) {
            this.renderOperationsError();
            helpers.log('Ошибка загрузки последних операций', error, 'error');
        }
    }

    // Отображение последних операций
    renderRecentOperations(operations) {
        const container = document.getElementById('recent-operations-list');
        if (!container) return;

        if (operations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>Пока нет операций</h3>
                    <p>Добавьте первую операцию, нажав на кнопку "Доход" или "Расход"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = operations.map(operation => `
            <div class="operation-item" data-id="${operation.id}">
                <div class="operation-info">
                    <div class="operation-title">
                        <i class="fas fa-${this.getCategoryIcon(operation.category)}"></i>
                        ${operation.category}
                    </div>
                    <div class="operation-details">
                        ${operation.userName || 'Пользователь'} • ${helpers.formatDate(operation.date)}
                        ${operation.description ? `• ${operation.description}` : ''}
                    </div>
                </div>
                <div class="operation-amount ${operation.type}">
                    ${operation.type === 'income' ? '+' : '-'}${currency.format(operation.amount, operation.currency || 'PLN')}
                </div>
            </div>
        `).join('');
    }

    // Отображение ошибки операций
    renderOperationsError() {
        const container = document.getElementById('recent-operations-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить операции</p>
                    <button class="btn btn-outline" onclick="homePage.loadRecentOperations()">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    // Загрузка ближайших целей
    async loadUpcomingGoals() {
        const container = document.getElementById('upcoming-goals-list');
        if (!container) return;

        try {
            let goals = [];

            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    goals = await window.dbManager.getGoals(userData.budgetId, {
                        limit: 3,
                        filter: { status: 'active' }
                    });
                }
            } else {
                goals = storageManager.get('goals', [])
                    .filter(goal => goal.status === 'active')
                    .slice(0, 3);
            }

            this.renderUpcomingGoals(goals);

        } catch (error) {
            this.renderGoalsError();
            helpers.log('Ошибка загрузки целей', error, 'error');
        }
    }

    // Отображение ближайших целей
    renderUpcomingGoals(goals) {
        const container = document.getElementById('upcoming-goals-list');
        if (!container) return;

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h3>Нет активных целей</h3>
                    <p>Поставьте себе финансовые цели для лучшего планирования</p>
                </div>
            `;
            return;
        }

        container.innerHTML = goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
            
            return `
                <div class="goal-item" data-id="${goal.id}">
                    <div class="goal-info">
                        <div class="goal-title">
                            <i class="fas fa-${goal.icon || 'star'}"></i>
                            ${goal.title}
                        </div>
                        <div class="goal-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                            <div class="progress-text">
                                ${currency.format(goal.currentAmount, goal.currency)} / ${currency.format(goal.targetAmount, goal.currency)}
                                (${progress.toFixed(1)}%)
                            </div>
                        </div>
                    </div>
                    <div class="goal-remaining">
                        Осталось: ${currency.format(remaining, goal.currency)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Отображение ошибки целей
    renderGoalsError() {
        const container = document.getElementById('upcoming-goals-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить цели</p>
                </div>
            `;
        }
    }

    // Загрузка месячной статистики
    async loadMonthlyStats() {
        try {
            const currentDate = new Date();
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            let operations = [];

            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    operations = await window.dbManager.getOperations(userData.budgetId, {
                        filter: {
                            date: {
                                from: monthStart.toISOString().split('T')[0],
                                to: monthEnd.toISOString().split('T')[0]
                            }
                        }
                    });
                }
            } else {
                operations = storageManager.get('operations', [])
                    .filter(op => {
                        const opDate = new Date(op.date);
                        return opDate >= monthStart && opDate <= monthEnd;
                    });
            }

            this.updateMonthlyStats(operations);

        } catch (error) {
            helpers.log('Ошибка загрузки месячной статистики', error, 'error');
        }
    }

    // Обновление месячной статистики
    updateMonthlyStats(operations) {
        const monthlyIncome = operations
            .filter(op => op.type === 'income')
            .reduce((sum, op) => sum + op.amount, 0);

        const monthlyExpenses = operations
            .filter(op => op.type === 'expense')
            .reduce((sum, op) => sum + op.amount, 0);

        const balance = monthlyIncome - monthlyExpenses;

        // Обновляем элементы на странице
        const incomeElement = document.getElementById('monthly-income');
        const expensesElement = document.getElementById('monthly-expenses');
        const balanceElement = document.getElementById('monthly-balance');

        if (incomeElement) {
            incomeElement.textContent = currency.format(monthlyIncome, 'PLN');
        }

        if (expensesElement) {
            expensesElement.textContent = currency.format(monthlyExpenses, 'PLN');
        }

        if (balanceElement) {
            balanceElement.textContent = currency.format(balance, 'PLN');
            balanceElement.className = `monthly-balance ${balance >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // Обновление быстрой статистики
    updateQuickStats() {
        // Обновляем количество операций
        const operationsCount = storageManager.get('operations', []).length;
        const operationsElement = document.getElementById('operations-count');
        if (operationsElement) {
            operationsElement.textContent = operationsCount;
        }

        // Обновляем количество целей
        const goalsCount = storageManager.get('goals', []).filter(g => g.status === 'active').length;
        const goalsElement = document.getElementById('goals-count');
        if (goalsElement) {
            goalsElement.textContent = goalsCount;
        }
    }

    // Показ быстрой операции
    showQuickOperation(type) {
        if (window.modalsManager) {
            window.modalsManager.showOperationModal(type);
        }
    }

    // Показ быстрой цели
    showQuickGoal() {
        if (window.modalsManager) {
            window.modalsManager.showGoalModal();
        }
    }

    // Обновление данных
    async refreshData() {
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
            }
        }

        try {
            await this.loadData();
            showToast('Данные обновлены', 'success');
        } catch (error) {
            showToast('Ошибка обновления данных', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-spin');
                }
            }
        }
    }

    // Автоматическое обновление
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Обновляем каждые 5 минут
        this.refreshInterval = setInterval(() => {
            if (this.isVisible && navigationManager.getCurrentPage() === 'home') {
                this.loadData();
            }
        }, 5 * 60 * 1000);
    }

    // Получение иконки категории
    getCategoryIcon(category) {
        const icons = {
            'Продукты': 'shopping-cart',
            'Транспорт': 'car',
            'Развлечения': 'gamepad',
            'Здоровье': 'heartbeat',
            'Образование': 'graduation-cap',
            'Дом': 'home',
            'Одежда': 'tshirt',
            'Зарплата': 'money-bill-wave',
            'Подарок': 'gift',
            'Другое': 'ellipsis-h'
        };
        return icons[category] || 'ellipsis-h';
    }

    // Управление состоянием загрузки
    setLoading(loading) {
        const page = document.getElementById('home-page');
        if (page) {
            if (loading) {
                page.classList.add('loading');
            } else {
                page.classList.remove('loading');
            }
        }
    }
}

// Создание глобального экземпляра
const homePage = new HomePage();

// Экспорт для глобального использования
window.homePage = homePage;