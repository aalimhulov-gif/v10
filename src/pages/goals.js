// ===== КОМПОНЕНТ СТРАНИЦЫ ЦЕЛЕЙ =====

class GoalsPage {
    constructor() {
        this.goals = [];
        this.currentFilter = 'all'; // all, active, completed, paused
        this.editingGoal = null;
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        document.addEventListener('click', (e) => {
            // Кнопка добавления цели
            if (e.target.closest('#add-goal-btn')) {
                this.showGoalModal();
            }

            // Редактирование цели
            const editBtn = e.target.closest('.edit-goal-btn');
            if (editBtn) {
                const goalId = editBtn.dataset.id;
                this.editGoal(goalId);
            }

            // Удаление цели
            const deleteBtn = e.target.closest('.delete-goal-btn');
            if (deleteBtn) {
                const goalId = deleteBtn.dataset.id;
                this.deleteGoal(goalId);
            }

            // Пополнение цели
            const contributeBtn = e.target.closest('.contribute-goal-btn');
            if (contributeBtn) {
                const goalId = contributeBtn.dataset.id;
                this.contributeToGoal(goalId);
            }

            // Снятие с цели
            const withdrawBtn = e.target.closest('.withdraw-goal-btn');
            if (withdrawBtn) {
                const goalId = withdrawBtn.dataset.id;
                this.withdrawFromGoal(goalId);
            }

            // Изменение статуса цели
            const statusBtn = e.target.closest('.status-goal-btn');
            if (statusBtn) {
                const goalId = statusBtn.dataset.id;
                const status = statusBtn.dataset.status;
                this.changeGoalStatus(goalId, status);
            }

            // Фильтры
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                const filter = filterBtn.dataset.filter;
                this.setFilter(filter);
            }
        });

