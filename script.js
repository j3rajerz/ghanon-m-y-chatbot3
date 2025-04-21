// تنظیمات PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// اطلاعات کاربران
const users = {
    'abbas': {
        password: '1234',
        canChangePassword: true
    }
};

// متغیرهای جهانی
let currentUser = null;
let pdfText = '';
let chatHistory = [];

// عناصر DOM
const elements = {
    loginPage: document.getElementById('login-page'),
    chatPage: document.getElementById('chat-page'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    usernameDisplay: document.getElementById('username-display'),
    logoutBtn: document.getElementById('logout-btn'),
    changePassBtn: document.getElementById('change-pass-btn'),
    changePassModal: document.getElementById('change-pass-modal'),
    closeModal: document.querySelector('.close'),
    changePassForm: document.getElementById('change-pass-form'),
    loadingIndicator: document.getElementById('loading-indicator'),
    loadingMessage: document.getElementById('loading-message'),
    chatBox: document.getElementById('chat-box'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    loginError: document.getElementById('login-error'),
    passError: document.getElementById('pass-error')
};

// مدیریت رویدادها
function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.changePassBtn.addEventListener('click', () => elements.changePassModal.style.display = 'block');
    elements.closeModal.addEventListener('click', closeModal);
    elements.changePassForm.addEventListener('submit', handleChangePassword);
    elements.userInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleQuestion());
    elements.sendBtn.addEventListener('click', handleQuestion);
}

function closeModal() {
    elements.changePassModal.style.display = 'none';
    elements.passError.textContent = '';
}

// هنگامی که صفحه بارگذاری شد
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    const lastUser = localStorage.getItem('lastUser');
    if (lastUser && users[lastUser]) {
        elements.usernameInput.value = lastUser;
        elements.passwordInput.focus();
    } else {
        elements.usernameInput.focus();
    }
});

// تابع ورود به سیستم
async function handleLogin(e) {
    e.preventDefault();
    elements.loginError.textContent = '';
    
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;
    
    if (!username || !password) {
        elements.loginError.textContent = 'لطفاً نام کاربری و رمز عبور را وارد کنید';
        return;
    }
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        elements.usernameDisplay.textContent = username;
        elements.loginPage.style.display = 'none';
        elements.chatPage.style.display = 'block';
        
        localStorage.setItem('lastUser', username);
        await loadPDF();
    } else {
        elements.loginError.textContent = 'نام کاربری یا رمز عبور نادرست است!';
    }
}

// تابع خروج از سیستم
function handleLogout() {
    currentUser = null;
    elements.chatPage.style.display = 'none';
    elements.loginPage.style.display = 'flex';
    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
    elements.chatBox.innerHTML = '';
    localStorage.removeItem('lastUser');
}

// تابع تغییر رمز عبور
async function handleChangePassword(e) {
    e.preventDefault();
    elements.passError.textContent = '';
    
    const currentPass = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;
    
    // اعتبارسنجی
    if (!currentPass || !newPass || !confirmPass) {
        elements.passError.textContent = 'لطفاً تمام فیلدها را پر کنید';
        return;
    }
    
    if (users[currentUser].password !== currentPass) {
        elements.passError.textContent = 'رمز عبور فعلی نادرست است!';
        return;
    }
    
    if (newPass !== confirmPass) {
        elements.passError.textContent = 'رمز جدید و تکرار آن مطابقت ندارند!';
        return;
    }
    
    if (newPass.length < 4) {
        elements.passError.textContent = 'رمز عبور باید حداقل 4 کاراکتر باشد';
        return;
    }
    
    if (!users[currentUser].canChangePassword) {
        elements.passError.textContent = 'شما مجوز تغییر رمز عبور را ندارید!';
        return;
    }
    
    // تغییر رمز عبور
    users[currentUser].password = newPass;
    displayMessage('رمز عبور شما با موفقیت تغییر یافت.', 'bot');
    closeModal();
    elements.changePassForm.reset();
}

