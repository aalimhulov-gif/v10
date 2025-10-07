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
        
        // Загружаем данные из localStorage
        loadFromLocalStorage();
        
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
            <!-- Заголовок с карточками пользователей -->
            <header class="app-header">
                <div class="header-content">
                    <div class="user-cards">
                        <div class="user-card" data-user="artur">
                            <div class="user-info">
                                <div class="user-avatar">👨</div>
                                <div class="user-details">
                                    <span class="user-name">Артур</span>
                                    <span class="user-balance" data-balance="0">0.00 PLN</span>
                                </div>
                            </div>
                            <div class="user-actions">
                                <button class="btn btn-small btn-income" onclick="addOperation('artur', 'income')" title="Добавить доход">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn btn-small btn-expense" onclick="addOperation('artur', 'expense')" title="Добавить расход">
                                    <i class="fas fa-minus"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="user-card" data-user="valeria">
                            <div class="user-info">
                                <div class="user-avatar">👩</div>
                                <div class="user-details">
                                    <span class="user-name">Валерия</span>
                                    <span class="user-balance" data-balance="0">0.00 PLN</span>
                                </div>
                            </div>
                            <div class="user-actions">
                                <button class="btn btn-small btn-income" onclick="addOperation('valeria', 'income')" title="Добавить доход">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn btn-small btn-expense" onclick="addOperation('valeria', 'expense')" title="Добавить расход">
                                    <i class="fas fa-minus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="header-controls">
                        <button id="theme-toggle" class="btn btn-icon" onclick="toggleTheme()" title="Переключить тему">
                            <i class="fas fa-moon"></i>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Навигация -->
            <nav class="app-nav">
                <button class="nav-item active" onclick="showPage('home')">
                    <i class="fas fa-home"></i>
                    <span>Главная</span>
                </button>
                <button class="nav-item" onclick="showPage('operations')">
                    <i class="fas fa-list"></i>
                    <span>Операции</span>
                </button>
                <button class="nav-item" onclick="showPage('categories')">
                    <i class="fas fa-tags"></i>
                    <span>Категории</span>
                </button>
                <button class="nav-item" onclick="showPage('limits')">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Лимиты</span>
                </button>
                <button class="nav-item" onclick="showPage('goals')">
                    <i class="fas fa-bullseye"></i>
                    <span>Цели</span>
                </button>
                <button class="nav-item" onclick="showPage('settings')">
                    <i class="fas fa-cog"></i>
                    <span>Настройки</span>
                </button>
            </nav>

            <!-- Контент страниц -->
            <main class="app-content">
                <!-- Главная страница -->
                <div id="page-home" class="page active">
                    <div class="page-header">
                        <h2>Обзор финансов</h2>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card income">
                            <div class="stat-icon">
                                <i class="fas fa-arrow-up"></i>
                            </div>
                            <div class="stat-content">
                                <h3>Доходы</h3>
                                <p class="stat-amount" id="total-income">0.00 PLN</p>
                            </div>
                        </div>

                        <div class="stat-card expense">
                            <div class="stat-icon">
                                <i class="fas fa-arrow-down"></i>
                            </div>
                            <div class="stat-content">
                                <h3>Расходы</h3>
                                <p class="stat-amount" id="total-expense">0.00 PLN</p>
                            </div>
                        </div>

                        <div class="stat-card balance">
                            <div class="stat-icon">
                                <i class="fas fa-wallet"></i>
                            </div>
                            <div class="stat-content">
                                <h3>Баланс</h3>
                                <p class="stat-amount" id="total-balance">0.00 PLN</p>
                            </div>
                        </div>
                    </div>

                    <div class="recent-operations">
                        <h3>Последние операции</h3>
                        <div id="recent-operations-list">
                            <p class="no-data">Операций пока нет. Добавьте первую операцию используя кнопки + и - в карточках пользователей.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Страницы операций, категорий и т.д. будут добавлены позже -->
                <div id="page-operations" class="page" style="display: none;">
                    <h2>Операции</h2>
                    <p>Список всех операций будет здесь</p>
                </div>
                
                <div id="page-categories" class="page" style="display: none;">
                    <h2>Категории</h2>
                    <p>Управление категориями</p>
                </div>
                
                <div id="page-limits" class="page" style="display: none;">
                    <h2>Лимиты</h2>
                    <p>Управление лимитами расходов</p>
                </div>
                
                <div id="page-goals" class="page" style="display: none;">
                    <h2>Цели</h2>
                    <p>Финансовые цели</p>
                </div>
                
                <div id="page-settings" class="page" style="display: none;">
                    <h2>Настройки</h2>
                    <p>Настройки приложения</p>
                </div>
            </main>
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

// Система управления операциями и балансом
let userBalances = { artur: 0, valeria: 0 };
let operations = [];

