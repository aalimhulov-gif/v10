// ===== КОМПОНЕНТ СТРАНИЦЫ ОПЕРАЦИЙ =====

class OperationsPage {
    constructor() {
        this.currentFilter = {
            type: 'all', // all, income, expense
            category: 'all',
            user: 'all',
            dateFrom: '',
            dateTo: '',
            amountFrom: '',
            amountTo: ''
        };
        this.operations = [];
        this.filteredOperations = [];
        this.currentSort = { field: 'date', direction: 'desc' };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        // Кнопки добавления операций
        document.addEventListener('click', (e) => {
            if (e.target.closest('#add-income-btn')) {
                this.showOperationModal('income');
            } else if (e.target.closest('#add-expense-btn')) {
                this.showOperationModal('expense');
            } else if (e.target.closest('#clear-filters-btn')) {
                this.clearFilters();
            } else if (e.target.closest('#export-operations-btn')) {
                this.exportOperations();
            }

            // Редактирование операции
            const editBtn = e.target.closest('.edit-operation-btn');
            if (editBtn) {
                const operationId = editBtn.dataset.id;
                this.editOperation(operationId);
            }

            // Удаление операции
            const deleteBtn = e.target.closest('.delete-operation-btn');
            if (deleteBtn) {
                const operationId = deleteBtn.dataset.id;
                this.deleteOperation(operationId);
            }

            // Сортировка
            const sortBtn = e.target.closest('.sort-btn');
            if (sortBtn) {
                const field = sortBtn.dataset.sort;
                this.sortOperations(field);
            }

            // Пагинация
            const pageBtn = e.target.closest('.page-btn');
            if (pageBtn) {
                const page = parseInt(pageBtn.dataset.page);
                this.changePage(page);
            }
        });

        // Фильтры
        document.addEventListener('change', (e) => {
            if (e.target.matches('#filter-type, #filter-category, #filter-user')) {
                this.updateFilter(e.target.id.replace('filter-', ''), e.target.value);
            }
        });

        // Фильтры по дате и сумме
        document.addEventListener('input', (e) => {
            if (e.target.matches('#filter-date-from, #filter-date-to, #filter-amount-from, #filter-amount-to')) {
                const filterType = e.target.id.replace('filter-', '').replace('-', '');
                this.updateFilter(filterType, e.target.value);
            }
        });

        // Поиск
        const searchInput = document.getElementById('operations-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.searchOperations(e.target.value);
            }, 300));
        }
    }

    // Инициализация страницы
    async init() {
        await this.loadOperations();
        this.setupFilters();
        this.renderOperations();
        this.updateStats();
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

            this.applyFiltersAndSort();

        } catch (error) {
            helpers.log('Ошибка загрузки операций', error, 'error');
            showToast('Ошибка загрузки операций', 'error');
        }
    }

    // Настройка фильтров
    setupFilters() {
        // Заполняем список категорий
        const categories = [...new Set(this.operations.map(op => op.category))];
        const categoryFilter = document.getElementById('filter-category');
        if (categoryFilter) {
            categoryFilter.innerHTML = `
                <option value="all">Все категории</option>
                ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            `;
        }

        // Заполняем список пользователей
        const users = [...new Set(this.operations.map(op => op.userName).filter(Boolean))];
        const userFilter = document.getElementById('filter-user');
        if (userFilter) {
            userFilter.innerHTML = `
                <option value="all">Все пользователи</option>
                ${users.map(user => `<option value="${user}">${user}</option>`).join('')}
            `;
        }
    }

    // Обновление фильтра
    updateFilter(filterType, value) {
        this.currentFilter[filterType] = value;
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOperations();
        this.updateStats();
    }

    // Очистка фильтров
    clearFilters() {
        this.currentFilter = {
            type: 'all',
            category: 'all',
            user: 'all',
            dateFrom: '',
            dateTo: '',
            amountFrom: '',
            amountTo: ''
        };

        // Очищаем элементы формы
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-user').value = 'all';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-amount-from').value = '';
        document.getElementById('filter-amount-to').value = '';
        document.getElementById('operations-search').value = '';

        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOperations();
        this.updateStats();
    }

    // Поиск операций
    searchOperations(query) {
        this.searchQuery = query.toLowerCase();
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOperations();
    }

    // Применение фильтров и сортировки
    applyFiltersAndSort() {
        let filtered = [...this.operations];

        // Фильтр по типу
        if (this.currentFilter.type !== 'all') {
            filtered = filtered.filter(op => op.type === this.currentFilter.type);
        }

        // Фильтр по категории
        if (this.currentFilter.category !== 'all') {
            filtered = filtered.filter(op => op.category === this.currentFilter.category);
        }

        // Фильтр по пользователю
        if (this.currentFilter.user !== 'all') {
            filtered = filtered.filter(op => op.userName === this.currentFilter.user);
        }

        // Фильтр по дате
        if (this.currentFilter.dateFrom) {
            filtered = filtered.filter(op => op.date >= this.currentFilter.dateFrom);
        }
        if (this.currentFilter.dateTo) {
            filtered = filtered.filter(op => op.date <= this.currentFilter.dateTo);
        }

        // Фильтр по сумме
        if (this.currentFilter.amountFrom) {
            filtered = filtered.filter(op => op.amount >= parseFloat(this.currentFilter.amountFrom));
        }
        if (this.currentFilter.amountTo) {
            filtered = filtered.filter(op => op.amount <= parseFloat(this.currentFilter.amountTo));
        }

        // Поиск по тексту
        if (this.searchQuery) {
            filtered = filtered.filter(op => 
                op.category.toLowerCase().includes(this.searchQuery) ||
                (op.description && op.description.toLowerCase().includes(this.searchQuery)) ||
                (op.userName && op.userName.toLowerCase().includes(this.searchQuery))
            );
        }

        // Сортировка
        filtered.sort((a, b) => {
            const aValue = a[this.currentSort.field];
            const bValue = b[this.currentSort.field];

            if (this.currentSort.field === 'date') {
                const aDate = new Date(aValue);
                const bDate = new Date(bValue);
                return this.currentSort.direction === 'asc' ? aDate - bDate : bDate - aDate;
            } else if (this.currentSort.field === 'amount') {
                return this.currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                const compare = aValue.localeCompare(bValue);
                return this.currentSort.direction === 'asc' ? compare : -compare;
            }
        });

        this.filteredOperations = filtered;
    }

    // Сортировка операций
    sortOperations(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'desc';
        }

        this.applyFiltersAndSort();
        this.renderOperations();
        this.updateSortButtons();
    }

    // Обновление кнопок сортировки
    updateSortButtons() {
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('asc', 'desc');
            if (btn.dataset.sort === this.currentSort.field) {
                btn.classList.add(this.currentSort.direction);
            }
        });
    }

    // Отображение операций
    renderOperations() {
        const container = document.getElementById('operations-list');
        if (!container) return;

        if (this.filteredOperations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Операции не найдены</h3>
                    <p>Попробуйте изменить фильтры или добавьте новую операцию</p>
                </div>
            `;
            this.renderPagination(0);
            return;
        }

        // Пагинация
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageOperations = this.filteredOperations.slice(startIndex, endIndex);

        container.innerHTML = pageOperations.map(operation => `
            <div class="operation-row" data-id="${operation.id}">
                <div class="operation-date">
                    ${helpers.formatDate(operation.date)}
                </div>
                <div class="operation-type">
                    <i class="fas fa-${operation.type === 'income' ? 'plus' : 'minus'}"></i>
                    <span class="${operation.type}">${operation.type === 'income' ? 'Доход' : 'Расход'}</span>
                </div>
                <div class="operation-category">
                    <i class="fas fa-${this.getCategoryIcon(operation.category)}"></i>
                    ${operation.category}
                </div>
                <div class="operation-description">
                    ${operation.description || '—'}
                </div>
                <div class="operation-user">
                    ${operation.userName || 'Пользователь'}
                </div>
                <div class="operation-amount ${operation.type}">
                    ${operation.type === 'income' ? '+' : '-'}${currency.format(operation.amount, operation.currency || 'PLN')}
                </div>
                <div class="operation-actions">
                    <button class="btn btn-sm btn-outline edit-operation-btn" data-id="${operation.id}" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-operation-btn" data-id="${operation.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.renderPagination(this.filteredOperations.length);
    }

    // Отображение пагинации
    renderPagination(totalItems) {
        const container = document.getElementById('operations-pagination');
        if (!container) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pages = [];
        const maxVisiblePages = 5;
        const halfVisible = Math.floor(maxVisiblePages / 2);

        let startPage = Math.max(1, this.currentPage - halfVisible);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Кнопка "Предыдущая"
        if (this.currentPage > 1) {
            pages.push(`<button class="btn btn-outline page-btn" data-page="${this.currentPage - 1}">←</button>`);
        }

        // Первая страница
        if (startPage > 1) {
            pages.push(`<button class="btn btn-outline page-btn" data-page="1">1</button>`);
            if (startPage > 2) {
                pages.push(`<span class="pagination-dots">...</span>`);
            }
        }

        // Видимые страницы
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage ? 'active' : '';
            pages.push(`<button class="btn btn-outline page-btn ${isActive}" data-page="${i}">${i}</button>`);
        }

        // Последняя страница
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(`<span class="pagination-dots">...</span>`);
            }
            pages.push(`<button class="btn btn-outline page-btn" data-page="${totalPages}">${totalPages}</button>`);
        }

        // Кнопка "Следующая"
        if (this.currentPage < totalPages) {
            pages.push(`<button class="btn btn-outline page-btn" data-page="${this.currentPage + 1}">→</button>`);
        }

        container.innerHTML = `
            <div class="pagination">
                ${pages.join('')}
                <div class="pagination-info">
                    Показано ${Math.min((this.currentPage - 1) * this.itemsPerPage + 1, totalItems)}-${Math.min(this.currentPage * this.itemsPerPage, totalItems)} из ${totalItems}
                </div>
            </div>
        `;
    }

    // Смена страницы
    changePage(page) {
        this.currentPage = page;
        this.renderOperations();
    }

    // Обновление статистики
    updateStats() {
        const totalOperations = this.filteredOperations.length;
        const totalIncome = this.filteredOperations
            .filter(op => op.type === 'income')
            .reduce((sum, op) => sum + op.amount, 0);
        const totalExpenses = this.filteredOperations
            .filter(op => op.type === 'expense')
            .reduce((sum, op) => sum + op.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Обновляем элементы статистики
        const totalElement = document.getElementById('stats-total');
        const incomeElement = document.getElementById('stats-income');
        const expensesElement = document.getElementById('stats-expenses');
        const balanceElement = document.getElementById('stats-balance');

        if (totalElement) totalElement.textContent = totalOperations;
        if (incomeElement) incomeElement.textContent = currency.format(totalIncome, 'PLN');
        if (expensesElement) expensesElement.textContent = currency.format(totalExpenses, 'PLN');
        if (balanceElement) {
            balanceElement.textContent = currency.format(balance, 'PLN');
            balanceElement.className = balance >= 0 ? 'positive' : 'negative';
        }
    }

    // Показ модального окна операции
    showOperationModal(type = 'expense', operationData = null) {
        if (window.modalsManager) {
            window.modalsManager.showOperationModal(type, operationData);
        }
    }

    // Редактирование операции
    async editOperation(operationId) {
        const operation = this.operations.find(op => op.id === operationId);
        if (operation) {
            this.showOperationModal(operation.type, operation);
        }
    }

    // Удаление операции
    async deleteOperation(operationId) {
        const operation = this.operations.find(op => op.id === operationId);
        if (!operation) return;

        const confirmed = await window.modalsManager.showConfirmation(
            'Удаление операции',
            `Вы уверены, что хотите удалить операцию "${operation.category}" на сумму ${currency.format(operation.amount, operation.currency)}?`,
            'Удалить',
            'danger'
        );

        if (confirmed) {
            try {
                if (window.authManager?.isAuthenticated() && window.dbManager) {
                    await window.dbManager.deleteOperation(operationId);
                } else {
                    const operations = storageManager.get('operations', []);
                    const updatedOperations = operations.filter(op => op.id !== operationId);
                    storageManager.save('operations', updatedOperations);
                }

                await this.loadOperations();
                showToast('Операция удалена', 'success');

            } catch (error) {
                helpers.log('Ошибка удаления операции', error, 'error');
                showToast('Ошибка удаления операции', 'error');
            }
        }
    }

    // Экспорт операций
    async exportOperations() {
        try {
            const csv = this.generateCSV();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `operations_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Операции экспортированы', 'success');

        } catch (error) {
            helpers.log('Ошибка экспорта операций', error, 'error');
            showToast('Ошибка экспорта операций', 'error');
        }
    }

    // Генерация CSV
    generateCSV() {
        const headers = ['Дата', 'Тип', 'Категория', 'Описание', 'Пользователь', 'Сумма', 'Валюта'];
        const csvContent = [
            headers.join(','),
            ...this.filteredOperations.map(op => [
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
}

// Функция debounce для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Создание глобального экземпляра
const operationsPage = new OperationsPage();

// Экспорт для глобального использования
window.operationsPage = operationsPage;