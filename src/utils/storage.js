// ===== РАБОТА С ЛОКАЛЬНЫМ ХРАНИЛИЩЕМ =====

class Storage {
    constructor() {
        this.prefix = 'familybudget_';
        this.checkSupport();
    }

    // Проверка поддержки localStorage
    checkSupport() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.supported = true;
        } catch (e) {
            this.supported = false;
            console.warn('localStorage не поддерживается');
        }
    }

    // Получение полного ключа с префиксом
    getKey(key) {
        return this.prefix + key;
    }

    // Сохранение данных
    set(key, value) {
        if (!this.supported) return false;
        
        try {
            const serializedValue = JSON.stringify({
                data: value,
                timestamp: Date.now(),
                version: '1.0'
            });
            localStorage.setItem(this.getKey(key), serializedValue);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    // Получение данных
    get(key, defaultValue = null) {
        if (!this.supported) return defaultValue;
        
        try {
            const item = localStorage.getItem(this.getKey(key));
            if (!item) return defaultValue;
            
            const parsed = JSON.parse(item);
            return parsed.data !== undefined ? parsed.data : defaultValue;
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
            return defaultValue;
        }
    }

    // Удаление данных
    remove(key) {
        if (!this.supported) return false;
        
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
            return false;
        }
    }

    // Очистка всех данных приложения
    clear() {
        if (!this.supported) return false;
        
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Ошибка очистки localStorage:', error);
            return false;
        }
    }

    // Получение всех ключей приложения
    getAllKeys() {
        if (!this.supported) return [];
        
        try {
            const keys = Object.keys(localStorage);
            return keys
                .filter(key => key.startsWith(this.prefix))
                .map(key => key.replace(this.prefix, ''));
        } catch (error) {
            console.error('Ошибка получения ключей:', error);
            return [];
        }
    }

    // Получение размера занятого места
    getSize() {
        if (!this.supported) return 0;
        
        try {
            let size = 0;
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    size += localStorage.getItem(key).length;
                }
            });
            return size;
        } catch (error) {
            console.error('Ошибка вычисления размера:', error);
            return 0;
        }
    }

    // Проверка существования ключа
    exists(key) {
        if (!this.supported) return false;
        return localStorage.getItem(this.getKey(key)) !== null;
    }

    // Экспорт всех данных
    export() {
        if (!this.supported) return null;
        
        try {
            const data = {};
            const keys = this.getAllKeys();
            keys.forEach(key => {
                data[key] = this.get(key);
            });
            return data;
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            return null;
        }
    }

    // Импорт данных
    import(data) {
        if (!this.supported || !data) return false;
        
        try {
            Object.entries(data).forEach(([key, value]) => {
                this.set(key, value);
            });
            return true;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return false;
        }
    }
}

// Создание экземпляра для использования
const storage = new Storage();

// ===== СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ ПРИЛОЖЕНИЯ =====

// Сохранение настроек пользователя
function saveUserSettings(settings) {
    return storage.set('userSettings', {
        theme: settings.theme || 'dark',
        currency: settings.currency || 'PLN',
        language: settings.language || 'ru',
        notifications: settings.notifications !== false,
        ...settings
    });
}

// Получение настроек пользователя
function getUserSettings() {
    return storage.get('userSettings', {
        theme: 'dark',
        currency: 'PLN',
        language: 'ru',
        notifications: true
    });
}

// Сохранение данных пользователя
function saveUserData(userData) {
    return storage.set('userData', {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        budgetId: userData.budgetId,
        lastLogin: Date.now(),
        ...userData
    });
}

// Получение данных пользователя
function getUserData() {
    return storage.get('userData', null);
}

// Сохранение кэша валют
function saveCurrencyCache(rates, baseCurrency) {
    return storage.set('currencyCache', {
        rates,
        baseCurrency,
        timestamp: Date.now()
    });
}

// Получение кэша валют
function getCurrencyCache() {
    const cache = storage.get('currencyCache', null);
    
    // Проверяем актуальность кэша (24 часа)
    if (cache && Date.now() - cache.timestamp < 24 * 60 * 60 * 1000) {
        return cache;
    }
    
    return null;
}