// بارگذاری PDF از ریپازیتوری جدید
async function loadPDF() {
    try {
        showLoading(true, 'در حال بارگذاری منابع از ghanon-m-y-chatbot3...');
        
        // آدرس PDF در ریپازیتوری جدید
        const PDF_URLS = [
            `https://raw.githubusercontent.com/YOUR_USERNAME/ghanon-m-y-chatbot3/main/g1.pdf`,
            `https://raw.githubusercontent.com/j3rajerz/ghanon-m-y-chatbot3/main/g1.pdf`,
            `https://cdn.jsdelivr.net/gh/YOUR_USERNAME/ghanon-m-y-chatbot3/g1.pdf`
        ];
        
        let pdfData;
        let lastError;
        
        // امتحان کردن چندین منبع برای دریافت PDF
        for (const url of PDF_URLS) {
            try {
                const response = await fetch(`${url}?t=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`خطای HTTP: ${response.status}`);
                }
                pdfData = await response.arrayBuffer();
                if (pdfData && pdfData.byteLength > 0) break;
            } catch (error) {
                lastError = error;
                console.warn(`خطا در دریافت از ${url}:`, error);
            }
        }
        
        if (!pdfData || pdfData.byteLength === 0) {
            throw lastError || new Error('فایل PDF دریافت نشد');
        }
        
        const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
        let fullText = '';
        
        // محدود کردن به 20 صفحه اول برای عملکرد بهتر
        const pageCount = Math.min(pdf.numPages, 20);
        
        for (let i = 1; i <= pageCount; i++) {
            elements.loadingMessage.textContent = `در حال پردازش صفحه ${i} از ${pageCount}...`;
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
        }
        
        if (!fullText.trim()) {
            throw new Error('متنی از PDF استخراج نشد');
        }
        
        pdfText = fullText;
        showLoading(false);
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        
        displayMessage('سلام! من چت بات ghanon.m.y هستم. منابع حقوقی با موفقیت بارگذاری شدند.', 'bot');
        displayMessage('شما می‌توانید سوالات حقوقی خود را از من بپرسید.', 'bot');
        
    } catch (error) {
        console.error('خطا در بارگذاری PDF:', error);
        showLoading(false);
        
        let errorMessage = 'خطا در بارگذاری منابع از گیتهاب';
        if (error.message.includes('404')) {
            errorMessage = 'فایل PDF در ریپازیتوری یافت نشد';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'مشکل در اتصال به اینترنت';
        }
        
        displayMessage(errorMessage, 'bot');
        displayMessage('لطفاً موارد زیر را بررسی کنید:', 'bot');
        displayMessage('1. نام فایل باید دقیقاً g1.pdf باشد', 'bot');
        displayMessage('2. فایل باید در شاخه اصلی ریپازیتوری باشد', 'bot');
        displayMessage('3. ریپازیتوری باید عمومی (Public) باشد', 'bot');
        
        if (currentUser === 'abbas') {
            displayMessage(`خطای فنی: ${error.message}`, 'bot');
        }
    }
}

// نمایش/مخفی کردن نشانگر بارگذاری
function showLoading(show, message = '') {
    if (show) {
        elements.loadingIndicator.style.display = 'flex';
        elements.loadingMessage.textContent = message;
    } else {
        elements.loadingIndicator.style.display = 'none';
    }
}

// مدیریت ارسال سوالات
async function handleQuestion() {
    const question = elements.userInput.value.trim();
    if (!question || !pdfText) return;
    
    displayMessage(question, 'user');
    elements.userInput.value = '';
    elements.userInput.disabled = true;
    elements.sendBtn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const answer = findAnswerInText(question, pdfText);
        displayMessage(answer, 'bot');
    } catch (error) {
        console.error('خطا در پردازش سوال:', error);
        displayMessage('خطایی در پردازش سوال شما رخ داد.', 'bot');
    } finally {
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.userInput.focus();
    }
}

// الگوریتم پیشرفته برای یافتن پاسخ در متن
function findAnswerInText(question, text) {
    if (!text) return 'منابع حقوقی بارگذاری نشده‌اند.';
    
    const lowerQuestion = question.toLowerCase();
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 30);
    
    const legalKeywords = {
        'تعریف': ['تعریف', 'معنی', 'منظور از', 'چه مفهومی دارد'],
        'شرایط': ['شرایط', 'نیازهای', 'مقررات', 'چگونه', 'چطور'],
        'مجازات': ['مجازات', 'جریمه', 'تنبیه', 'کیفر', 'حکم'],
        'ماده': ['ماده', 'بند', 'اصل', 'تبصره'],
        'اثبات': ['اثبات', 'دلیل', 'سند', 'مدرک']
    };
    
    const scoredParagraphs = paragraphs.map(paragraph => {
        let score = 0;
        const lowerPara = paragraph.toLowerCase();
        
        question.split(' ').forEach(word => {
            if (word.length > 2 && lowerPara.includes(word.toLowerCase())) {
                score += 2;
            }
        });
        
        Object.entries(legalKeywords).forEach(([key, synonyms]) => {
            synonyms.forEach(synonym => {
                if (lowerQuestion.includes(synonym) && lowerPara.includes(key)) {
                    score += 5;
                }
            });
        });
        
        score += Math.max(0, 10 - paragraph.length / 50);
        
        return { paragraph, score };
    });
    
    scoredParagraphs.sort((a, b) => b.score - a.score);
    const bestMatch = scoredParagraphs[0];
    
    if (bestMatch && bestMatch.score > 5) {
        return bestMatch.paragraph;
    } else {
        return 'پاسخی برای این سوال در منابع یافت نشد. لطفاً سوال خود را دقیق‌تر بیان کنید.';
    }
}

// نمایش پیام‌ها در چت
function displayMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    elements.chatBox.appendChild(messageDiv);
    elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
}