        // Обработка формы цели
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGoal();
            });
        }

        // Обработка формы пополнения
        const contributeForm = document.getElementById('contribute-form');
        if (contributeForm) {
            contributeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processContribution();
            });
        }
    }

    // Инициализация страницы
    async init() {
        await this.loadGoals();
        this.renderGoals();
        this.updateOverview();
    }

    // Загрузка целей
    async loadGoals() {
        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    this.goals = await window.dbManager.getGoals(userData.budgetId);
                }
            } else {
                this.goals = storageManager.get('goals', []);
            }

            // Обновляем прогресс целей
            this.updateGoalsProgress();

        } catch (error) {
            helpers.log('Ошибка загрузки целей', error, 'error');
            this.goals = [];
        }
    }

    // Обновление прогресса целей
    updateGoalsProgress() {
        this.goals = this.goals.map(goal => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            // Автоматически завершаем цель, если достигнута сумма
            let status = goal.status;
            if (isCompleted && status === 'active') {
                status = 'completed';
            }

            // Расчет времени до цели
            let timeToGoal = null;
            if (goal.deadline && status === 'active') {
                const deadlineDate = new Date(goal.deadline);
                const today = new Date();
                const diffTime = deadlineDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                timeToGoal = diffDays;
            }

            return {
                ...goal,
                progress: Math.min(progress, 100),
                remaining,
                isCompleted,
                status,
                timeToGoal
            };
        });
    }

    // Установка фильтра
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Обновляем активные кнопки
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.renderGoals();
    }

    // Отображение целей
    renderGoals() {
        const container = document.getElementById('goals-list');
        if (!container) return;

        // Фильтруем цели
        let filteredGoals = this.goals;
        if (this.currentFilter !== 'all') {
            filteredGoals = this.goals.filter(goal => goal.status === this.currentFilter);
        }

        // Сортируем цели
        filteredGoals.sort((a, b) => {
            // Сначала активные цели
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (b.status === 'active' && a.status !== 'active') return 1;
            
            // Затем по проценту выполнения (от большего к меньшему)
            return b.progress - a.progress;
        });

        if (filteredGoals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h3>Нет целей для выбранного фильтра</h3>
                    <p>Поставьте себе финансовые цели для достижения мечты</p>
                    <button class="btn btn-primary" onclick="goalsPage.showGoalModal()">
                        <i class="fas fa-plus"></i> Добавить цель
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredGoals.map(goal => {
            const statusInfo = this.getStatusInfo(goal.status);
            const progressColor = this.getProgressColor(goal.progress);
            
            return `
                <div class="goal-card ${goal.status}" data-id="${goal.id}">
                    <div class="goal-header">
                        <div class="goal-info">
                            <h3 class="goal-title">
                                <i class="fas fa-${goal.icon || 'star'}"></i>
                                ${goal.title}
                            </h3>
                            <div class="goal-status">
                                <span class="status-badge ${goal.status}">
                                    <i class="fas fa-${statusInfo.icon}"></i>
                                    ${statusInfo.label}
                                </span>
                                ${goal.deadline ? `
                                    <span class="goal-deadline ${goal.timeToGoal !== null && goal.timeToGoal < 7 ? 'urgent' : ''}">
                                        <i class="fas fa-calendar"></i>
                                        ${goal.timeToGoal !== null ? 
                                            (goal.timeToGoal > 0 ? `${goal.timeToGoal} дн.` : 'Просрочена') :
                                            helpers.formatDate(goal.deadline)
                                        }
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="goal-actions">
                            ${goal.status === 'active' ? `
                                <button class="btn btn-sm btn-success contribute-goal-btn" data-id="${goal.id}" title="Пополнить">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn btn-sm btn-warning withdraw-goal-btn" data-id="${goal.id}" title="Снять">
                                    <i class="fas fa-minus"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline edit-goal-btn" data-id="${goal.id}" title="Редактировать">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-goal-btn" data-id="${goal.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    ${goal.description ? `
                        <div class="goal-description">
                            ${goal.description}
                        </div>
                    ` : ''}

                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${goal.progress}%; background-color: ${progressColor}"></div>
                        </div>
                        <div class="progress-info">
                            <span class="current">${currency.format(goal.currentAmount, goal.currency || 'PLN')}</span>
                            <span class="separator">/</span>
                            <span class="target">${currency.format(goal.targetAmount, goal.currency || 'PLN')}</span>
                            <span class="percentage">(${goal.progress.toFixed(1)}%)</span>
                        </div>
                    </div>

                    <div class="goal-details">
                        <div class="detail-row">
                            <div class="detail-item">
                                <div class="detail-label">Осталось</div>
                                <div class="detail-value">
                                    ${currency.format(goal.remaining, goal.currency || 'PLN')}
                                </div>
                            </div>
                            ${goal.deadline && goal.status === 'active' ? `
                                <div class="detail-item">
                                    <div class="detail-label">Нужно в ${goal.timeToGoal > 0 ? 'день' : 'месяц'}</div>
                                    <div class="detail-value">
                                        ${goal.timeToGoal > 0 ? 
                                            currency.format(goal.remaining / goal.timeToGoal, goal.currency || 'PLN') :
                                            currency.format(goal.remaining / 30, goal.currency || 'PLN')
                                        }
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${goal.status === 'completed' ? `
                        <div class="goal-completed">
                            <i class="fas fa-trophy"></i>
                            Цель достигнута!
                        </div>
                    ` : ''}

                    ${goal.status === 'active' && !goal.isCompleted ? `
                        <div class="goal-actions-bar">
                            <button class="btn btn-outline status-goal-btn" data-id="${goal.id}" data-status="paused">
                                <i class="fas fa-pause"></i> Приостановить
                            </button>
                            ${goal.progress >= 100 ? `
                                <button class="btn btn-success status-goal-btn" data-id="${goal.id}" data-status="completed">
                                    <i class="fas fa-check"></i> Завершить
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${goal.status === 'paused' ? `
                        <div class="goal-actions-bar">
                            <button class="btn btn-primary status-goal-btn" data-id="${goal.id}" data-status="active">
                                <i class="fas fa-play"></i> Возобновить
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Обновление обзора
    updateOverview() {
        const totalGoals = this.goals.length;
        const activeGoals = this.goals.filter(goal => goal.status === 'active').length;
        const completedGoals = this.goals.filter(goal => goal.status === 'completed').length;
        const totalTarget = this.goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
        const totalSaved = this.goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
        const averageProgress = totalGoals > 0 ? this.goals.reduce((sum, goal) => sum + goal.progress, 0) / totalGoals : 0;

        const overviewContainer = document.getElementById('goals-overview');
        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="overview-grid">
                    <div class="overview-card">
                        <div class="overview-icon">
                            <i class="fas fa-bullseye"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${totalGoals}</div>
                            <div class="overview-label">Всего целей</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon active">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${activeGoals}</div>
                            <div class="overview-label">Активных</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon completed">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${completedGoals}</div>
                            <div class="overview-label">Достигнуто</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="overview-content">
                            <div class="overview-number">${averageProgress.toFixed(1)}%</div>
                            <div class="overview-label">Средний прогресс</div>
                        </div>
                    </div>
                </div>
                
                ${totalTarget > 0 ? `
                    <div class="total-progress">
                        <div class="total-progress-info">
                            <h4>Общий прогресс по целям</h4>
                            <span>${currency.format(totalSaved, 'PLN')} из ${currency.format(totalTarget, 'PLN')}</span>
                        </div>
                        <div class="total-progress-bar">
                            <div class="total-progress-fill" style="width: ${Math.min((totalSaved / totalTarget) * 100, 100)}%"></div>
                        </div>
                        <div class="total-progress-percentage">
                            ${((totalSaved / totalTarget) * 100).toFixed(1)}%
                        </div>
                    </div>
                ` : ''}
            `;
        }
    }

    // Показ модального окна цели
    showGoalModal(goalData = null) {
        this.editingGoal = goalData;
        
        const modal = document.getElementById('goal-modal');
        const form = document.getElementById('goal-form');
        const title = modal.querySelector('.modal-title');
        
        if (goalData) {
            title.textContent = 'Редактировать цель';
            form.elements['goal-title'].value = goalData.title;
            form.elements['goal-description'].value = goalData.description || '';
            form.elements['goal-target-amount'].value = goalData.targetAmount;
            form.elements['goal-current-amount'].value = goalData.currentAmount;
            form.elements['goal-currency'].value = goalData.currency || 'PLN';
            form.elements['goal-deadline'].value = goalData.deadline ? goalData.deadline.split('T')[0] : '';
            form.elements['goal-icon'].value = goalData.icon || 'star';
        } else {
            title.textContent = 'Добавить цель';
            form.reset();
            form.elements['goal-currency'].value = 'PLN';
            form.elements['goal-icon'].value = 'star';
            form.elements['goal-current-amount'].value = '0';
        }

        if (window.modalsManager) {
            window.modalsManager.showModal('goal-modal');
        }
    }

    // Сохранение цели
    async saveGoal() {
        const form = document.getElementById('goal-form');
        const formData = new FormData(form);

        const goalData = {
            title: formData.get('goal-title').trim(),
            description: formData.get('goal-description').trim(),
            targetAmount: parseFloat(formData.get('goal-target-amount')),
            currentAmount: parseFloat(formData.get('goal-current-amount')) || 0,
            currency: formData.get('goal-currency'),
            deadline: formData.get('goal-deadline') || null,
            icon: formData.get('goal-icon')
        };

        // Валидация
        if (!goalData.title) {
            showToast('Введите название цели', 'error');
            return;
        }

        if (!goalData.targetAmount || goalData.targetAmount <= 0) {
            showToast('Введите корректную целевую сумму', 'error');
            return;
        }

        if (goalData.currentAmount < 0) {
            showToast('Текущая сумма не может быть отрицательной', 'error');
            return;
        }

        if (goalData.deadline) {
            const deadlineDate = new Date(goalData.deadline);
            const today = new Date();
            if (deadlineDate <= today) {
                showToast('Дата цели должна быть в будущем', 'error');
                return;
            }
        }

        try {
            if (this.editingGoal) {
                // Редактирование
                const updatedGoal = {
                    ...this.editingGoal,
                    ...goalData
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.updateGoal(updatedGoal);
                } else {
                    const goals = storageManager.get('goals', []);
                    const index = goals.findIndex(goal => goal.id === this.editingGoal.id);
                    if (index !== -1) {
                        goals[index] = updatedGoal;
                        storageManager.save('goals', goals);
                    }
                }

                showToast('Цель обновлена', 'success');
            } else {
                // Создание новой
                const newGoal = {
                    id: helpers.generateId(),
                    ...goalData,
                    status: 'active',
                    createdAt: new Date().toISOString()
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.addGoal(newGoal);
                } else {
                    const goals = storageManager.get('goals', []);
                    goals.push(newGoal);
                    storageManager.save('goals', goals);
                }

                showToast('Цель добавлена', 'success');
            }

            // Перезагружаем данные
            await this.loadGoals();
            this.renderGoals();
            this.updateOverview();

            // Закрываем модальное окно
            if (window.modalsManager) {
                window.modalsManager.hideModal('goal-modal');
            }

        } catch (error) {
            helpers.log('Ошибка сохранения цели', error, 'error');
            showToast('Ошибка сохранения цели', 'error');
        }
    }

    // Редактирование цели
    editGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            this.showGoalModal(goal);
        }
    }

    // Удаление цели
    async deleteGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        const confirmed = await window.modalsManager.showConfirmation(
            'Удаление цели',
            `Вы уверены, что хотите удалить цель "${goal.title}"?`,
            'Удалить',
            'danger'
        );

        if (!confirmed) return;

        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.deleteGoal(goalId);
            } else {
                const goals = storageManager.get('goals', []);
                const updatedGoals = goals.filter(g => g.id !== goalId);
                storageManager.save('goals', updatedGoals);
            }

            await this.loadGoals();
            this.renderGoals();
            this.updateOverview();
            showToast('Цель удалена', 'success');

        } catch (error) {
            helpers.log('Ошибка удаления цели', error, 'error');
            showToast('Ошибка удаления цели', 'error');
        }
    }

    // Пополнение цели
    contributeToGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        this.selectedGoal = goal;
        
        const modal = document.getElementById('contribute-modal');
        const form = document.getElementById('contribute-form');
        const title = modal.querySelector('.modal-title');
        
        title.textContent = `Пополнить цель: ${goal.title}`;
        form.reset();
        
        // Показываем текущую информацию
        const currentInfo = modal.querySelector('.current-goal-info');
        if (currentInfo) {
            currentInfo.innerHTML = `
                <div class="goal-current-state">
                    <div>Текущая сумма: ${currency.format(goal.currentAmount, goal.currency || 'PLN')}</div>
                    <div>Целевая сумма: ${currency.format(goal.targetAmount, goal.currency || 'PLN')}</div>
                    <div>Осталось: ${currency.format(goal.remaining, goal.currency || 'PLN')}</div>
                </div>
            `;
        }

        if (window.modalsManager) {
            window.modalsManager.showModal('contribute-modal');
        }
    }

    // Снятие с цели
    withdrawFromGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        this.selectedGoal = goal;
        
        const modal = document.getElementById('contribute-modal');
        const form = document.getElementById('contribute-form');
        const title = modal.querySelector('.modal-title');
        
        title.textContent = `Снять с цели: ${goal.title}`;
        form.reset();
        form.elements['contribute-type'].value = 'withdraw';
        
        // Показываем текущую информацию
        const currentInfo = modal.querySelector('.current-goal-info');
        if (currentInfo) {
            currentInfo.innerHTML = `
                <div class="goal-current-state">
                    <div>Доступно для снятия: ${currency.format(goal.currentAmount, goal.currency || 'PLN')}</div>
                </div>
            `;
        }

        if (window.modalsManager) {
            window.modalsManager.showModal('contribute-modal');
        }
    }

    // Обработка пополнения/снятия
    async processContribution() {
        const form = document.getElementById('contribute-form');
        const formData = new FormData(form);

        const amount = parseFloat(formData.get('contribute-amount'));
        const type = formData.get('contribute-type');
        const description = formData.get('contribute-description').trim();

        if (!amount || amount <= 0) {
            showToast('Введите корректную сумму', 'error');
            return;
        }

        if (type === 'withdraw' && amount > this.selectedGoal.currentAmount) {
            showToast('Сумма снятия превышает доступную', 'error');
            return;
        }

        try {
            const updatedGoal = {
                ...this.selectedGoal,
                currentAmount: type === 'contribute' 
                    ? this.selectedGoal.currentAmount + amount
                    : this.selectedGoal.currentAmount - amount
            };

            // Сохраняем цель
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.updateGoal(updatedGoal);
            } else {
                const goals = storageManager.get('goals', []);
                const index = goals.findIndex(goal => goal.id === this.selectedGoal.id);
                if (index !== -1) {
                    goals[index] = updatedGoal;
                    storageManager.save('goals', goals);
                }
            }

            // Создаем операцию
            const operation = {
                id: helpers.generateId(),
                type: type === 'contribute' ? 'expense' : 'income',
                category: 'Цели',
                amount: amount,
                currency: this.selectedGoal.currency || 'PLN',
                description: description || `${type === 'contribute' ? 'Пополнение' : 'Снятие'} цели: ${this.selectedGoal.title}`,
                date: new Date().toISOString().split('T')[0],
                userName: 'Пользователь',
                goalId: this.selectedGoal.id
            };

            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.addOperation(operation);
            } else {
                const operations = storageManager.get('operations', []);
                operations.push(operation);
                storageManager.save('operations', operations);
            }

            await this.loadGoals();
            this.renderGoals();
            this.updateOverview();

            showToast(
                type === 'contribute' ? 'Цель пополнена' : 'Средства сняты с цели',
                'success'
            );

            // Закрываем модальное окно
            if (window.modalsManager) {
                window.modalsManager.hideModal('contribute-modal');
            }

        } catch (error) {
            helpers.log('Ошибка обработки операции с целью', error, 'error');
            showToast('Ошибка обработки операции', 'error');
        }
    }

    // Изменение статуса цели
    async changeGoalStatus(goalId, newStatus) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        try {
            const updatedGoal = {
                ...goal,
                status: newStatus
            };

            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.updateGoal(updatedGoal);
            } else {
                const goals = storageManager.get('goals', []);
                const index = goals.findIndex(g => g.id === goalId);
                if (index !== -1) {
                    goals[index] = updatedGoal;
                    storageManager.save('goals', goals);
                }
            }

            await this.loadGoals();
            this.renderGoals();
            this.updateOverview();

            const statusLabels = {
                'active': 'активна',
                'paused': 'приостановлена',
                'completed': 'завершена'
            };

            showToast(`Цель ${statusLabels[newStatus]}`, 'success');

        } catch (error) {
            helpers.log('Ошибка изменения статуса цели', error, 'error');
            showToast('Ошибка изменения статуса', 'error');
        }
    }

    // Получение информации о статусе
    getStatusInfo(status) {
        const statusMap = {
            'active': { label: 'Активна', icon: 'play' },
            'completed': { label: 'Достигнута', icon: 'check' },
            'paused': { label: 'Приостановлена', icon: 'pause' }
        };
        return statusMap[status] || statusMap['active'];
    }

    // Получение цвета прогресса
    getProgressColor(progress) {
        if (progress >= 100) return '#2ecc71';
        if (progress >= 75) return '#27ae60';
        if (progress >= 50) return '#f39c12';
        if (progress >= 25) return '#e67e22';
        return '#e74c3c';
    }
}

// Создание глобального экземпляра
const goalsPage = new GoalsPage();

// Экспорт для глобального использования
window.goalsPage = goalsPage;