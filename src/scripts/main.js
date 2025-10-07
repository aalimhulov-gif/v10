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
        
        // Показываем статус загрузки
        updateLoadingStatus('Инициализация модулей...');

        // Инициализируем компоненты в правильном порядке
        await initializeApplication();

        // Скрываем индикатор загрузки
        showAppLoader(false);
        
        updateLoadingStatus('Приложение готово!');

    } catch (error) {
        console.error('❌ Ошибка запуска приложения:', error);
        showAppError('Ошибка загрузки приложения: ' + error.message);
    }
});

// Ожидание загрузки всех модулей
async function waitForModules() {
    const maxWait = 5000; // 5 секунд максимум
    const startTime = Date.now();
    
    updateLoadingStatus('Ожидание загрузки модулей...');
    
    while (Date.now() - startTime < maxWait) {
        const modules = {
            storageManager: window.storageManager,
            currency: window.currency,
            helpers: window.helpers,
            authManager: window.authManager,
            showToast: window.showToast
        };
        
        const loadedCount = Object.values(modules).filter(m => m).length;
        updateLoadingStatus(`Загружено модулей: ${loadedCount}/5`);
        
        if (loadedCount >= 4) { // Минимум 4 из 5 модулей
            console.log('✅ Достаточно модулей загружено');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ Не все модули загрузились за отведенное время');
}

// Инициализация приложения
async function initializeApplication() {
    console.log('📋 Начинаем инициализацию приложения...');
    
    // Ждем загрузки всех модулей
    await waitForModules();
    
    // 1. Инициализируем утилиты
    updateLoadingStatus('Инициализация StorageManager...');
    if (window.storageManager && typeof window.storageManager.init === 'function') {
        try {
            await window.storageManager.init();
            console.log('✅ StorageManager инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации StorageManager:', error);
        }
    } else {
        console.warn('⚠️ StorageManager не найден или не имеет метода init');
    }

    updateLoadingStatus('Инициализация Currency...');
    if (window.currency && typeof window.currency.init === 'function') {
        try {
            await window.currency.init();
            console.log('✅ Currency инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации Currency:', error);
        }
    } else {
        console.warn('⚠️ Currency не найден или не имеет метода init');
    }

    // 2. Инициализируем Firebase (если доступен)
    updateLoadingStatus('Инициализация Firebase...');
    if (window.initializeFirebase && typeof window.initializeFirebase === 'function') {
        try {
            window.initializeFirebase();
            console.log('✅ Firebase инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации Firebase:', error);
        }
    } else {
        console.warn('⚠️ Firebase не найден');
    }

    // 3. Инициализируем менеджеры
    updateLoadingStatus('Инициализация AuthManager...');
    if (window.authManager && typeof window.authManager.init === 'function') {
        try {
            await window.authManager.init();
            console.log('✅ AuthManager инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации AuthManager:', error);
        }
    } else {
        console.warn('⚠️ AuthManager не найден или не имеет метода init');
    }

    // 4. Инициализируем UI компоненты (упрощенно)
    updateLoadingStatus('Инициализация интерфейса...');
    await initializeSimpleUI();

    console.log('🎉 Приложение полностью инициализировано');
}

// Простая инициализация UI
async function initializeSimpleUI() {
    try {
        // Применяем пользовательские настройки
        applyUserSettings();
        
        // Показываем базовый интерфейс
        showBasicInterface();
        
        console.log('✅ UI инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации UI:', error);
    }
}

// Применение пользовательских настроек
function applyUserSettings() {
    try {
        const settings = window.storageManager ? 
            window.storageManager.getUserSettings() : 
            { theme: 'dark', currency: 'PLN' };
        
        // Применяем тему
        document.documentElement.setAttribute('data-theme', settings.theme);
        
        // Обновляем заголовок
        document.title = `${window.APP_NAME} - ${settings.currency}`;
        
        console.log('✅ Настройки применены:', settings);
    } catch (error) {
        console.error('❌ Ошибка применения настроек:', error);
    }
}

// Показ базового интерфейса
function showBasicInterface() {
    const content = document.getElementById('content');
    if (content) {
        content.innerHTML = `
            <div class="welcome-screen">
                <h2>🎉 Добро пожаловать!</h2>
                <p>Семейный бюджет для Артура и Валерии</p>
                <div class="features">
                    <div class="feature">
                        <i class="fas fa-wallet"></i>
                        <span>Управление бюджетом</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-chart-line"></i>
                        <span>Аналитика расходов</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-sync"></i>
                        <span>Синхронизация данных</span>
                    </div>
                </div>
                <button onclick="startDemo()" class="btn-primary">
                    <i class="fas fa-play"></i> Начать работу
                </button>
            </div>
        `;
    }
}

// Демо-функция для тестирования
function startDemo() {
    if (window.showToast) {
        window.showToast('Приложение готово к работе!', 'success');
    } else {
        alert('Приложение готово к работе!');
    }
    
    console.log('🎮 Демо режим запущен');
}

// Обновление статуса загрузки
function updateLoadingStatus(message) {
    const statusElement = document.getElementById('module-status');
    if (statusElement) {
        statusElement.innerHTML = `<p style="color: #666; font-style: italic;">${message}</p>`;
    }
    console.log('📊 Статус:', message);
}

// Показ/скрытие индикатора загрузки
function showAppLoader(show) {
    const loader = document.getElementById('loader');
    const loadingStatus = document.getElementById('loading-status');
    
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
    
    if (loadingStatus) {
        loadingStatus.style.display = show ? 'block' : 'none';
    }
}

// Показ ошибки приложения
function showAppError(message) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.style.display = 'block';
        const messageP = errorContainer.querySelector('p');
        if (messageP) {
            messageP.textContent = message;
        }
    } else {
        // Создаем элемент ошибки если его нет
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            color: red; 
            margin: 20px; 
            padding: 20px; 
            border: 1px solid red; 
            border-radius: 5px;
            background: #ffe6e6;
        `;
        errorDiv.innerHTML = `
            <h3>❌ Ошибка приложения</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 10px;">🔄 Обновить страницу</button>
        `;
        document.body.appendChild(errorDiv);
    }
    
    // Скрываем загрузку
    showAppLoader(false);
}

// Глобальная обработка ошибок
window.addEventListener('error', function(event) {
    console.error('🚨 Глобальная ошибка:', event.error);
    showAppError('Произошла непредвиденная ошибка: ' + event.error.message);
});

// Обработка unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Необработанная ошибка Promise:', event.reason);
    showAppError('Ошибка Promise: ' + event.reason);
    event.preventDefault();
});

// Экспортируем глобальные функции
window.startDemo = startDemo;

console.log('📱 Main.js загружен успешно');