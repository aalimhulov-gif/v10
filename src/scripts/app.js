// ===== ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ =====

class FamilyBudgetApp {
    constructor() {
        this.isInitialized = false;
        this.version = '1.0.0';
        this.components = {};
        this.pages = {};
    }

    // Инициализация приложения
    async init() {
        if (this.isInitialized) {
            helpers.log('Приложение уже инициализировано');
            return;
        }

        try {
            helpers.log('Инициализация Family Budget App v' + this.version);

            // Показываем загрузку
            this.showLoading();

            // Инициализируем компоненты в правильном порядке
            await this.initializeCore();
            await this.initializeAuth();
            await this.initializeDatabase();
            await this.initializeComponents();
            await this.initializePages();
            await this.initializeNavigation();

            // Применяем настройки
            await this.applySettings();

            // Загружаем данные
            await this.loadInitialData();

            // Настраиваем автоматические процессы
            this.setupAutoProcesses();

            // Регистрируем Service Worker
            await this.registerServiceWorker();

            this.isInitialized = true;
            this.hideLoading();

            helpers.log('Приложение успешно инициализировано');
            this.showToast('Приложение готово к работе', 'success');

        } catch (error) {
            helpers.log('Ошибка инициализации приложения', error, 'error');
            this.hideLoading();
            this.showErrorMessage('Ошибка загрузки приложения. Попробуйте обновить страницу.');
        }
    }

    // Инициализация основных компонентов
    async initializeCore() {
        // Инициализируем хранилище
        if (window.storageManager) {
            await window.storageManager.init();
            this.components.storage = window.storageManager;
        }

        // Инициализируем утилиты
        if (window.helpers) {
            this.components.helpers = window.helpers;
        }

        // Инициализируем валюты
        if (window.currency) {
            await window.currency.init();
            this.components.currency = window.currency;
        }
    }

    // Инициализация аутентификации
    async initializeAuth() {
        // Будет реализовано при создании authManager
        helpers.log('Инициализация аутентификации...');
    }

    // Инициализация базы данных
    async initializeDatabase() {
        // Будет реализовано при создании dbManager
        helpers.log('Инициализация базы данных...');
    }

    // Инициализация компонентов интерфейса
    async initializeComponents() {
        // Модальные окна
        if (window.modalsManager) {
            await window.modalsManager.init();
            this.components.modals = window.modalsManager;
        }

        // Карточки пользователей
        if (window.userCardsManager) {
            await window.userCardsManager.init();
            this.components.userCards = window.userCardsManager;
        }

        // Навигация
        if (window.navigationManager) {
            this.components.navigation = window.navigationManager;
        }
    }

    // Инициализация страниц
    async initializePages() {
        // Главная страница
        if (window.homePage) {
            this.pages.home = window.homePage;
        }

        // Страница операций
        if (window.operationsPage) {
            this.pages.operations = window.operationsPage;
        }

        // Страница категорий
        if (window.categoriesPage) {
            this.pages.categories = window.categoriesPage;
        }

        // Страница лимитов
        if (window.limitsPage) {
            this.pages.limits = window.limitsPage;
        }

        // Страница целей
        if (window.goalsPage) {
            this.pages.goals = window.goalsPage;
        }

        // Страница настроек
        if (window.settingsPage) {
            this.pages.settings = window.settingsPage;
        }
    }

    // Инициализация навигации
    async initializeNavigation() {
        // Обработчик изменения страницы
        document.addEventListener('pageChanged', (e) => {
            this.onPageChanged(e.detail.page);
        });

        // Инициализируем текущую страницу
        const currentPage = this.components.navigation?.getCurrentPage() || 'home';
        await this.onPageChanged(currentPage);
    }

    // Обработчик смены страницы
    async onPageChanged(page) {
        try {
            // Деинициализируем предыдущую страницу
            Object.values(this.pages).forEach(pageComponent => {
                if (typeof pageComponent.destroy === 'function') {
                    pageComponent.destroy();
                }
            });

            // Инициализируем новую страницу
            const pageComponent = this.pages[page];
            if (pageComponent && typeof pageComponent.init === 'function') {
                await pageComponent.init();
            }

        } catch (error) {
            helpers.log(`Ошибка при переключении на страницу ${page}`, error, 'error');
        }
    }

    // Применение настроек
    async applySettings() {
        const settings = storageManager.getUserSettings();

        // Применяем тему
        document.documentElement.setAttribute('data-theme', settings.theme);

        // Применяем язык (если будет поддержка)
        document.documentElement.setAttribute('lang', settings.language || 'ru');

        // Обновляем заголовок
        document.title = `Family Budget - ${settings.currency}`;
    }

    // Загрузка начальных данных
    async loadInitialData() {
        try {
            // Обновляем курсы валют
            if (this.components.currency) {
                const settings = storageManager.getUserSettings();
                if (settings.currencyAutoUpdate) {
                    await this.components.currency.updateRates();
                }
            }

            // Инициализируем категории по умолчанию, если их нет
            const categories = storageManager.get('categories', []);
            if (categories.length === 0 && window.categoriesPage) {
                const defaultCategories = window.categoriesPage.getDefaultCategories();
                storageManager.save('categories', defaultCategories);
            }

        } catch (error) {
            helpers.log('Ошибка загрузки начальных данных', error, 'warn');
        }
    }

    // Настройка автоматических процессов
    setupAutoProcesses() {
        // Автоматическое сохранение
        this.setupAutoSave();

        // Автоматическое обновление курсов валют
        this.setupCurrencyUpdates();

        // Автоматическое резервное копирование
        this.setupAutoBackup();

        // Обработка видимости страницы
        this.setupVisibilityHandler();
    }

