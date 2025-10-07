// ===== КОМПОНЕНТ СТРАНИЦЫ НАСТРОЕК =====

class SettingsPage {
    constructor() {
        this.currentSettings = {};
        this.setupEventHandlers();
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        document.addEventListener('click', (e) => {
            // Копирование ID бюджета
            if (e.target.closest('#copy-budget-id-btn')) {
                this.copyBudgetId();
            }

            // Создание резервной копии
            if (e.target.closest('#backup-data-btn')) {
                this.createBackup();
            }

            // Восстановление из резервной копии
            if (e.target.closest('#restore-data-btn')) {
                this.restoreFromBackup();
            }

            // Очистка данных
            if (e.target.closest('#clear-data-btn')) {
                this.clearAllData();
            }

            // Экспорт данных
            if (e.target.closest('#export-data-btn')) {
                this.exportData();
            }

            // Изменение пароля
            if (e.target.closest('#change-password-btn')) {
                this.showChangePasswordModal();
            }

            // Выход из аккаунта
            if (e.target.closest('#logout-btn')) {
                this.logout();
            }

            // Переключение темы
            if (e.target.closest('#theme-toggle')) {
                this.toggleTheme();
            }
        });

        // Обработка изменений настроек
        document.addEventListener('change', (e) => {
            if (e.target.matches('#default-currency')) {
                this.changeCurrency(e.target.value);
            } else if (e.target.matches('#notifications-enabled')) {
                this.toggleNotifications(e.target.checked);
            } else if (e.target.matches('#auto-backup')) {
                this.toggleAutoBackup(e.target.checked);
            } else if (e.target.matches('#currency-auto-update')) {
                this.toggleCurrencyAutoUpdate(e.target.checked);
            }
        });

        // Обработка формы смены пароля
        const passwordForm = document.getElementById('change-password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Обработка загрузки файла резервной копии
        const restoreInput = document.getElementById('restore-file-input');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processRestoreFile(e.target.files[0]);
                }
            });
        }
    }

    // Инициализация страницы
    async init() {
        await this.loadSettings();
        this.renderSettings();
        this.updateAccountInfo();
    }

    // Загрузка настроек
    async loadSettings() {
        try {
            // Загружаем настройки из localStorage
            this.currentSettings = storageManager.getUserSettings();

            // Если авторизован, пытаемся загрузить с сервера
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                try {
                    const serverSettings = await window.dbManager.getUserSettings();
                    if (serverSettings) {
                        this.currentSettings = { ...this.currentSettings, ...serverSettings };
                    }
                } catch (error) {
                    helpers.log('Ошибка загрузки настроек с сервера', error, 'warn');
                }
            }

        } catch (error) {
            helpers.log('Ошибка загрузки настроек', error, 'error');
            this.currentSettings = storageManager.getDefaultSettings();
        }
    }

    // Отображение настроек
    renderSettings() {
        // Обновляем элементы формы
        const currencySelect = document.getElementById('default-currency');
        const notificationsCheckbox = document.getElementById('notifications-enabled');
        const autoBackupCheckbox = document.getElementById('auto-backup');
        const currencyUpdateCheckbox = document.getElementById('currency-auto-update');
        const themeToggle = document.getElementById('theme-toggle');

        if (currencySelect) {
            currencySelect.value = this.currentSettings.currency;
        }

        if (notificationsCheckbox) {
            notificationsCheckbox.checked = this.currentSettings.notifications;
        }

        if (autoBackupCheckbox) {
            autoBackupCheckbox.checked = this.currentSettings.autoBackup;
        }

        if (currencyUpdateCheckbox) {
            currencyUpdateCheckbox.checked = this.currentSettings.currencyAutoUpdate;
        }

        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = this.currentSettings.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }

        // Применяем тему
        document.documentElement.setAttribute('data-theme', this.currentSettings.theme);
    }

    // Обновление информации об аккаунте
    async updateAccountInfo() {
        const budgetIdElement = document.getElementById('current-budget-id');
        const userEmailElement = document.getElementById('user-email');
        const lastSyncElement = document.getElementById('last-sync');
        const dataStatsElement = document.getElementById('data-stats');

        try {
            if (window.authManager?.isAuthenticated()) {
                const userData = await window.authManager.getUserData();
                
                if (budgetIdElement) {
                    budgetIdElement.textContent = userData.budgetId || 'Не установлен';
                }

                if (userEmailElement) {
                    userEmailElement.textContent = userData.email || 'Не указан';
                }

                if (lastSyncElement) {
                    const lastSync = storageManager.get('lastSync');
                    lastSyncElement.textContent = lastSync ? helpers.formatDateTime(lastSync) : 'Никогда';
                }
            } else {
                if (budgetIdElement) budgetIdElement.textContent = 'Автономный режим';
                if (userEmailElement) userEmailElement.textContent = 'Не авторизован';
                if (lastSyncElement) lastSyncElement.textContent = 'Не доступно';
            }

            // Статистика данных
            if (dataStatsElement) {
                const operations = storageManager.get('operations', []);
                const categories = storageManager.get('categories', []);
                const limits = storageManager.get('limits', []);
                const goals = storageManager.get('goals', []);

                dataStatsElement.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">Операции</div>
                            <div class="stat-value">${operations.length}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Категории</div>
                            <div class="stat-value">${categories.length}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Лимиты</div>
                            <div class="stat-value">${limits.length}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Цели</div>
                            <div class="stat-value">${goals.length}</div>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            helpers.log('Ошибка обновления информации об аккаунте', error, 'error');
        }
    }

    // Смена валюты
    async changeCurrency(newCurrency) {
        const oldCurrency = this.currentSettings.currency;
        
        if (newCurrency === oldCurrency) return;

        try {
            // Обновляем настройки
            this.currentSettings.currency = newCurrency;
            await this.saveSettings();

            // Конвертируем существующие данные
            await currency.handleCurrencyChange(newCurrency, oldCurrency);

            showToast(`Валюта изменена на ${newCurrency}`, 'success');

        } catch (error) {
            helpers.log('Ошибка смены валюты', error, 'error');
            showToast('Ошибка смены валюты', 'error');
            
            // Возвращаем старое значение
            document.getElementById('default-currency').value = oldCurrency;
        }
    }

    // Переключение уведомлений
    async toggleNotifications(enabled) {
        this.currentSettings.notifications = enabled;
        await this.saveSettings();

        if (enabled) {
            // Запрашиваем разрешение на уведомления
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    showToast('Разрешение на уведомления не предоставлено', 'warning');
                    document.getElementById('notifications-enabled').checked = false;
                    this.currentSettings.notifications = false;
                    await this.saveSettings();
                    return;
                }
            }
            showToast('Уведомления включены', 'success');
        } else {
            showToast('Уведомления отключены', 'info');
        }
    }

    // Переключение автоматического резервного копирования
    async toggleAutoBackup(enabled) {
        this.currentSettings.autoBackup = enabled;
        await this.saveSettings();

        showToast(
            enabled ? 'Автоматическое резервное копирование включено' : 'Автоматическое резервное копирование отключено',
            'info'
        );
    }

    // Переключение автообновления курсов валют
    async toggleCurrencyAutoUpdate(enabled) {
        this.currentSettings.currencyAutoUpdate = enabled;
        await this.saveSettings();

        if (enabled) {
            // Обновляем курсы сразу
            try {
                await currency.updateRates();
                showToast('Автообновление курсов включено, курсы обновлены', 'success');
            } catch (error) {
                showToast('Автообновление курсов включено', 'info');
            }
        } else {
            showToast('Автообновление курсов отключено', 'info');
        }
    }

    // Переключение темы
    async toggleTheme() {
        const newTheme = this.currentSettings.theme === 'dark' ? 'light' : 'dark';
        this.currentSettings.theme = newTheme;
        
        // Применяем тему
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Обновляем иконку
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }

        await this.saveSettings();

        // Уведомляем другие компоненты
        if (window.userCardsManager) {
            window.userCardsManager.updateTheme(newTheme);
        }

        showToast(`Тема изменена на ${newTheme === 'dark' ? 'тёмную' : 'светлую'}`, 'success');
    }

    // Копирование ID бюджета
    async copyBudgetId() {
        try {
            const budgetIdElement = document.getElementById('current-budget-id');
            const budgetId = budgetIdElement.textContent;
            
            if (budgetId === 'Не установлен' || budgetId === 'Автономный режим') {
                showToast('ID бюджета не доступен', 'error');
                return;
            }

            const success = await helpers.copyToClipboard(budgetId);
            
            if (success) {
                showToast('ID бюджета скопирован в буфер обмена', 'success');
            } else {
                showToast('Не удалось скопировать ID', 'error');
            }

        } catch (error) {
            helpers.log('Ошибка копирования ID бюджета', error, 'error');
            showToast('Ошибка копирования ID', 'error');
        }
    }

    // Создание резервной копии
    async createBackup() {
        try {
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                settings: this.currentSettings,
                operations: storageManager.get('operations', []),
                categories: storageManager.get('categories', []),
                limits: storageManager.get('limits', []),
                goals: storageManager.get('goals', [])
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `family_budget_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);

            showToast('Резервная копия создана', 'success');

        } catch (error) {
            helpers.log('Ошибка создания резервной копии', error, 'error');
            showToast('Ошибка создания резервной копии', 'error');
        }
    }

    // Восстановление из резервной копии
    restoreFromBackup() {
        const input = document.getElementById('restore-file-input');
        if (input) {
            input.click();
        }
    }

    // Обработка файла резервной копии
    async processRestoreFile(file) {
        if (!file.name.endsWith('.json')) {
            showToast('Неверный формат файла. Выберите JSON файл', 'error');
            return;
        }

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // Валидация структуры
            if (!backupData.version || !backupData.timestamp) {
                showToast('Неверный формат резервной копии', 'error');
                return;
            }

            const confirmed = await window.modalsManager.showConfirmation(
                'Восстановление данных',
                'Все текущие данные будут заменены данными из резервной копии. Продолжить?',
                'Восстановить',
                'warning'
            );

            if (!confirmed) return;

            // Восстанавливаем данные
            if (backupData.settings) {
                storageManager.saveUserSettings(backupData.settings);
                this.currentSettings = backupData.settings;
            }

            if (backupData.operations) {
                storageManager.save('operations', backupData.operations);
            }

            if (backupData.categories) {
                storageManager.save('categories', backupData.categories);
            }

            if (backupData.limits) {
                storageManager.save('limits', backupData.limits);
            }

            if (backupData.goals) {
                storageManager.save('goals', backupData.goals);
            }

            // Обновляем интерфейс
            this.renderSettings();
            this.updateAccountInfo();

            showToast('Данные восстановлены из резервной копии', 'success');

            // Перезагружаем страницу для обновления всех компонентов
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            helpers.log('Ошибка восстановления из резервной копии', error, 'error');
            showToast('Ошибка восстановления данных', 'error');
        }
    }

    // Экспорт данных
    async exportData() {
        try {
            const exportData = {
                operations: storageManager.get('operations', []),
                categories: storageManager.get('categories', []),
                limits: storageManager.get('limits', []),
                goals: storageManager.get('goals', [])
            };

            // Создаем CSV для операций
            const operationsCSV = this.generateOperationsCSV(exportData.operations);
            
            // Создаем JSON для полного экспорта
            const fullDataJSON = JSON.stringify(exportData, null, 2);

            // Создаем ZIP архив (упрощенная версия)
            const csvBlob = new Blob([operationsCSV], { type: 'text/csv;charset=utf-8;' });
            const jsonBlob = new Blob([fullDataJSON], { type: 'application/json' });

            // Скачиваем CSV операций
            const csvLink = document.createElement('a');
            csvLink.href = URL.createObjectURL(csvBlob);
            csvLink.download = `operations_export_${new Date().toISOString().split('T')[0]}.csv`;
            csvLink.style.display = 'none';
            
            document.body.appendChild(csvLink);
            csvLink.click();
            document.body.removeChild(csvLink);

            // Скачиваем полные данные JSON
            const jsonLink = document.createElement('a');
            jsonLink.href = URL.createObjectURL(jsonBlob);
            jsonLink.download = `full_data_export_${new Date().toISOString().split('T')[0]}.json`;
            jsonLink.style.display = 'none';
            
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            showToast('Данные экспортированы', 'success');

        } catch (error) {
            helpers.log('Ошибка экспорта данных', error, 'error');
            showToast('Ошибка экспорта данных', 'error');
        }
    }

    // Генерация CSV операций
    generateOperationsCSV(operations) {
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

    // Очистка всех данных
    async clearAllData() {
        const confirmed = await window.modalsManager.showConfirmation(
            'Очистка всех данных',
            'Все данные (операции, категории, лимиты, цели) будут безвозвратно удалены. Рекомендуется сначала создать резервную копию. Продолжить?',
            'Очистить',
            'danger'
        );

        if (!confirmed) return;

        try {
            // Очищаем все данные
            storageManager.remove('operations');
            storageManager.remove('categories');
            storageManager.remove('limits');
            storageManager.remove('goals');

            // Сбрасываем настройки к значениям по умолчанию
            const defaultSettings = storageManager.getDefaultSettings();
            storageManager.saveUserSettings(defaultSettings);
            this.currentSettings = defaultSettings;

            // Обновляем интерфейс
            this.renderSettings();
            this.updateAccountInfo();

            showToast('Все данные очищены', 'success');

            // Перезагружаем страницу
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            helpers.log('Ошибка очистки данных', error, 'error');
            showToast('Ошибка очистки данных', 'error');
        }
    }

    // Показ модального окна смены пароля
    showChangePasswordModal() {
        if (window.modalsManager) {
            window.modalsManager.showModal('change-password-modal');
        }
    }

    // Смена пароля
    async changePassword() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);

        const currentPassword = formData.get('current-password');
        const newPassword = formData.get('new-password');
        const confirmPassword = formData.get('confirm-password');

        // Валидация
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Заполните все поля', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Новые пароли не совпадают', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            if (window.authManager?.isAuthenticated()) {
                await window.authManager.changePassword(currentPassword, newPassword);
                showToast('Пароль изменен', 'success');
                
                // Закрываем модальное окно
                if (window.modalsManager) {
                    window.modalsManager.hideModal('change-password-modal');
                }
                
                form.reset();
            } else {
                showToast('Недоступно в автономном режиме', 'error');
            }

        } catch (error) {
            helpers.log('Ошибка смены пароля', error, 'error');
            showToast('Ошибка смены пароля', 'error');
        }
    }

    // Выход из аккаунта
    async logout() {
        const confirmed = await window.modalsManager.showConfirmation(
            'Выход из аккаунта',
            'Вы уверены, что хотите выйти из аккаунта?',
            'Выйти',
            'warning'
        );

        if (!confirmed) return;

        try {
            if (window.authManager?.isAuthenticated()) {
                await window.authManager.logout();
                showToast('Вы вышли из аккаунта', 'info');
                
                // Перезагружаем страницу
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }

        } catch (error) {
            helpers.log('Ошибка выхода из аккаунта', error, 'error');
            showToast('Ошибка выхода из аккаунта', 'error');
        }
    }

    // Сохранение настроек
    async saveSettings() {
        try {
            // Сохраняем в localStorage
            storageManager.saveUserSettings(this.currentSettings);

            // Если авторизован, сохраняем на сервер
            if (window.authManager?.isAuthenticated() && window.dbManager) {
                try {
                    await window.dbManager.saveUserSettings(this.currentSettings);
                } catch (error) {
                    helpers.log('Ошибка сохранения настроек на сервер', error, 'warn');
                }
            }

        } catch (error) {
            helpers.log('Ошибка сохранения настроек', error, 'error');
            throw error;
        }
    }

    // Получение текущих настроек
    getSettings() {
        return { ...this.currentSettings };
    }
}

// Создание глобального экземпляра
const settingsPage = new SettingsPage();

// Экспорт для глобального использования
window.settingsPage = settingsPage;