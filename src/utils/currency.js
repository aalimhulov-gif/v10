// ===== РАБОТА С ВАЛЮТАМИ И КОНВЕРТАЦИЕЙ =====

class CurrencyManager {
    constructor() {
        this.baseCurrency = 'PLN';
        this.supportedCurrencies = ['PLN', 'USD', 'UAH'];
        this.apiUrl = 'https://api.exchangerate.host/latest';
        this.fallbackRates = {
            'PLN': 1,
            'USD': 0.24,  // Примерные курсы как fallback
            'UAH': 10.2
        };
        this.cache = null;
        this.lastUpdate = 0;
        this.updateInterval = 60 * 60 * 1000; // 1 час
    }

    // Получение символа валюты
    getCurrencySymbol(currency) {
        const symbols = {
            'PLN': 'zł',
            'USD': '$',
            'UAH': '₴'
        };
        return symbols[currency] || 'zł';
    }

    // Получение названия валюты
    getCurrencyName(currency) {
        const names = {
            'PLN': 'Польский злотый',
            'USD': 'Доллар США',
            'UAH': 'Украинская гривна'
        };
        return names[currency] || 'Польский злотый';
    }

    // Загрузка актуальных курсов валют
    async fetchRates() {
        try {
            // Проверяем кэш
            const cached = storageManager.getCurrencyCache();
            if (cached && Date.now() - cached.timestamp < this.updateInterval) {
                this.cache = cached.rates;
                return cached.rates;
            }

            const response = await fetch(`${this.apiUrl}?base=${this.baseCurrency}&symbols=${this.supportedCurrencies.join(',')}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.rates) {
                this.cache = data.rates;
                this.lastUpdate = Date.now();
                
                // Сохраняем в кэш
                storageManager.saveCurrencyCache(data.rates, this.baseCurrency);
                
                helpers.log('Курсы валют обновлены', data.rates);
                return data.rates;
            } else {
                throw new Error('Некорректный ответ API');
            }
        } catch (error) {
            helpers.log('Ошибка загрузки курсов валют, используем fallback', error, 'warn');
            
            // Используем fallback курсы
            this.cache = this.fallbackRates;
            return this.fallbackRates;
        }
    }

    // Получение текущих курсов
    async getRates() {
        if (!this.cache || Date.now() - this.lastUpdate > this.updateInterval) {
            await this.fetchRates();
        }
        return this.cache || this.fallbackRates;
    }

    // Конвертация суммы
    async convert(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return parseFloat(amount);
        }

        try {
            const rates = await this.getRates();
            
            let result;
            
            if (fromCurrency === this.baseCurrency) {
                // Из базовой валюты в другую
                result = amount * (rates[toCurrency] || 1);
            } else if (toCurrency === this.baseCurrency) {
                // Из другой валюты в базовую
                result = amount / (rates[fromCurrency] || 1);
            } else {
                // Из одной валюты в другую через базовую
                const inBase = amount / (rates[fromCurrency] || 1);
                result = inBase * (rates[toCurrency] || 1);
            }
            
            return Math.round(result * 100) / 100; // Округляем до 2 знаков
        } catch (error) {
            helpers.log('Ошибка конвертации валют', error, 'error');
            return parseFloat(amount); // Возвращаем исходную сумму
        }
    }

    // Форматирование суммы с валютой
    format(amount, currency, showSymbol = true) {
        const formatted = Math.abs(parseFloat(amount)).toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        if (showSymbol) {
            return `${formatted} ${this.getCurrencySymbol(currency)}`;
        }
        
        return formatted;
    }

    // Парсинг введенной суммы
    parseAmount(input) {
        if (!input) return 0;
        
        // Убираем все кроме цифр, точек и запятых
        const cleaned = input.toString().replace(/[^\d.,]/g, '');
        
        // Заменяем запятую на точку
        const normalized = cleaned.replace(',', '.');
        
        // Парсим число
        const parsed = parseFloat(normalized);
        
        return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    }

    // Получение информации о курсе
    async getExchangeInfo(fromCurrency, toCurrency, amount = 1) {
        if (fromCurrency === toCurrency) {
            return {
                rate: 1,
                amount: amount,
                converted: amount,
                lastUpdate: Date.now()
            };
        }

        try {
            const rates = await this.getRates();
            let rate;
            
            if (fromCurrency === this.baseCurrency) {
                rate = rates[toCurrency] || 1;
            } else if (toCurrency === this.baseCurrency) {
                rate = 1 / (rates[fromCurrency] || 1);
            } else {
                const fromRate = rates[fromCurrency] || 1;
                const toRate = rates[toCurrency] || 1;
                rate = toRate / fromRate;
            }
            
            const converted = amount * rate;
            
            return {
                rate: Math.round(rate * 10000) / 10000,
                amount: amount,
                converted: Math.round(converted * 100) / 100,
                lastUpdate: this.lastUpdate,
                fromCurrency,
                toCurrency
            };
        } catch (error) {
            helpers.log('Ошибка получения информации о курсе', error, 'error');
            return {
                rate: 1,
                amount: amount,
                converted: amount,
                lastUpdate: 0,
                error: true
            };
        }
    }

    // Валидация валюты
    isValidCurrency(currency) {
        return this.supportedCurrencies.includes(currency);
    }

    // Получение списка поддерживаемых валют
    getSupportedCurrencies() {
        return this.supportedCurrencies.map(code => ({
            code,
            name: this.getCurrencyName(code),
            symbol: this.getCurrencySymbol(code)
        }));
    }

    // Принудительное обновление курсов
    async forceUpdate() {
        this.lastUpdate = 0;
        this.cache = null;
        return await this.fetchRates();
    }

    // Получение статуса обновления
    getUpdateStatus() {
        const timeSinceUpdate = Date.now() - this.lastUpdate;
        const isStale = timeSinceUpdate > this.updateInterval;
        
        return {
            lastUpdate: this.lastUpdate,
            timeSinceUpdate,
            isStale,
            nextUpdate: this.lastUpdate + this.updateInterval,
            hasCache: !!this.cache
        };
    }
}

// Создание экземпляра менеджера валют
const currencyManager = new CurrencyManager();

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ВАЛЮТАМИ =====

// Конвертация всех балансов пользователя
async function convertUserBalances(userBalances, newCurrency, oldCurrency) {
    const converted = {};
    
    for (const [userId, balance] of Object.entries(userBalances)) {
        converted[userId] = await currencyManager.convert(balance, oldCurrency, newCurrency);
    }
    
    return converted;
}

// Конвертация списка операций
async function convertOperations(operations, newCurrency, oldCurrency) {
    const converted = [];
    
    for (const operation of operations) {
        const convertedAmount = await currencyManager.convert(
            operation.amount, 
            oldCurrency, 
            newCurrency
        );
        
        converted.push({
            ...operation,
            amount: convertedAmount,
            originalAmount: operation.amount,
            originalCurrency: oldCurrency,
            convertedCurrency: newCurrency
        });
    }
    
    return converted;
}

// Получение курса для отображения
async function getDisplayRate(fromCurrency, toCurrency) {
    const info = await currencyManager.getExchangeInfo(fromCurrency, toCurrency, 1);
    return `1 ${fromCurrency} = ${info.rate} ${toCurrency}`;
}

// Создание элемента выбора валюты
function createCurrencySelect(selectedCurrency = 'PLN', onChange = null) {
    const select = document.createElement('select');
    select.className = 'currency-select';
    
    currencyManager.getSupportedCurrencies().forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.code;
        option.textContent = `${currency.code} (${currency.symbol})`;
        option.selected = currency.code === selectedCurrency;
        select.appendChild(option);
    });
    
    if (onChange) {
        select.addEventListener('change', onChange);
    }
    
    return select;
}

// Автоматическое обновление курсов
function startCurrencyUpdates() {
    // Обновляем курсы каждые 30 минут
    setInterval(async () => {
        try {
            await currencyManager.forceUpdate();
            helpers.log('Курсы валют автоматически обновлены');
        } catch (error) {
            helpers.log('Ошибка автоматического обновления курсов', error, 'error');
        }
    }, 30 * 60 * 1000);
}

// Обработка изменения валюты в приложении
async function handleCurrencyChange(newCurrency, oldCurrency) {
    try {
        // Показываем индикатор загрузки
        showToast('Конвертация валют...', 'info');
        
        // Получаем текущие данные
        const userData = storageManager.getUserData();
        const appState = storageManager.getAppState();
        
        // Конвертируем балансы если есть
        if (userData && userData.balances) {
            userData.balances = await convertUserBalances(
                userData.balances, 
                newCurrency, 
                oldCurrency
            );
            storageManager.saveUserData(userData);
        }
        
        // Сохраняем новую валюту в настройках
        const settings = storageManager.getUserSettings();
        settings.currency = newCurrency;
        storageManager.saveUserSettings(settings);
        
        // Обновляем интерфейс
        if (window.updateCurrencyDisplay) {
            window.updateCurrencyDisplay(newCurrency);
        }
        
        showToast(`Валюта изменена на ${currencyManager.getCurrencyName(newCurrency)}`, 'success');
        
    } catch (error) {
        helpers.handleError(error, 'Смена валюты');
    }
}

// Экспорт всех функций
window.currency = {
    // Инициализация
    init: async function() {
        await currencyManager.init();
        console.log('💱 Currency Manager инициализирован');
        return true;
    },
    
    manager: currencyManager,
    convert: currencyManager.convert.bind(currencyManager),
    format: currencyManager.format.bind(currencyManager),
    parse: currencyManager.parseAmount.bind(currencyManager),
    getSymbol: currencyManager.getCurrencySymbol.bind(currencyManager),
    getName: currencyManager.getCurrencyName.bind(currencyManager),
    isValid: currencyManager.isValidCurrency.bind(currencyManager),
    getSupported: currencyManager.getSupportedCurrencies.bind(currencyManager),
    getRates: currencyManager.getRates.bind(currencyManager),
    getExchangeInfo: currencyManager.getExchangeInfo.bind(currencyManager),
    forceUpdate: currencyManager.forceUpdate.bind(currencyManager),
    getUpdateStatus: currencyManager.getUpdateStatus.bind(currencyManager),
    
    // Вспомогательные функции
    convertUserBalances,
    convertOperations,
    getDisplayRate,
    createCurrencySelect,
    startCurrencyUpdates,
    handleCurrencyChange
};