// Добавление операции
function addOperation(user, type) {
    const amount = prompt(`Введите сумму ${type === 'income' ? 'дохода' : 'расхода'} (PLN):`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        const value = parseFloat(amount);
        const description = prompt('Описание операции (необязательно):') || `${type === 'income' ? 'Доход' : 'Расход'}`;
        
        const operation = {
            id: Date.now(),
            user,
            type,
            amount: value,
            description,
            date: new Date().toISOString(),
            currency: 'PLN'
        };
        
        operations.push(operation);
        
        // Обновляем баланс
        if (type === 'income') {
            userBalances[user] += value;
        } else {
            userBalances[user] -= value;
        }
        
        updateUserCard(user);
        updateStats();
        updateRecentOperations();
        
        if (window.showToast) {
            window.showToast(`${type === 'income' ? 'Доход' : 'Расход'} ${value} PLN добавлен для ${user === 'artur' ? 'Артура' : 'Валерии'}`, 'success');
        }
        
        // Сохраняем в localStorage
        saveToLocalStorage();
        
        console.log('Операция добавлена:', operation);
    } else if (amount !== null) {
        if (window.showToast) {
            window.showToast('Введите корректную сумму', 'error');
        }
    }
}

// Обновление карточки пользователя
function updateUserCard(user) {
    const balanceElement = document.querySelector(`[data-user="${user}"] .user-balance`);
    if (balanceElement) {
        const balance = userBalances[user];
        balanceElement.textContent = `${Math.abs(balance).toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} PLN`;
        
        if (balance >= 0) {
            balanceElement.style.color = '#4CAF50';
        } else {
            balanceElement.style.color = '#f44336';
        }
    }
}

// Обновление статистики
function updateStats() {
    const totalIncome = operations
        .filter(op => op.type === 'income')
        .reduce((sum, op) => sum + op.amount, 0);
    
    const totalExpense = operations
        .filter(op => op.type === 'expense')
        .reduce((sum, op) => sum + op.amount, 0);
    
    const totalBalance = totalIncome - totalExpense;
    
    const incomeElement = document.getElementById('total-income');
    const expenseElement = document.getElementById('total-expense');
    const balanceElement = document.getElementById('total-balance');
    
    if (incomeElement) {
        incomeElement.textContent = `${totalIncome.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} PLN`;
    }
    
    if (expenseElement) {
        expenseElement.textContent = `${totalExpense.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} PLN`;
    }
    
    if (balanceElement) {
        balanceElement.textContent = `${Math.abs(totalBalance).toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} PLN`;
        
        if (totalBalance >= 0) {
            balanceElement.style.color = '#4CAF50';
        } else {
            balanceElement.style.color = '#f44336';
        }
    }
}

// Обновление списка последних операций
function updateRecentOperations() {
    const listElement = document.getElementById('recent-operations-list');
    if (listElement) {
        if (operations.length === 0) {
            listElement.innerHTML = '<p class="no-data">Операций пока нет. Добавьте первую операцию используя кнопки + и - в карточках пользователей.</p>';
        } else {
            const recentOps = operations
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);
            
            listElement.innerHTML = recentOps.map(op => `
                <div class="operation-item ${op.type}">
                    <div class="operation-icon">
                        <i class="fas fa-${op.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                    </div>
                    <div class="operation-details">
                        <div class="operation-description">${op.description}</div>
                        <div class="operation-meta">${op.user === 'artur' ? 'Артур' : 'Валерия'} • ${new Date(op.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div class="operation-amount ${op.type}">
                        ${op.type === 'income' ? '+' : '-'}${op.amount.toLocaleString('pl-PL', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })} PLN
                    </div>
                </div>
            `).join('');
        }
    }
}

// Переключение страниц
function showPage(pageId) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // Убираем активный класс у всех навигационных элементов
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Показываем нужную страницу
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Добавляем активный класс нужному элементу навигации
    const activeNavItem = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

// Переключение темы
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        themeIcon.className = `fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}`;
    }
    
    // Сохраняем в localStorage
    if (window.storageManager) {
        const settings = window.storageManager.getUserSettings();
        settings.theme = newTheme;
        window.storageManager.saveUserSettings(settings);
    }
    
    if (window.showToast) {
        window.showToast(`Переключено на ${newTheme === 'dark' ? 'тёмную' : 'светлую'} тему`, 'info');
    }
}

// Сохранение в localStorage
function saveToLocalStorage() {
    localStorage.setItem('familyBudget_operations', JSON.stringify(operations));
    localStorage.setItem('familyBudget_balances', JSON.stringify(userBalances));
}

// Загрузка из localStorage
function loadFromLocalStorage() {
    const savedOperations = localStorage.getItem('familyBudget_operations');
    const savedBalances = localStorage.getItem('familyBudget_balances');
    
    if (savedOperations) {
        operations = JSON.parse(savedOperations);
    }
    
    if (savedBalances) {
        userBalances = JSON.parse(savedBalances);
    }
    
    // Обновляем интерфейс
    updateUserCard('artur');
    updateUserCard('valeria');
    updateStats();
    updateRecentOperations();
}

// Экспортируем глобальные функции
window.startDemo = startDemo;
window.addOperation = addOperation;
window.showPage = showPage;
window.toggleTheme = toggleTheme;

console.log('📱 Main.js загружен успешно');