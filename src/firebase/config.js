// ===== КОНФИГУРАЦИЯ FIREBASE =====

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGN93LsNnRGcqGpesVWAg8jP0m6XsQAuA",
  authDomain: "budget-ami.firebaseapp.com",
  databaseURL: "https://budget-ami-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "budget-ami",
  storageBucket: "budget-ami.firebasestorage.app",
  messagingSenderId: "976854941281",
  appId: "1:976854941281:web:f40e81033cf52d236af420"
};

// Инициализация Firebase
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            helpers.log('Firebase инициализирован успешно');
            return true;
        } else {
            helpers.log('Firebase SDK не загружен', null, 'warn');
            return false;
        }
    } catch (error) {
        helpers.log('Ошибка инициализации Firebase', error, 'error');
        return false;
    }
}

// Проверка доступности Firebase
function isFirebaseAvailable() {
    return typeof firebase !== 'undefined' && 
           firebase.apps && 
           firebase.apps.length > 0;
}

// Экспорт функций
window.initializeFirebase = initializeFirebase;
window.isFirebaseAvailable = isFirebaseAvailable;