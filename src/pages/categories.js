// ===== КОМПОНЕНТ СТРАНИЦЫ КАТЕГОРИЙ =====

class CategoriesPage {
    constructor() {
        this.categories = [];
        this.currentFilter = 'all'; // all, income, expense
        this.editingCategory = null;
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        document.addEventListener('click', (e) => {
            // Кнопка добавления категории
            if (e.target.closest('#add-category-btn')) {
                this.showCategoryModal();
            }

            // Редактирование категории
            const editBtn = e.target.closest('.edit-category-btn');
            if (editBtn) {
                const categoryId = editBtn.dataset.id;
                this.editCategory(categoryId);
            }

            // Удаление категории
            const deleteBtn = e.target.closest('.delete-category-btn');
            if (deleteBtn) {
                const categoryId = deleteBtn.dataset.id;
                this.deleteCategory(categoryId);
            }

            // Фильтры
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                const filter = filterBtn.dataset.filter;
                this.setFilter(filter);
            }
        });

        // Обработка формы категории
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
        }
    }

    // Инициализация страницы
    async init() {
        await this.loadCategories();
        this.renderCategories();
        this.updateStats();
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
                this.categories = storageManager.get('categories', this.getDefaultCategories());
            }

            // Добавляем статистику использования
            await this.addUsageStats();

        } catch (error) {
            helpers.log('Ошибка загрузки категорий', error, 'error');
            // Используем категории по умолчанию
            this.categories = this.getDefaultCategories();
        }
    }

    // Категории по умолчанию
    getDefaultCategories() {
        return [
            // Расходы
            { id: '1', name: 'Продукты', type: 'expense', icon: 'shopping-cart', color: '#e74c3c', isDefault: true },
            { id: '2', name: 'Транспорт', type: 'expense', icon: 'car', color: '#3498db', isDefault: true },
            { id: '3', name: 'Развлечения', type: 'expense', icon: 'gamepad', color: '#9b59b6', isDefault: true },
            { id: '4', name: 'Здоровье', type: 'expense', icon: 'heartbeat', color: '#e67e22', isDefault: true },
            { id: '5', name: 'Образование', type: 'expense', icon: 'graduation-cap', color: '#f39c12', isDefault: true },
            { id: '6', name: 'Дом', type: 'expense', icon: 'home', color: '#27ae60', isDefault: true },
            { id: '7', name: 'Одежда', type: 'expense', icon: 'tshirt', color: '#e91e63', isDefault: true },
            { id: '8', name: 'Другое', type: 'expense', icon: 'ellipsis-h', color: '#95a5a6', isDefault: true },
            
            // Доходы
            { id: '9', name: 'Зарплата', type: 'income', icon: 'money-bill-wave', color: '#2ecc71', isDefault: true },
            { id: '10', name: 'Подарок', type: 'income', icon: 'gift', color: '#f1c40f', isDefault: true },
            { id: '11', name: 'Другое', type: 'income', icon: 'plus-circle', color: '#1abc9c', isDefault: true }
        ];
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

            // Подсчитываем статистику для каждой категории
            this.categories = this.categories.map(category => {
                const categoryOperations = operations.filter(op => op.category === category.name);
                const totalAmount = categoryOperations.reduce((sum, op) => sum + op.amount, 0);
                const operationsCount = categoryOperations.length;
                const lastUsed = categoryOperations.length > 0 
                    ? Math.max(...categoryOperations.map(op => new Date(op.date).getTime()))
                    : null;

                return {
                    ...category,
                    totalAmount,
                    operationsCount,
                    lastUsed: lastUsed ? new Date(lastUsed) : null
                };
            });

        } catch (error) {
            helpers.log('Ошибка загрузки статистики категорий', error, 'error');
        }
    }

    // Установка фильтра
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Обновляем активные кнопки
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.renderCategories();
    }

    // Отображение категорий
    renderCategories() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        // Фильтруем категории
        let filteredCategories = this.categories;
        if (this.currentFilter !== 'all') {
            filteredCategories = this.categories.filter(cat => cat.type === this.currentFilter);
        }

        if (filteredCategories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <h3>Категории не найдены</h3>
                    <p>Добавьте новую категорию, нажав на кнопку "Добавить категорию"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredCategories.map(category => `
            <div class="category-card" data-id="${category.id}">
                <div class="category-header">
                    <div class="category-icon" style="background-color: ${category.color}">
                        <i class="fas fa-${category.icon}"></i>
                    </div>
                    <div class="category-info">
                        <h3 class="category-name">${category.name}</h3>
                        <div class="category-type ${category.type}">
                            ${category.type === 'income' ? 'Доход' : 'Расход'}
                        </div>
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-sm btn-outline edit-category-btn" data-id="${category.id}" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!category.isDefault ? `
                            <button class="btn btn-sm btn-danger delete-category-btn" data-id="${category.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="category-stats">
                    <div class="stat-item">
                        <div class="stat-label">Операций</div>
                        <div class="stat-value">${category.operationsCount || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общая сумма</div>
                        <div class="stat-value">${currency.format(category.totalAmount || 0, 'PLN')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Последнее использование</div>
                        <div class="stat-value">
                            ${category.lastUsed ? helpers.formatDate(category.lastUsed) : 'Не использовалась'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Обновление общей статистики
    updateStats() {
        const totalCategories = this.categories.length;
        const incomeCategories = this.categories.filter(cat => cat.type === 'income').length;
        const expenseCategories = this.categories.filter(cat => cat.type === 'expense').length;
        const activeCategories = this.categories.filter(cat => cat.operationsCount > 0).length;

        const statsContainer = document.getElementById('categories-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-tags"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${totalCategories}</div>
                            <div class="stat-label">Всего категорий</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon income">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${incomeCategories}</div>
                            <div class="stat-label">Доходы</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon expense">
                            <i class="fas fa-minus"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${expenseCategories}</div>
                            <div class="stat-label">Расходы</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${activeCategories}</div>
                            <div class="stat-label">Используемые</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Показ модального окна категории
    showCategoryModal(categoryData = null) {
        this.editingCategory = categoryData;
        
        const modal = document.getElementById('category-modal');
        const form = document.getElementById('category-form');
        const title = modal.querySelector('.modal-title');
        
        if (categoryData) {
            title.textContent = 'Редактировать категорию';
            form.elements['category-name'].value = categoryData.name;
            form.elements['category-type'].value = categoryData.type;
            form.elements['category-icon'].value = categoryData.icon;
            form.elements['category-color'].value = categoryData.color;
        } else {
            title.textContent = 'Добавить категорию';
            form.reset();
            form.elements['category-type'].value = 'expense';
            form.elements['category-icon'].value = 'tag';
            form.elements['category-color'].value = '#3498db';
        }

        if (window.modalsManager) {
            window.modalsManager.showModal('category-modal');
        }
    }

    // Сохранение категории
    async saveCategory() {
        const form = document.getElementById('category-form');
        const formData = new FormData(form);

        const categoryData = {
            name: formData.get('category-name').trim(),
            type: formData.get('category-type'),
            icon: formData.get('category-icon'),
            color: formData.get('category-color')
        };

        // Валидация
        if (!categoryData.name) {
            showToast('Введите название категории', 'error');
            return;
        }

        // Проверка на дублирование
        const existingCategory = this.categories.find(cat => 
            cat.name.toLowerCase() === categoryData.name.toLowerCase() && 
            cat.type === categoryData.type &&
            (!this.editingCategory || cat.id !== this.editingCategory.id)
        );

        if (existingCategory) {
            showToast('Категория с таким названием уже существует', 'error');
            return;
        }

        try {
            if (this.editingCategory) {
                // Редактирование
                const updatedCategory = {
                    ...this.editingCategory,
                    ...categoryData
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.updateCategory(updatedCategory);
                } else {
                    const categories = storageManager.get('categories', []);
                    const index = categories.findIndex(cat => cat.id === this.editingCategory.id);
                    if (index !== -1) {
                        categories[index] = updatedCategory;
                        storageManager.save('categories', categories);
                    }
                }

                showToast('Категория обновлена', 'success');
            } else {
                // Создание новой
                const newCategory = {
                    id: helpers.generateId(),
                    ...categoryData,
                    isDefault: false,
                    createdAt: new Date().toISOString()
                };

                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.addCategory(newCategory);
                } else {
                    const categories = storageManager.get('categories', []);
                    categories.push(newCategory);
                    storageManager.save('categories', categories);
                }

                showToast('Категория добавлена', 'success');
            }

            // Перезагружаем данные
            await this.loadCategories();
            this.renderCategories();
            this.updateStats();

            // Закрываем модальное окно
            if (window.modalsManager) {
                window.modalsManager.hideModal('category-modal');
            }

        } catch (error) {
            helpers.log('Ошибка сохранения категории', error, 'error');
            showToast('Ошибка сохранения категории', 'error');
        }
    }

    // Редактирование категории
    editCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
            this.showCategoryModal(category);
        }
    }

    // Удаление категории
    async deleteCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        if (category.isDefault) {
            showToast('Нельзя удалить системную категорию', 'error');
            return;
        }

        // Проверяем, используется ли категория
        if (category.operationsCount > 0) {
            const confirmed = await window.modalsManager.showConfirmation(
                'Удаление категории',
                `Категория "${category.name}" используется в ${category.operationsCount} операциях. При удалении категории эти операции будут перемещены в категорию "Другое". Продолжить?`,
                'Удалить',
                'danger'
            );

            if (!confirmed) return;
        } else {
            const confirmed = await window.modalsManager.showConfirmation(
                'Удаление категории',
                `Вы уверены, что хотите удалить категорию "${category.name}"?`,
                'Удалить',
                'danger'
            );

            if (!confirmed) return;
        }

        try {
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                await window.dbManager.deleteCategory(categoryId);
            } else {
                // Удаляем из localStorage
                const categories = storageManager.get('categories', []);
                const updatedCategories = categories.filter(cat => cat.id !== categoryId);
                storageManager.save('categories', updatedCategories);

                // Обновляем операции, перемещая их в категорию "Другое"
                const operations = storageManager.get('operations', []);
                const defaultCategory = category.type === 'income' ? 'Другое' : 'Другое';
                const updatedOperations = operations.map(op => 
                    op.category === category.name ? { ...op, category: defaultCategory } : op
                );
                storageManager.save('operations', updatedOperations);
            }

            await this.loadCategories();
            this.renderCategories();
            this.updateStats();
            showToast('Категория удалена', 'success');

        } catch (error) {
            helpers.log('Ошибка удаления категории', error, 'error');
            showToast('Ошибка удаления категории', 'error');
        }
    }

    // Получение категорий для селекта
    getCategoriesForSelect(type = null) {
        let categories = this.categories;
        if (type) {
            categories = categories.filter(cat => cat.type === type);
        }
        return categories.map(cat => ({
            value: cat.name,
            label: cat.name,
            icon: cat.icon,
            color: cat.color
        }));
    }

    // Поиск категории по названию
    findCategoryByName(name) {
        return this.categories.find(cat => cat.name === name);
    }
}

// Создание глобального экземпляра
const categoriesPage = new CategoriesPage();

// Экспорт для глобального использования
window.categoriesPage = categoriesPage;