    // Автоматическое сохранение
    setupAutoSave() {
        // Сохраняем данные каждые 30 секунд при наличии изменений
        let hasUnsavedChanges = false;

        // Отслеживаем изменения
        const markUnsaved = () => { hasUnsavedChanges = true; };
        
        document.addEventListener('dataChanged', markUnsaved);
        
        setInterval(async () => {
            if (hasUnsavedChanges) {
                try {
                    await this.saveData();
                    hasUnsavedChanges = false;
                } catch (error) {
                    helpers.log('Ошибка автосохранения', error, 'warn');
                }
            }
        }, 30000);
    }

    // Автоматическое обновление курсов валют
    setupCurrencyUpdates() {
        // Обновляем курсы каждый час
        setInterval(async () => {
            const settings = storageManager.getUserSettings();
            if (settings.currencyAutoUpdate && this.components.currency) {
                try {
                    await this.components.currency.updateRates();
                } catch (error) {
                    helpers.log('Ошибка автообновления курсов', error, 'warn');
                }
            }
        }, 60 * 60 * 1000);
    }

    // Автоматическое резервное копирование
    setupAutoBackup() {
        // Создаем резервную копию раз в день
        const lastBackup = storageManager.get('lastAutoBackup');
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        if (!lastBackup || new Date(lastBackup) < oneDayAgo) {
            setTimeout(async () => {
                const settings = storageManager.getUserSettings();
                if (settings.autoBackup) {
                    try {
                        await this.createAutoBackup();
                        storageManager.save('lastAutoBackup', now.toISOString());
                    } catch (error) {
                        helpers.log('Ошибка автоматического резервного копирования', error, 'warn');
                    }
                }
            }, 5000); // Через 5 секунд после загрузки
        }
    }

    // Обработка видимости страницы
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Страница скрыта - сохраняем данные
                this.saveData().catch(error => {
                    helpers.log('Ошибка сохранения при сокрытии страницы', error, 'warn');
                });
            } else {
                // Страница видима - обновляем данные
                this.refreshData().catch(error => {
                    helpers.log('Ошибка обновления при возврате на страницу', error, 'warn');
                });
            }
        });
    }

    // Сохранение данных
    async saveData() {
        // Если авторизован и есть подключение к БД, синхронизируем
        if (window.authManager?.isAuthenticated() && window.dbManager) {
            try {
                await this.syncWithServer();
            } catch (error) {
                helpers.log('Ошибка синхронизации с сервером', error, 'warn');
            }
        }
    }

    // Обновление данных
    async refreshData() {
        // Обновляем текущую страницу
        const currentPage = this.components.navigation?.getCurrentPage();
        if (currentPage && this.pages[currentPage]) {
            const pageComponent = this.pages[currentPage];
            if (typeof pageComponent.loadData === 'function') {
                try {
                    await pageComponent.loadData();
                } catch (error) {
                    helpers.log(`Ошибка обновления данных страницы ${currentPage}`, error, 'warn');
                }
            }
        }
    }

    // Синхронизация с сервером
    async syncWithServer() {
        // Будет реализовано при создании dbManager
        helpers.log('Синхронизация с сервером...');
    }

    // Создание автоматической резервной копии
    async createAutoBackup() {
        const backupData = {
            version: this.version,
            timestamp: new Date().toISOString(),
            auto: true,
            operations: storageManager.get('operations', []),
            categories: storageManager.get('categories', []),
            limits: storageManager.get('limits', []),
            goals: storageManager.get('goals', [])
        };

        // Сохраняем в localStorage с ротацией (максимум 3 автобекапа)
        const autoBackups = storageManager.get('autoBackups', []);
        autoBackups.unshift(backupData);
        
        // Оставляем только последние 3
        if (autoBackups.length > 3) {
            autoBackups.splice(3);
        }
        
        storageManager.save('autoBackups', autoBackups);
    }

    // Регистрация Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                helpers.log('Service Worker зарегистрирован', registration);
            } catch (error) {
                helpers.log('Ошибка регистрации Service Worker', error, 'warn');
            }
        }
    }

    // Показ загрузки
    showLoading() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    // Скрытие загрузки
    hideLoading() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // Показ уведомления
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Показ сообщения об ошибке
    showErrorMessage(message) {
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-banner">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }

    // Получение информации о приложении
    getInfo() {
        return {
            version: this.version,
            initialized: this.isInitialized,
            components: Object.keys(this.components),
            pages: Object.keys(this.pages),
            currentPage: this.components.navigation?.getCurrentPage()
        };
    }

    // Перезапуск приложения
    async restart() {
        helpers.log('Перезапуск приложения...');
        
        // Очищаем компоненты
        Object.values(this.components).forEach(component => {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        Object.values(this.pages).forEach(page => {
            if (typeof page.destroy === 'function') {
                page.destroy();
            }
        });

        this.isInitialized = false;
        this.components = {};
        this.pages = {};

        // Перезапускаем
        await this.init();
    }
}

// Глобальная функция для показа уведомлений
function showToast(message, type = 'info', duration = 3000) {
    // Создаем элемент уведомления
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Добавляем в контейнер
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Показываем с анимацией
    setTimeout(() => toast.classList.add('show'), 10);

    // Автоматически скрываем
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Получение иконки для уведомления
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Создание глобального экземпляра приложения
const app = new FamilyBudgetApp();

// Экспорт для глобального использования
window.app = app;
window.showToast = showToast;

// Автозапуск при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Обработка ошибок
window.addEventListener('error', (event) => {
    helpers.log('Глобальная ошибка JavaScript', event.error, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    helpers.log('Необработанная ошибка Promise', event.reason, 'error');
});

helpers.log('Family Budget App загружен');