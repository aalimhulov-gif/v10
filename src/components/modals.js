// ===== МОДАЛЬНЫЕ ОКНА =====

class ModalManager {
    constructor() {
        this.container = document.getElementById('modal-container');
        this.activeModal = null;
        this.setupEventListeners();
    }

    // Настройка глобальных обработчиков
    setupEventListeners() {
        // Закрытие модалки по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });

        // Закрытие модалки по клику на backdrop
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container.querySelector('.modal-backdrop')) {
                this.close();
            }
        });
    }

    // Создание модального окна
    create(options = {}) {
        const {
            title = 'Модальное окно',
            content = '',
            size = 'medium',
            closable = true,
            footer = null
        } = options;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        const modal = document.createElement('div');
        modal.className = `modal modal-${size}`;

        // Заголовок
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const titleElement = document.createElement('h3');
        titleElement.className = 'modal-title';
        titleElement.textContent = title;
        header.appendChild(titleElement);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => this.close();
            header.appendChild(closeBtn);
        }

        // Тело модалки
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }

        // Подвал
        if (footer) {
            const footerElement = document.createElement('div');
            footerElement.className = 'modal-footer';
            
            if (typeof footer === 'string') {
                footerElement.innerHTML = footer;
            } else {
                footerElement.appendChild(footer);
            }
            modal.appendChild(footerElement);
        }

        modal.appendChild(header);
        modal.appendChild(body);
        
        if (footer) {
            const footerElement = modal.querySelector('.modal-footer');
            if (footerElement) modal.appendChild(footerElement);
        }

        backdrop.appendChild(modal);
        
        return { backdrop, modal, body, header };
    }

    // Показать модальное окно
    show(options = {}) {
        this.close(); // Закрываем предыдущую модалку

        const modalElements = this.create(options);
        this.container.appendChild(modalElements.backdrop);
        this.activeModal = modalElements;

        // Анимация появления
        setTimeout(() => {
            modalElements.backdrop.classList.add('show');
        }, 10);

        return modalElements;
    }

    // Закрыть модальное окно
    close() {
        if (!this.activeModal) return;

        const backdrop = this.activeModal.backdrop;
        backdrop.classList.remove('show');

        setTimeout(() => {
            if (backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            this.activeModal = null;
        }, 300);
    }

    // Модальное окно операции (доход/расход)
    showOperationModal(user, type = 'expense') {
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="operation-type-tabs">
                <button class="operation-type-tab ${type === 'income' ? 'active' : ''}" data-type="income">
                    <i class="fas fa-plus"></i> Доход
                </button>
                <button class="operation-type-tab ${type === 'expense' ? 'active' : ''}" data-type="expense">
                    <i class="fas fa-minus"></i> Расход
                </button>
            </div>

            <form id="operation-form">
                <div class="form-group">
                    <label for="operation-amount">Сумма</label>
                    <div class="amount-input-group">
                        <span class="currency-symbol">zł</span>
                        <input type="number" id="operation-amount" class="amount-input" 
                               placeholder="0.00" min="0" step="0.01" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="operation-category">Категория</label>
                    <select id="operation-category" required>
                        <option value="">Выберите категорию</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="operation-description">Описание</label>
                    <input type="text" id="operation-description" placeholder="Необязательно">
                </div>

                <div class="form-group">
                    <label for="operation-date">Дата</label>
                    <input type="date" id="operation-date" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </form>
        `;

        const footer = document.createElement('div');
        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="modalManager.close()">
                Отмена
            </button>
            <button type="submit" form="operation-form" class="btn btn-primary">
                <i class="fas fa-save"></i> Сохранить
            </button>
        `;

        const modal = this.show({
            title: `${user === 'artur' ? 'Артур' : 'Валерия'} - ${type === 'income' ? 'Доход' : 'Расход'}`,
            content,
            footer
        });

        // Обработчики событий
        this.setupOperationModalHandlers(modal, user, type);
        this.loadCategories(type);

        return modal;
    }

    // Настройка обработчиков для модалки операции
    setupOperationModalHandlers(modal, user, currentType) {
        const tabs = modal.body.querySelectorAll('.operation-type-tab');
        const form = modal.body.querySelector('#operation-form');
        const categorySelect = modal.body.querySelector('#operation-category');

        // Переключение типа операции
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const newType = tab.dataset.type;
                this.loadCategories(newType);
                
                // Обновляем заголовок
                const title = modal.modal.querySelector('.modal-title');
                title.textContent = `${user === 'artur' ? 'Артур' : 'Валерия'} - ${newType === 'income' ? 'Доход' : 'Расход'}`;
            });
        });

        // Отправка формы
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const activeTab = modal.body.querySelector('.operation-type-tab.active');
            const operationType = activeTab.dataset.type;
            
            const formData = {
                amount: parseFloat(form.operation_amount.value),
                type: operationType,
                category: form.operation_category.value,
                description: form.operation_description.value,
                date: new Date(form.operation_date.value),
                currency: 'PLN'
            };

            try {
                await this.saveOperation(formData);
                this.close();
                showToast('Операция успешно сохранена', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    // Загрузка категорий
    async loadCategories(type = 'expense') {
        try {
            // Здесь будет загрузка из Firebase
            const categories = [
                { id: '1', name: 'Продукты', icon: '🛒', type: 'expense' },
                { id: '2', name: 'Транспорт', icon: '🚗', type: 'expense' },
                { id: '3', name: 'Развлечения', icon: '🎬', type: 'expense' },
                { id: '4', name: 'Зарплата', icon: '💰', type: 'income' },
                { id: '5', name: 'Подарки', icon: '🎁', type: 'income' }
            ];

            const select = document.getElementById('operation-category');
            if (!select) return;

            select.innerHTML = '<option value="">Выберите категорию</option>';
            
            categories
                .filter(cat => cat.type === type)
                .forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = `${category.icon} ${category.name}`;
                    select.appendChild(option);
                });

        } catch (error) {
            helpers.log('Ошибка загрузки категорий', error, 'error');
        }
    }

    // Сохранение операции
    async saveOperation(operationData) {
        try {
            if (window.dbManager) {
                await window.dbManager.addOperation(operationData);
            } else {
                // Сохраняем локально если нет подключения к Firebase
                const operations = storageManager.get('operations', []);
                const operation = {
                    ...operationData,
                    id: helpers.generateId(),
                    createdAt: new Date(),
                    userId: 'local_user'
                };
                operations.unshift(operation);
                storageManager.set('operations', operations);
            }
        } catch (error) {
            throw new Error('Ошибка сохранения операции: ' + error.message);
        }
    }

    // Модальное окно подтверждения
    showConfirmModal(options = {}) {
        const {
            title = 'Подтверждение',
            message = 'Вы уверены?',
            confirmText = 'Да',
            cancelText = 'Отмена',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        const content = document.createElement('div');
        content.className = 'confirm-modal';
        content.innerHTML = `
            <div class="confirm-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="confirm-title">${title}</h3>
            <p class="confirm-message">${message}</p>
        `;

        const footer = document.createElement('div');
        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" id="cancel-btn">
                ${cancelText}
            </button>
            <button type="button" class="btn btn-danger" id="confirm-btn">
                ${confirmText}
            </button>
        `;

        const modal = this.show({
            title: '',
            content,
            footer,
            size: 'small'
        });

        // Обработчики
        footer.querySelector('#cancel-btn').onclick = () => {
            this.close();
            onCancel();
        };

        footer.querySelector('#confirm-btn').onclick = () => {
            this.close();
            onConfirm();
        };

        return modal;
    }
}

// Создание глобального экземпляра
const modalManager = new ModalManager();

// Экспорт для глобального использования
window.modalManager = modalManager;