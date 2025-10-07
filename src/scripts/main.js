// ===== ГЛАВНЫЙ ФАЙЛ ЗАПУСКА ПРИЛОЖЕНИЯ =====

// Глобальные переменные
window.APP_VERSION = '1.0.0';
window.APP_NAME = 'Family Budget';

// Загрузка и инициализация всех компонентов
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Запуск Family Budget App v' + window.APP_VERSION);
        
        // Показываем индикатор загрузки
        showAppLoader(true);

        // Инициализируем компоненты в правильном порядке
        await initializeApplication();

        // Скрываем индикатор загрузки
        showAppLoader(false);

        helpers.log('✅ Приложение успешно загружено');
        showToast('Добро пожаловать в Family Budget!', 'success');

    } catch (error) {
        console.error('❌ Ошибка запуска приложения', error);
        showAppError('Ошибка загрузки приложения. Попробуйте обновить страницу.');
    }
});

// Инициализация приложения
async function initializeApplication() {
    // 1. Инициализируем утилиты
    if (window.storageManager) {
        await window.storageManager.init();
    }

    if (window.currency) {
        await window.currency.init();
    }

    // 2. Инициализируем Firebase (если доступен)
    if (window.initializeFirebase) {
        window.initializeFirebase();
    }

    // 3. Инициализируем менеджеры
    if (window.authManager) {
        await window.authManager.init();
    }

    if (window.dbManager) {
        await window.dbManager.init();
    }

    if (window.operationsManager) {
        await window.operationsManager.init();
    }

    // 4. Инициализируем компоненты интерфейса
    if (window.modalsManager) {
        await window.modalsManager.init();
    }

    if (window.userCardsManager) {
        await window.userCardsManager.init();
    }

    // 5. Загружаем настройки и применяем тему
    applyUserSettings();

    // 6. Инициализируем навигацию (последним)
    if (window.navigationManager) {
        // navigationManager уже инициализируется автоматически
        helpers.log('Навигация готова');
    }

    // 7. Настраиваем автоматические процессы
    setupAutoProcesses();
}

// Применение пользовательских настроек
function applyUserSettings() {
    const settings = storageManager.getUserSettings();
    
    // Применяем тему
    document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Обновляем заголовок
    document.title = `${window.APP_NAME} - ${settings.currency}`;
    
    // Применяем язык
    document.documentElement.setAttribute('lang', settings.language || 'ru');
}

// Настройка автоматических процессов
function setupAutoProcesses() {
    // Автосохранение каждые 30 секунд
    setInterval(() => {
        if (document.hidden) return; // Не сохраняем, если вкладка неактивна
        
        try {
            // Здесь можно добавить логику автосохранения
            // storageManager.saveAll();
        } catch (error) {
            helpers.log('Ошибка автосохранения', error, 'warn');
        }
    }, 30000);

    // Обновление курсов валют каждый час
    setInterval(async () => {
        const settings = storageManager.getUserSettings();
        if (settings.currencyAutoUpdate && window.currency) {
            try {
                await window.currency.updateRates();
                helpers.log('Курсы валют обновлены автоматически');
            } catch (error) {
                helpers.log('Ошибка автообновления курсов', error, 'warn');
            }
        }
    }, 60 * 60 * 1000);

    // Проверка лимитов при видимости страницы
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.limitsPage) {
            // Можно добавить проверку лимитов
        }
    });
}

// Показ/скрытие индикатора загрузки
function showAppLoader(show) {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// Показ ошибки приложения
function showAppError(message) {
    const errorContainer = document.getElementById('app-error');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-banner">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <h3>Ошибка приложения</h3>
                    <p>${message}</p>
                </div>
                <button onclick="window.location.reload()" class="btn btn-outline">
                    <i class="fas fa-refresh"></i> Обновить
                </button>
            </div>
        `;
        errorContainer.style.display = 'block';
    }
}

// Обработчики глобальных событий
window.addEventListener('error', (event) => {
    helpers.log('Глобальная ошибка JavaScript', event.error, 'error');
    
    // Можно показать пользователю уведомление о критической ошибке
    if (event.error && event.error.message.includes('ChunkLoadError')) {
        showToast('Обнаружено обновление приложения. Перезагрузите страницу.', 'warning', 10000);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    helpers.log('Необработанная ошибка Promise', event.reason, 'error');
});

// Обработка онлайн/офлайн статуса
window.addEventListener('online', () => {
    showToast('Соединение восстановлено', 'success');
    helpers.log('Приложение онлайн');
});

window.addEventListener('offline', () => {
    showToast('Соединение потеряно. Работаем в автономном режиме.', 'warning');
    helpers.log('Приложение офлайн');
});

// Обработка смены темы системы
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener((e) => {
        const settings = storageManager.getUserSettings();
        if (settings.theme === 'auto') {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    });
}

helpers.log('Main.js загружен');