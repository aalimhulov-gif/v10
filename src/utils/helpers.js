// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Генерация уникального ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Форматирование суммы
function formatAmount(amount, currency = 'PLN') {
    const symbols = {
        'PLN': 'zł',
        'USD': '$', 
        'UAH': '₴'
    };
    
    const formatted = Math.abs(amount).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return `${formatted} ${symbols[currency] || symbols.PLN}`;
}

// Форматирование даты
function formatDate(date, format = 'short') {
    const d = new Date(date);
    
    if (format === 'short') {
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    if (format === 'long') {
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (format === 'time') {
        return d.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    return d.toLocaleDateString('ru-RU');
}

// Относительное время
function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) {
        return 'только что';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} мин. назад`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} ч. назад`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} дн. назад`;
    }
    
    return formatDate(date);
}

// Валидация email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Валидация суммы
function isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 999999999;
}

// Валидация имени
function isValidName(name) {
    return name && name.trim().length >= 2 && name.trim().length <= 50;
}

// Очистка строки
function sanitizeString(str) {
    return str ? str.trim().replace(/[<>]/g, '') : '';
}

// Дебаунс функции
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

// Троттлинг функции
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Копирование в буфер обмена
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Получение символа валюты
function getCurrencySymbol(currency) {
    const symbols = {
        'PLN': 'zł',
        'USD': '$',
        'UAH': '₴'
    };
    return symbols[currency] || 'zł';
}

// Загрузка изображения
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Проверка онлайн статуса
function isOnline() {
    return navigator.onLine;
}

// Обработчик онлайн/офлайн событий
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        showToast('Соединение восстановлено', 'success');
        // Синхронизировать данные
        if (window.syncPendingData) {
            window.syncPendingData();
        }
    });
    
    window.addEventListener('offline', () => {
        showToast('Нет соединения с интернетом', 'warning');
    });
}

// Получение размера экрана
function getScreenSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 768,
        isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
        isDesktop: window.innerWidth > 1024
    };
}

// Плавная прокрутка к элементу
function scrollToElement(element, behavior = 'smooth') {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.scrollIntoView({ behavior, block: 'center' });
    }
}

// Проверка поддержки функций браузера
function checkBrowserSupport() {
    return {
        localStorage: typeof Storage !== 'undefined',
        indexedDB: 'indexedDB' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        clipboard: navigator.clipboard !== undefined,
        camera: navigator.mediaDevices !== undefined
    };
}

// Получение информации об устройстве
function getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
        isIOS: /iPad|iPhone|iPod/.test(ua),
        isAndroid: /Android/.test(ua),
        isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
        isChrome: /Chrome/.test(ua),
        isFirefox: /Firefox/.test(ua)
    };
}

// Создание элемента DOM
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

// Обработка ошибок
function handleError(error, context = 'Неизвестная ошибка') {
    console.error(`[${context}]:`, error);
    
    // Показать пользователю дружелюбное сообщение
    let message = 'Произошла ошибка. Попробуйте ещё раз.';
    
    if (error.code === 'auth/user-not-found') {
        message = 'Пользователь не найден';
    } else if (error.code === 'auth/wrong-password') {
        message = 'Неверный пароль';
    } else if (error.code === 'auth/email-already-in-use') {
        message = 'Email уже используется';
    } else if (error.code === 'auth/weak-password') {
        message = 'Слабый пароль';
    } else if (error.code === 'auth/network-request-failed') {
        message = 'Ошибка сети. Проверьте соединение.';
    } else if (error.message) {
        message = error.message;
    }
    
    showToast(message, 'error');
    return message;
}

// Логирование для отладки
function log(message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
        case 'error':
            console.error(logMessage, data);
            break;
        case 'warn':
            console.warn(logMessage, data);
            break;
        case 'debug':
            console.debug(logMessage, data);
            break;
        default:
            console.log(logMessage, data);
    }
}

// Экспорт функций для глобального использования
window.helpers = {
    generateId,
    formatAmount,
    formatDate,
    timeAgo,
    isValidEmail,
    isValidAmount,
    isValidName,
    sanitizeString,
    debounce,
    throttle,
    copyToClipboard,
    getCurrencySymbol,
    preloadImage,
    isOnline,
    setupNetworkListeners,
    getScreenSize,
    scrollToElement,
    checkBrowserSupport,
    getDeviceInfo,
    createElement,
    handleError,
    log
};