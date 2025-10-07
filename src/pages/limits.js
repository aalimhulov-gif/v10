// ===== КОМПОНЕНТ СТРАНИЦЫ ЛИМИТОВ =====

class LimitsPage {
    constructor() {
        this.limits = [];
        this.currentPeriod = 'month'; // month, week, day
        this.editingLimit = null;
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        document.addEventListener('click', (e) => {
            // Кнопка добавления лимита
            if (e.target.closest('#add-limit-btn')) {
                this.showLimitModal();
            }

            // Редактирование лимита
            const editBtn = e.target.closest('.edit-limit-btn');
            if (editBtn) {
                const limitId = editBtn.dataset.id;
                this.editLimit(limitId);
            }

            // Удаление лимита
            const deleteBtn = e.target.closest('.delete-limit-btn');
            if (deleteBtn) {
                const limitId = deleteBtn.dataset.id;
                this.deleteLimit(limitId);
            }

            // Переключение периода
            const periodBtn = e.target.closest('.period-btn');
            if (periodBtn) {
                const period = periodBtn.dataset.period;
                this.setPeriod(period);
            }

            // Сброс лимита
            const resetBtn = e.target.closest('.reset-limit-btn');
            if (resetBtn) {
                const limitId = resetBtn.dataset.id;
                this.resetLimit(limitId);
            }
        });

        // Обработка формы лимита
        const limitForm = document.getElementById('limit-form');
        if (limitForm) {
            limitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveLimit();
            });
        }
    }

    // Инициализация страницы
    async init() {
        await this.loadLimits();
        this.renderLimits();
        this.updateOverview();
    }

    // Загрузка лимитов
    async loadLimits() {
        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    this.limits = await window.dbManager.getLimits(userData.budgetId);
                }
            } else {
                this.limits = storageManager.get('limits', []);
            }

            // Добавляем статистику использования
            await this.addUsageStats();

        } catch (error) {
            helpers.log('Ошибка загрузки лимитов', error, 'error');
            this.limits = [];
        }
    }

    // Добавление статистики использования
    async addUsageStats() {
        try {
            let operations = [];
            
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    operations = await window.dbManager.getOperations(userData.budgetId);
                }
            } else {
                operations = storageManager.get('operations', []);
            }

            // Обновляем статистику для каждого лимита
            this.limits = this.limits.map(limit => {
                const currentPeriodOperations = this.getOperationsForPeriod(operations, limit);
                const spent = currentPeriodOperations
                    .filter(op => op.type === 'expense')
                    .reduce((sum, op) => sum + op.amount, 0);
                
                const percentage = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
                const remaining = Math.max(0, limit.amount - spent);
                const isExceeded = spent > limit.amount;

                return {
                    ...limit,
                    spent,
                    percentage: Math.min(percentage, 100),
                    remaining,
                    isExceeded,
                    operationsCount: currentPeriodOperations.length
                };
            });

        } catch (error) {
            helpers.log('Ошибка загрузки статистики лимитов', error, 'error');
        }
    }

    // Получение операций для периода лимита
    getOperationsForPeriod(operations, limit) {
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

        return operations.filter(op => {
            const opDate = new Date(op.date);
            const matchesCategory = limit.category === 'all' || op.category === limit.category;
            const isInPeriod = opDate >= startDate;
            return matchesCategory && isInPeriod && op.type === 'expense';
        });
    }

    // Установка периода
    setPeriod(period) {
        this.currentPeriod = period;
        
        // Обновляем активные кнопки
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');

        this.renderLimits();
    }

    // Отображение лимитов
    renderLimits() {
        const container = document.getElementById('limits-list');
        if (!container) return;

        // Фильтруем лимиты по текущему периоду
        const filteredLimits = this.limits.filter(limit => limit.period === this.currentPeriod);

        if (filteredLimits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-piggy-bank"></i>
                    <h3>Нет лимитов для выбранного периода</h3>
                    <p>Установите лимиты для контроля расходов по категориям</p>
                    <button class="btn btn-primary" onclick="limitsPage.showLimitModal()">
                        <i class="fas fa-plus"></i> Добавить лимит
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredLimits.map(limit => {
            const progressColor = this.getProgressColor(limit.percentage);
            const statusIcon = limit.isExceeded ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusClass = limit.isExceeded ? 'exceeded' : 'normal';

            return `
                <div class="limit-card ${statusClass}" data-id="${limit.id}">
                    <div class="limit-header">
                        <div class="limit-info">
                            <h3 class="limit-title">
                                <i class="fas fa-${this.getCategoryIcon(limit.category)}"></i>
                                ${limit.category === 'all' ? 'Общий лимит' : limit.category}
                            </h3>
                            <div class="limit-period">${this.getPeriodLabel(limit.period)}</div>
                        </div>
                        <div class="limit-status">
                            <i class="fas ${statusIcon}"></i>
                        </div>
                        <div class="limit-actions">
                            <button class="btn btn-sm btn-outline edit-limit-btn" data-id="${limit.id}" title="Редактировать">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline reset-limit-btn" data-id="${limit.id}" title="Сбросить">
                                <i class="fas fa-redo"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-limit-btn" data-id="${limit.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="limit-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${limit.percentage}%; background-color: ${progressColor}"></div>
                        </div>
                        <div class="progress-info">
                            <span class="spent">${currency.format(limit.spent, 'PLN')}</span>
                            <span class="separator">/</span>
                            <span class="total">${currency.format(limit.amount, 'PLN')}</span>
                            <span class="percentage">(${limit.percentage.toFixed(1)}%)</span>
                        </div>
                    </div>

                    <div class="limit-details">
                        <div class="detail-item">
                            <div class="detail-label">Осталось</div>
                            <div class="detail-value ${limit.isExceeded ? 'negative' : 'positive'}">
                                ${limit.isExceeded ? '-' : ''}${currency.format(Math.abs(limit.remaining), 'PLN')}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Операций</div>
                            <div class="detail-value">${limit.operationsCount}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Средний расход</div>
                            <div class="detail-value">
                                ${limit.operationsCount > 0 ? currency.format(limit.spent / limit.operationsCount, 'PLN') : currency.format(0, 'PLN')}
                            </div>
                        </div>
                    </div>

                    ${limit.isExceeded ? `
                        <div class="limit-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            Лимит превышен на ${currency.format(limit.spent - limit.amount, 'PLN')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Обновление обзора
    updateOverview() {
        const totalLimits = this.limits.length;
        const exceededLimits = this.limits.filter(limit => limit.isExceeded).length;
        const activeLimits = this.limits.filter(limit => limit.spent > 0).length;
        const totalBudget = this.limits.reduce((sum, limit) => sum + limit.amount, 0);
        const totalSpent = this.limits.reduce((sum, limit) => sum + limit.spent, 0);

        const overviewContainer = document.getElementById('limits-overview');
        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="overview-grid">
                    <div class="overview-card">
                        <div class="overview-icon">
                            <i class="fas fa-piggy-bank"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${totalLimits}</div>
                            <div class="overview-label">Всего лимитов</div>
                        </div>
                    </div>
                    <div class="overview-card ${exceededLimits > 0 ? 'exceeded' : ''}">
                        <div class="overview-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${exceededLimits}</div>
                            <div class="overview-label">Превышено</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${activeLimits}</div>
                            <div class="overview-label">Активных</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${currency.format(totalBudget, 'PLN')}</div>
                            <div class="overview-label">Общий бюджет</div>
                        </div>
                    </div>
                </div>
                
                ${totalBudget > 0 ? `
                    <div class="total-progress">
                        <div class="total-progress-bar">
                            <div class="total-progress-fill" style="width: ${Math.min((totalSpent / totalBudget) * 100, 100)}%"></div>
                        </div>
                        <div class="total-progress-info">
                            <span>Использовано: ${currency.format(totalSpent, 'PLN')} из ${currency.format(totalBudget, 'PLN')}</span>
                            <span>(${((totalSpent / totalBudget) * 100).toFixed(1)}%)</span>
                        </div>
                    </div>
                ` : ''}
            `;
        }
    }

    // Показ модального окна лимита
    showLimitModal(limitData = null) {
        this.editingLimit = limitData;
        
        const modal = document.getElementById('limit-modal');
        const form = document.getElementById('limit-form');
        const title = modal.querySelector('.modal-title');
        
        if (limitData) {
            title.textContent = 'Редактировать лимит';
            form.elements['limit-amount'].value = limitData.amount;
            form.elements['limit-category'].value = limitData.category;
            form.elements['limit-period'].value = limitData.period;
        } else {
            title.textContent = 'Добавить лимит';
            form.reset();
            form.elements['limit-period'].value = this.currentPeriod;
        }

        // Заполняем список категорий
        this.populateCategorySelect();

        if (window.modalsManager) {
            window.modalsManager.showModal('limit-modal');
        }
    }

    // Заполнение списка категорий
    populateCategorySelect() {
        const select = document.getElementById('limit-category');
        if (!select) return;

        let categories = [];
        if (window.categoriesPage) {
            categories = window.categoriesPage.getCategoriesForSelect('expense');
        }

        select.innerHTML = `
            <option value="all">Общий лимит (все категории)</option>
            ${categories.map(cat => `<option value="${cat.value}">${cat.label}</option>`).join('')}
        `;
    }

    // Сохранение лимита
    async saveLimit() {
        const form = document.getElementById('limit-form');
        const formData = new FormData(form);

        const limitData = {
            amount: parseFloat(formData.get('limit-amount')),
            category: formData.get('limit-category'),
            period: formData.get('limit-period')
        };

        // Валидация
        if (!limitData.amount || limitData.amount <= 0) {
            showToast('Введите корректную сумму лимита', 'error');
            return;
        }

        // Проверка на дублирование
        const existingLimit = this.limits.find(limit => 
            limit.category === limitData.category && 
            limit.period === limitData.period &&
            (!this.editingLimit || limit.id !== this.editingLimit.id)
        );

        if (existingLimit) {
            showToast('Лимит для этой категории и периода уже существует', 'error');
            return;
        }

        try {
            if (this.editingLimit) {
                // Редактирование
                const updatedLimit = {
                    ...this.editingLimit,
                    ...limitData
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.updateLimit(updatedLimit);
                } else {
                    const limits = storageManager.get('limits', []);
                    const index = limits.findIndex(limit => limit.id === this.editingLimit.id);
                    if (index !== -1) {
                        limits[index] = updatedLimit;
                        storageManager.save('limits', limits);
                    }
                }

                showToast('Лимит обновлен', 'success');
            } else {
                // Создание нового
                const newLimit = {
                    id: helpers.generateId(),
                    ...limitData,
                    createdAt: new Date().toISOString()
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.addLimit(newLimit);
                } else {
                    const limits = storageManager.get('limits', []);
                    limits.push(newLimit);
                    storageManager.save('limits', limits);
                }

                showToast('Лимит добавлен', 'success');
            }

            // Перезагружаем данные
            await this.loadLimits();
            this.renderLimits();
            this.updateOverview();

            // Закрываем модальное окно
            if (window.modalsManager) {
                window.modalsManager.hideModal('limit-modal');
            }

        } catch (error) {
            helpers.log('Ошибка сохранения лимита', error, 'error');
            showToast('Ошибка сохранения лимита', 'error');
        }
    }

    // Редактирование лимита
    editLimit(limitId) {
        const limit = this.limits.find(l => l.id === limitId);
        if (limit) {
            this.showLimitModal(limit);
        }
    }

    // Удаление лимита
    async deleteLimit(limitId) {
        const limit = this.limits.find(l => l.id === limitId);
        if (!limit) return;

        const confirmed = await window.modalsManager.showConfirmation(
            'Удаление лимита',
            `Вы уверены, что хотите удалить лимит для "${limit.category === 'all' ? 'всех категорий' : limit.category}"?`,
            'Удалить',
            'danger'
        );

        if (!confirmed) return;

        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.deleteLimit(limitId);
            } else {
                const limits = storageManager.get('limits', []);
                const updatedLimits = limits.filter(l => l.id !== limitId);
                storageManager.save('limits', updatedLimits);
            }

            await this.loadLimits();
            this.renderLimits();
            this.updateOverview();
            showToast('Лимит удален', 'success');

        } catch (error) {
            helpers.log('Ошибка удаления лимита', error, 'error');
            showToast('Ошибка удаления лимита', 'error');
        }
    }

    // Сброс лимита
    async resetLimit(limitId) {
        const confirmed = await window.modalsManager.showConfirmation(
            'Сброс лимита',
            'Сбросить счетчик лимита? Это действие нельзя отменить.',
            'Сбросить',
            'warning'
        );

        if (!confirmed) return;

        // Для демонстрации - просто перезагружаем данные
        // В реальном приложении здесь может быть логика сброса периода
        await this.loadLimits();
        this.renderLimits();
        showToast('Лимит сброшен', 'success');
    }

    // Получение цвета прогресса
    getProgressColor(percentage) {
        if (percentage <= 50) return '#2ecc71';
        if (percentage <= 80) return '#f39c12';
        return '#e74c3c';
    }

    // Получение иконки категории
    getCategoryIcon(category) {
        if (category === 'all') return 'wallet';
        
        const icons = {
            'Продукты': 'shopping-cart',
            'Транспорт': 'car',
            'Развлечения': 'gamepad',
            'Здоровье': 'heartbeat',
            'Образование': 'graduation-cap',
            'Дом': 'home',
            'Одежда': 'tshirt',
            'Другое': 'ellipsis-h'
        };
        return icons[category] || 'tag';
    }

    // Получение подписи периода
    getPeriodLabel(period) {
        const labels = {
            'day': 'За день',
            'week': 'За неделю',
            'month': 'За месяц'
        };
        return labels[period] || period;
    }
}

// Создание глобального экземпляра
const limitsPage = new LimitsPage();

// Экспорт для глобального использования
window.limitsPage = limitsPage;