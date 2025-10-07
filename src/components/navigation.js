// ===== УПРАВЛЕНИЕ НАВИГАЦИЕЙ =====

class NavigationManager {
    constructor() {
        this.currentPage = 'home';
        this.pages = ['home', 'operations', 'categories', 'limits', 'goals', 'settings'];
        this.setupEventListeners();
        this.loadCurrentPage();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики навигационных кнопок
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-page]');
            if (navItem) {
                e.preventDefault();
                const page = navItem.dataset.page;
                this.navigateTo(page);
            }
        });

        // Обработка кнопки "Показать все" на главной странице
        document.addEventListener('click', (e) => {
            const showAllBtn = e.target.closest('[data-page="operations"]');
            if (showAllBtn && showAllBtn.classList.contains('btn-secondary')) {
                e.preventDefault();
                this.navigateTo('operations');
            }
        });

        // Обработка истории браузера
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'home';
            this.navigateTo(page, false);
        });
    }

    // Навигация к странице
    navigateTo(page, addToHistory = true) {
        if (!this.pages.includes(page)) {
            helpers.log(`Неизвестная страница: ${page}`, null, 'warn');
            return;
        }

        // Скрываем текущую страницу
        this.hidePage(this.currentPage);

        // Показываем новую страницу
        this.showPage(page);

        // Обновляем навигацию
        this.updateNavigation(page);

        // Добавляем в историю браузера
        if (addToHistory) {
            history.pushState({ page }, '', `#${page}`);
        }

        this.currentPage = page;

        // Сохраняем состояние
        storageManager.saveAppState({ currentPage: page });

        // Загружаем данные для страницы
        this.loadPageData(page);

        helpers.log(`Переход на страницу: ${page}`);
    }

    // Скрытие страницы
    hidePage(page) {
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.remove('active');
            // Добавляем небольшую задержку для плавности
            setTimeout(() => {
                pageElement.style.display = 'none';
            }, 150);
        }
    }

    // Показ страницы
    showPage(page) {
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.style.display = 'block';
            // Небольшая задержка для плавности анимации
            setTimeout(() => {
                pageElement.classList.add('active');
            }, 10);
        }
    }

    // Обновление активной навигации
    updateNavigation(page) {
        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем активный класс к текущей кнопке
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem && activeItem.classList.contains('nav-item')) {
            activeItem.classList.add('active');
        }
    }

    // Загрузка текущей страницы из URL или localStorage
    loadCurrentPage() {
        // Проверяем URL hash
        const hash = window.location.hash.substr(1);
        if (hash && this.pages.includes(hash)) {
            this.currentPage = hash;
        } else {
            // Загружаем из localStorage
            const appState = storageManager.getAppState();
            this.currentPage = appState.currentPage || 'home';
        }

        this.navigateTo(this.currentPage, false);
    }

    // Загрузка данных для страницы
    async loadPageData(page) {
        try {
            switch (page) {
                case 'home':
                    await this.loadHomePage();
                    break;
                case 'operations':
                    await this.loadOperationsPage();
                    break;
                case 'categories':
                    await this.loadCategoriesPage();
                    break;
                case 'limits':
                    await this.loadLimitsPage();
                    break;
                case 'goals':
                    await this.loadGoalsPage();
                    break;
                case 'settings':
                    await this.loadSettingsPage();
                    break;
            }
        } catch (error) {
            helpers.log(`Ошибка загрузки данных для страницы ${page}`, error, 'error');
        }
    }

    // Загрузка главной страницы
    async loadHomePage() {
        // Загружаем данные пользователей
        if (window.userCardsManager) {
            await window.userCardsManager.loadUserData();
        }

        // Загружаем последние операции
        await this.loadRecentOperations();
    }

    // Загрузка последних операций
    async loadRecentOperations() {
        const container = document.getElementById('recent-operations-list');
        if (!container) return;

        try {
            let operations = [];

            // Пытаемся загрузить из Firebase
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                const userData = await window.authManager.getUserData();
                if (userData.budgetId) {
                    operations = await window.dbManager.getOperations(userData.budgetId, { limit: 5 });
                }
            } else {
                // Загружаем из localStorage
                operations = storageManager.get('operations', []).slice(0, 5);
            }

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
                        <div class="operation-title">${operation.category}</div>
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

        } catch (error) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить операции</p>
                </div>
            `;
            helpers.log('Ошибка загрузки последних операций', error, 'error');
        }
    }

    // Загрузка страницы операций
    async loadOperationsPage() {
        // Эта функция будет расширена в файле pages/operations.js
        helpers.log('Загрузка страницы операций');
    }

    // Загрузка страницы категорий
    async loadCategoriesPage() {
        helpers.log('Загрузка страницы категорий');
    }

    // Загрузка страницы лимитов
    async loadLimitsPage() {
        helpers.log('Загрузка страницы лимитов');
    }

    // Загрузка страницы целей
    async loadGoalsPage() {
        helpers.log('Загрузка страницы целей');
    }

    // Загрузка страницы настроек
    async loadSettingsPage() {
        // Загружаем текущие настройки
        const settings = storageManager.getUserSettings();
        
        // Обновляем элементы формы
        const currencySelect = document.getElementById('default-currency');
        const themeSelect = document.getElementById('theme-select');
        const budgetIdDisplay = document.getElementById('current-budget-id');

        if (currencySelect) {
            currencySelect.value = settings.currency;
        }

        if (themeSelect) {
            themeSelect.value = settings.theme;
        }

        if (budgetIdDisplay) {
            try {
                const userData = await window.authManager.getUserData();
                budgetIdDisplay.textContent = userData.budgetId || 'Не установлен';
            } catch (error) {
                budgetIdDisplay.textContent = 'Не доступен';
            }
        }

        this.setupSettingsHandlers();
    }

    // Настройка обработчиков для страницы настроек
    setupSettingsHandlers() {
        // Обработчик изменения валюты
        const currencySelect = document.getElementById('default-currency');
        if (currencySelect) {
            currencySelect.addEventListener('change', async (e) => {
                const newCurrency = e.target.value;
                const settings = storageManager.getUserSettings();
                const oldCurrency = settings.currency;

                if (newCurrency !== oldCurrency) {
                    await currency.handleCurrencyChange(newCurrency, oldCurrency);
                }
            });
        }

        // Обработчик изменения темы
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                this.changeTheme(newTheme);
            });
        }

        // Обработчик копирования ID бюджета
        const copyBtn = document.getElementById('copy-budget-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const budgetId = document.getElementById('current-budget-id').textContent;
                const success = await helpers.copyToClipboard(budgetId);
                
                if (success) {
                    showToast('ID бюджета скопирован в буфер обмена', 'success');
                } else {
                    showToast('Не удалось скопировать ID', 'error');
                }
            });
        }
    }

    // Смена темы
    changeTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Обновляем настройки
        const settings = storageManager.getUserSettings();
        settings.theme = theme;
        storageManager.saveUserSettings(settings);

        // Обновляем иконку переключателя темы
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }

        // Уведомляем компоненты об изменении темы
        if (window.userCardsManager) {
            window.userCardsManager.updateTheme(theme);
        }

        showToast(`Тема изменена на ${theme === 'dark' ? 'тёмную' : 'светлую'}`, 'success');
    }

    // Получение текущей страницы
    getCurrentPage() {
        return this.currentPage;
    }

    // Проверка, активна ли страница
    isPageActive(page) {
        return this.currentPage === page;
    }

    // Обновление индикатора загрузки для страницы
    setPageLoading(page, loading = true) {
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            if (loading) {
                pageElement.classList.add('loading');
            } else {
                pageElement.classList.remove('loading');
            }
        }
    }
}

// Создание глобального экземпляра
const navigationManager = new NavigationManager();

// Экспорт для глобального использования
window.navigationManager = navigationManager;
window.navigateTo = (page) => navigationManager.navigateTo(page);