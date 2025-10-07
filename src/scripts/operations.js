// ===== МОДУЛЬ УПРАВЛЕНИЯ ОПЕРАЦИЯМИ =====

class OperationsManager {
    constructor() {
        this.operations = [];
        this.listeners = [];
        this.categories = [];
    }

    // Инициализация
    async init() {
        try {
            await this.loadOperations();
            await this.loadCategories();
            helpers.log('OperationsManager инициализирован');
        } catch (error) {
            helpers.log('Ошибка инициализации OperationsManager', error, 'error');
        }
    }

    // Загрузка операций
    async loadOperations() {
        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    this.operations = await window.dbManager.getOperations(userData.budgetId);
                }
            } else {
                this.operations = storageManager.get('operations', []);
            }

            this.notifyListeners('operationsLoaded', this.operations);
        } catch (error) {
            helpers.log('Ошибка загрузки операций', error, 'error');
            this.operations = [];
        }
    }

    // Загрузка категорий
    async loadCategories() {
        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    this.categories = await window.dbManager.getCategories(userData.budgetId);
                }
            } else {
                this.categories = storageManager.get('categories', []);
            }
        } catch (error) {
            helpers.log('Ошибка загрузки категорий', error, 'error');
            this.categories = [];
        }
    }

    // Добавление операции
    async addOperation(operationData) {
        try {
            // Валидация данных
            this.validateOperationData(operationData);

            // Создаем операцию
            const operation = {
                id: operationData.id || helpers.generateId(),
                type: operationData.type,
                category: operationData.category,
                amount: parseFloat(operationData.amount),
                currency: operationData.currency || 'PLN',
                description: operationData.description || '',
                date: operationData.date || new Date().toISOString().split('T')[0],
                userName: operationData.userName || this.getCurrentUserName(),
                userId: operationData.userId || this.getCurrentUserId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Сохраняем операцию
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                operation.budgetId = userData.budgetId;
                await window.dbManager.addOperation(operation);
            } else {
                const operations = storageManager.get('operations', []);
                operations.push(operation);
                storageManager.save('operations', operations);
            }

            // Обновляем локальный массив
            this.operations.push(operation);

            // Уведомляем слушателей
            this.notifyListeners('operationAdded', operation);

            // Обновляем связанные данные
            await this.updateRelatedData(operation);

            helpers.log('Операция добавлена', operation);
            return operation;

        } catch (error) {
            helpers.log('Ошибка добавления операции', error, 'error');
            throw error;
        }
    }

    // Обновление операции
    async updateOperation(operationId, updateData) {
        try {
            const existingOperation = this.operations.find(op => op.id === operationId);
            if (!existingOperation) {
                throw new Error('Операция не найдена');
            }

            // Валидация данных
            this.validateOperationData(updateData, false);

            // Создаем обновленную операцию
            const updatedOperation = {
                ...existingOperation,
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            // Сохраняем изменения
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.updateOperation(updatedOperation);
            } else {
                const operations = storageManager.get('operations', []);
                const index = operations.findIndex(op => op.id === operationId);
                if (index !== -1) {
                    operations[index] = updatedOperation;
                    storageManager.save('operations', operations);
                }
            }

            // Обновляем локальный массив
            const localIndex = this.operations.findIndex(op => op.id === operationId);
            if (localIndex !== -1) {
                this.operations[localIndex] = updatedOperation;
            }

            // Уведомляем слушателей
            this.notifyListeners('operationUpdated', updatedOperation);

            // Обновляем связанные данные
            await this.updateRelatedData(updatedOperation);

            helpers.log('Операция обновлена', updatedOperation);
            return updatedOperation;

        } catch (error) {
            helpers.log('Ошибка обновления операции', error, 'error');
            throw error;
        }
    }

    // Удаление операции
    async deleteOperation(operationId) {
        try {
            const operation = this.operations.find(op => op.id === operationId);
            if (!operation) {
                throw new Error('Операция не найдена');
            }

            // Удаляем операцию
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.deleteOperation(operationId);
            } else {
                const operations = storageManager.get('operations', []);
                const updatedOperations = operations.filter(op => op.id !== operationId);
                storageManager.save('operations', updatedOperations);
            }

            // Обновляем локальный массив
            this.operations = this.operations.filter(op => op.id !== operationId);

            // Уведомляем слушателей
            this.notifyListeners('operationDeleted', operation);

            helpers.log('Операция удалена', operation);
            return true;

        } catch (error) {
            helpers.log('Ошибка удаления операции', error, 'error');
            throw error;
        }
    }

    // Получение операций с фильтрами
    getOperations(filters = {}) {
        let filtered = [...this.operations];

        // Фильтр по типу
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(op => op.type === filters.type);
        }

        // Фильтр по категории
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(op => op.category === filters.category);
        }

        // Фильтр по пользователю
        if (filters.user && filters.user !== 'all') {
            filtered = filtered.filter(op => op.userName === filters.user);
        }

        // Фильтр по дате
        if (filters.dateFrom) {
            filtered = filtered.filter(op => op.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            filtered = filtered.filter(op => op.date <= filters.dateTo);
        }

        // Фильтр по сумме
        if (filters.amountFrom !== undefined) {
            filtered = filtered.filter(op => op.amount >= filters.amountFrom);
        }
        if (filters.amountTo !== undefined) {
            filtered = filtered.filter(op => op.amount <= filters.amountTo);
        }

        // Поиск по тексту
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(op => 
                op.category.toLowerCase().includes(searchLower) ||
                (op.description && op.description.toLowerCase().includes(searchLower)) ||
                (op.userName && op.userName.toLowerCase().includes(searchLower))
            );
        }

        // Сортировка
        if (filters.sortBy) {
            filtered.sort((a, b) => {
                const aValue = a[filters.sortBy];
                const bValue = b[filters.sortBy];

                if (filters.sortBy === 'date') {
                    const aDate = new Date(aValue);
                    const bDate = new Date(bValue);
                    return filters.sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
                } else if (filters.sortBy === 'amount') {
                    return filters.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    const compare = aValue.localeCompare(bValue);
                    return filters.sortDirection === 'asc' ? compare : -compare;
                }
            });
        }

        // Лимит результатов
        if (filters.limit) {
            filtered = filtered.slice(0, filters.limit);
        }

        return filtered;
    }

    // Получение операции по ID
    getOperationById(operationId) {
        return this.operations.find(op => op.id === operationId);
    }

    // Получение статистики
    getStatistics(period = 'month') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now);
                startDate.setDate(now.getDate() - diffToMonday);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const periodOperations = this.operations.filter(op => {
            const opDate = new Date(op.date);
            return opDate >= startDate;
        });

        const income = periodOperations
            .filter(op => op.type === 'income')
            .reduce((sum, op) => sum + op.amount, 0);

        const expenses = periodOperations
            .filter(op => op.type === 'expense')
            .reduce((sum, op) => sum + op.amount, 0);

        const balance = income - expenses;

        // Статистика по категориям
        const categoriesStats = {};
        periodOperations.forEach(op => {
            if (!categoriesStats[op.category]) {
                categoriesStats[op.category] = {
                    income: 0,
                    expense: 0,
                    count: 0
                };
            }
            categoriesStats[op.category][op.type] += op.amount;
            categoriesStats[op.category].count++;
        });

        return {
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            income,
            expenses,
            balance,
            operationsCount: periodOperations.length,
            categoriesStats,
            averageTransaction: periodOperations.length > 0 ? (income + expenses) / periodOperations.length : 0
        };
    }

    // Получение категорий для операций
    getCategories(type = null) {
        if (!type) return this.categories;
        return this.categories.filter(cat => cat.type === type);
    }

    // Валидация данных операции
    validateOperationData(data, requireAll = true) {
        const errors = [];

        if (requireAll || data.type !== undefined) {
            if (!data.type || !['income', 'expense'].includes(data.type)) {
                errors.push('Неверный тип операции');
            }
        }

        if (requireAll || data.category !== undefined) {
            if (!data.category || data.category.trim() === '') {
                errors.push('Категория обязательна');
            }
        }

        if (requireAll || data.amount !== undefined) {
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                errors.push('Сумма должна быть положительным числом');
            }
        }

        if (data.date !== undefined) {
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                errors.push('Неверный формат даты');
            }
        }

        if (data.currency !== undefined) {
            const validCurrencies = ['PLN', 'USD', 'EUR', 'UAH'];
            if (!validCurrencies.includes(data.currency)) {
                errors.push('Неподдерживаемая валюта');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }

    // Обновление связанных данных
    async updateRelatedData(operation) {
        try {
            // Обновляем карточки пользователей
            if (window.userCardsManager) {
                await window.userCardsManager.updateBalances();
            }

            // Обновляем лимиты
            if (window.limitsPage) {
                // Проверяем превышение лимитов
                await this.checkLimits(operation);
            }

            // Обновляем цели
            if (operation.goalId && window.goalsPage) {
                // Операция связана с целью
                await this.updateGoalProgress(operation);
            }

        } catch (error) {
            helpers.log('Ошибка обновления связанных данных', error, 'warn');
        }
    }

    // Проверка лимитов
    async checkLimits(operation) {
        if (operation.type !== 'expense') return;

        try {
            const limits = storageManager.get('limits', []);
            const relevantLimits = limits.filter(limit => 
                limit.category === 'all' || limit.category === operation.category
            );

            for (const limit of relevantLimits) {
                const spent = this.calculateSpentForLimit(limit);
                if (spent > limit.amount) {
                    // Лимит превышен
                    this.notifyLimitExceeded(limit, spent - limit.amount);
                }
            }

        } catch (error) {
            helpers.log('Ошибка проверки лимитов', error, 'warn');
        }
    }

    // Расчет потраченной суммы для лимита
    calculateSpentForLimit(limit) {
        const now = new Date();
        let startDate;

        switch (limit.period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now);
                startDate.setDate(now.getDate() - diffToMonday);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        return this.operations
            .filter(op => {
                const opDate = new Date(op.date);
                const matchesCategory = limit.category === 'all' || op.category === limit.category;
                const isInPeriod = opDate >= startDate;
                return matchesCategory && isInPeriod && op.type === 'expense';
            })
            .reduce((sum, op) => sum + op.amount, 0);
    }

    // Уведомление о превышении лимита
    notifyLimitExceeded(limit, exceededAmount) {
        const settings = storageManager.getUserSettings();
        if (!settings.notifications) return;

        const message = `Превышен лимит "${limit.category === 'all' ? 'Общий' : limit.category}" на ${currency.format(exceededAmount, 'PLN')}`;
        
        showToast(message, 'warning', 5000);

        // Браузерное уведомление
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Превышение лимита', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    // Обновление прогресса цели
    async updateGoalProgress(operation) {
        // Здесь будет логика обновления прогресса цели
        // При создании связанных операций с целями
    }

    // Импорт операций
    async importOperations(operations) {
        try {
            const importedCount = 0;
            const errors = [];

            for (const opData of operations) {
                try {
                    await this.addOperation(opData);
                    importedCount++;
                } catch (error) {
                    errors.push({ operation: opData, error: error.message });
                }
            }

            return {
                imported: importedCount,
                total: operations.length,
                errors
            };

        } catch (error) {
            helpers.log('Ошибка импорта операций', error, 'error');
            throw error;
        }
    }

    // Экспорт операций
    exportOperations(format = 'json', filters = {}) {
        const operations = this.getOperations(filters);
        
        if (format === 'csv') {
            return this.exportToCSV(operations);
        } else {
            return JSON.stringify(operations, null, 2);
        }
    }

    // Экспорт в CSV
    exportToCSV(operations) {
        const headers = ['Дата', 'Тип', 'Категория', 'Описание', 'Пользователь', 'Сумма', 'Валюта'];
        const csvContent = [
            headers.join(','),
            ...operations.map(op => [
                op.date,
                op.type === 'income' ? 'Доход' : 'Расход',
                op.category,
                op.description || '',
                op.userName || '',
                op.amount,
                op.currency || 'PLN'
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        return '\uFEFF' + csvContent; // BOM для корректного отображения в Excel
    }

    // Получение имени текущего пользователя
    getCurrentUserName() {
        if (window.authManager?.isAuthenticated()) {
            const userData = window.authManager.getCurrentUser();
            return userData?.displayName || userData?.email || 'Пользователь';
        }
        return 'Пользователь';
    }

    // Получение ID текущего пользователя
    getCurrentUserId() {
        if (window.authManager?.isAuthenticated()) {
            const userData = window.authManager.getCurrentUser();
            return userData?.uid || null;
        }
        return null;
    }

    // Добавление слушателя
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Удаление слушателя
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    // Уведомление слушателей
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                helpers.log('Ошибка в слушателе операций', error, 'error');
            }
        });

        // Глобальное событие
        document.dispatchEvent(new CustomEvent('dataChanged', {
            detail: { type: 'operations', event, data }
        }));
    }
}

// Создание глобального экземпляра
const operationsManager = new OperationsManager();

// Экспорт для глобального использования
window.operationsManager = operationsManager;