// Сохранение офлайн операций
function saveOfflineOperation(operation) {
    const operations = storage.get('offlineOperations', []);
    operations.push({
        ...operation,
        id: helpers.generateId(),
        timestamp: Date.now()
    });
    return storage.set('offlineOperations', operations);
}

// Получение офлайн операций
function getOfflineOperations() {
    return storage.get('offlineOperations', []);
}

// Очистка офлайн операций
function clearOfflineOperations() {
    return storage.remove('offlineOperations');
}

// Сохранение последней синхронизации
function saveLastSync(timestamp = Date.now()) {
    return storage.set('lastSync', timestamp);
}

// Получение времени последней синхронизации
function getLastSync() {
    return storage.get('lastSync', 0);
}

// Сохранение состояния приложения
function saveAppState(state) {
    return storage.set('appState', {
        currentPage: state.currentPage || 'home',
        filters: state.filters || {},
        sortOrder: state.sortOrder || {},
        ...state
    });
}

// Получение состояния приложения
function getAppState() {
    return storage.get('appState', {
        currentPage: 'home',
        filters: {},
        sortOrder: {}
    });
}

// Сохранение черновиков форм
function saveDraft(formName, data) {
    const drafts = storage.get('drafts', {});
    drafts[formName] = {
        data,
        timestamp: Date.now()
    };
    return storage.set('drafts', drafts);
}

// Получение черновика формы
function getDraft(formName) {
    const drafts = storage.get('drafts', {});
    const draft = drafts[formName];
    
    // Удаляем старые черновики (более 24 часов)
    if (draft && Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
        delete drafts[formName];
        storage.set('drafts', drafts);
        return null;
    }
    
    return draft ? draft.data : null;
}

// Очистка черновика
function clearDraft(formName) {
    const drafts = storage.get('drafts', {});
    delete drafts[formName];
    return storage.set('drafts', drafts);
}

// Очистка всех данных пользователя при выходе
function clearUserData() {
    const keysToKeep = ['currencyCache']; // Оставляем кэш валют
    const allKeys = storage.getAllKeys();
    
    allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            storage.remove(key);
        }
    });
    
    return true;
}

// Получение статистики хранилища
function getStorageStats() {
    return {
        supported: storage.supported,
        size: storage.getSize(),
        keys: storage.getAllKeys(),
        quota: getStorageQuota()
    };
}

// Получение квоты хранилища
async function getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            return {
                quota: estimate.quota,
                usage: estimate.usage,
                available: estimate.quota - estimate.usage
            };
        } catch (error) {
            console.error('Ошибка получения квоты:', error);
        }
    }
    return null;
}

// Миграция данных при обновлении версии
function migrateData(fromVersion, toVersion) {
    try {
        const currentData = storage.export();
        
        // Здесь можно добавить логику миграции для разных версий
        if (fromVersion < '1.1' && toVersion >= '1.1') {
            // Пример миграции
            if (currentData.userSettings) {
                currentData.userSettings.newFeature = true;
            }
        }
        
        storage.import(currentData);
        storage.set('appVersion', toVersion);
        
        return true;
    } catch (error) {
        console.error('Ошибка миграции данных:', error);
        return false;
    }
}

// Экспорт всех функций
window.storageManager = {
    // Инициализация
    init: async function() {
        storage.checkSupport();
        console.log('💾 Storage Manager инициализирован');
        return true;
    },
    
    // Основные методы
    set: storage.set.bind(storage),
    get: storage.get.bind(storage),
    remove: storage.remove.bind(storage),
    clear: storage.clear.bind(storage),
    exists: storage.exists.bind(storage),
    export: storage.export.bind(storage),
    import: storage.import.bind(storage),
    
    // Специальные методы
    saveUserSettings,
    getUserSettings,
    saveUserData,
    getUserData,
    saveCurrencyCache,
    getCurrencyCache,
    saveOfflineOperation,
    getOfflineOperations,
    clearOfflineOperations,
    saveLastSync,
    getLastSync,
    saveAppState,
    getAppState,
    saveDraft,
    getDraft,
    clearDraft,
    clearUserData,
    getStorageStats,
    getStorageQuota,
    migrateData
};