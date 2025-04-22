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

// بارگذاری PDF از ریپازیتوری
async function loadPDF() {
    try {
        showLoading(true, 'در حال بارگذاری منابع حقوقی...');
        
        // آدرس‌های مختلف برای دریافت PDF
        const PDF_URLS = [
            `https://raw.githubusercontent.com/j3rajerz/ghanon-m-y-chatbot3/main/g1.pdf`,
            `https://j3rajerz.github.io/ghanon-m-y-chatbot3/g1.pdf`,
            `https://cdn.jsdelivr.net/gh/j3rajerz/ghanon-m-y-chatbot3/g1.pdf`
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
        
        displayMessage('سلام! من چت بات حقوقی ghanon.m.y هستم.', 'bot');
        displayMessage('منابع حقوقی با موفقیت بارگذاری شدند. لطفاً سوال خود را مطرح کنید.', 'bot');
        
    } catch (error) {
        console.error('خطا در بارگذاری PDF:', error);
        showLoading(false);
        
        let errorMessage = 'خطا در بارگذاری منابع';
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
        // نمایش نشانگر "در حال تایپ"
        const typingIndicator = displayTypingIndicator();
        
        // تولید پاسخ هوشمند
        const answer = await generateAIResponse(question, pdfText);
        
        // حذف نشانگر تایپ و نمایش پاسخ
        elements.chatBox.removeChild(typingIndicator);
        displayMessage(answer, 'bot');
        
    } catch (error) {
        console.error('خطا در تولید پاسخ:', error);
        displayMessage('خطایی در پردازش سوال شما رخ داد.', 'bot');
    } finally {
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.userInput.focus();
    }
}

// تابع جدید برای تولید پاسخ هوشمند
async function generateAIResponse(question, pdfText) {
    // یافتن متن مرتبط
    const relevantText = findRelevantText(question, pdfText);
    
    // تحلیل سوال با compromise
    const nlp = window.nlp(question);
    const questionType = detectQuestionType(nlp);
    
    // تولید پاسخ بر اساس نوع سوال
    switch(questionType) {
        case 'definition':
            return generateDefinitionResponse(question, relevantText);
        case 'clause':
            return generateClauseResponse(question, relevantText);
        case 'punishment':
            return generatePunishmentResponse(question, relevantText);
        case 'comparison':
            return generateComparisonResponse(question, relevantText);
        default:
            return generateGeneralResponse(question, relevantText);
    }
}

// تشخیص نوع سوال با NLP
function detectQuestionType(nlpDoc) {
    if (nlpDoc.has('تعریف #Noun') || nlpDoc.has('معنی #Noun')) {
        return 'definition';
    }
    if (nlpDoc.has('تبصره #Number') || nlpDoc.has('بند #Number')) {
        return 'clause';
    }
    if (nlpDoc.has('مجازات') || nlpDoc.has('جریمه')) {
        return 'punishment';
    }
    if (nlpDoc.has('مقایسه') || nlpDoc.has('تفاوت')) {
        return 'comparison';
    }
    return 'general';
}

// یافتن متن مرتبط با سوال
function findRelevantText(question, text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 30);
    const nlpQuestion = window.nlp(question);
    
    // کلیدواژه‌های حقوقی
    const legalKeywords = {
        'تبصره': ['تبصره', 'بند', 'جزء'],
        'ماده': ['ماده', 'اصل', 'قانون'],
        'مجازات': ['مجازات', 'جریمه', 'کیفر'],
        'شرط': ['شرط', 'شرایط', 'مقررات']
    };
    
    // امتیازدهی به پاراگراف‌ها
    const scoredParagraphs = paragraphs.map(paragraph => {
        let score = 0;
        const lowerPara = paragraph.toLowerCase();
        const nlpPara = window.nlp(paragraph);
        
        // تطابق کلمات کلیدی
        Object.entries(legalKeywords).forEach(([key, synonyms]) => {
            synonyms.forEach(synonym => {
                if (nlpQuestion.has(synonym) && nlpPara.has(key)) {
                    score += 5;
                }
            });
        });
        
        // تطابق اعداد (برای مواد و تبصره‌ها)
        const numbers = nlpQuestion.numbers().out('array');
        numbers.forEach(num => {
            if (paragraph.includes(num)) {
                score += 3;
            }
        });
        
        // تطابق اسامی خاص
        const nouns = nlpQuestion.nouns().out('array');
        nouns.forEach(noun => {
            if (paragraph.includes(noun)) {
                score += 2;
            }
        });
        
        return { paragraph, score };
    });
    
    // انتخاب بهترین متن‌های مرتبط
    scoredParagraphs.sort((a, b) => b.score - a.score);
    return scoredParagraphs.slice(0, 3).map(item => item.paragraph).join('\n\n');
}

// تولید پاسخ برای سوالات تعریفی
function generateDefinitionResponse(question, relevantText) {
    const nlp = window.nlp(question);
    const term = nlp.nouns().out('array')[0] || 'این مفهوم';
    
    const definition = findDefinition(term, relevantText);
    if (definition) {
        return `تعریف ${term}:\n\n${definition.text}\n\nمنبع: ${definition.source}\n\n` +
               `تحلیل: ${analyzeDefinition(definition.text)}`;
    }
    
    return `تعریف دقیقی برای "${term}" در منابع یافت نشد. لطفاً سوال خود را به شکل دیگری مطرح کنید.`;
}

// تولید پاسخ برای تبصره‌ها و بندها
function generateClauseResponse(question, relevantText) {
    const nlp = window.nlp(question);
    const numbers = nlp.numbers().out('array');
    const clauseType = question.includes('تبصره') ? 'تبصره' : 'بند';
    
    if (numbers.length > 0) {
        const clause = findClause(clauseType, numbers[0], relevantText);
        if (clause) {
            return `${clauseType} ${numbers[0]}:\n\n${clause.text}\n\n` +
                   `تحلیل حقوقی: ${analyzeClause(clause.text)}\n\n` +
                   `کاربرد: ${explainClauseUsage(clause.text)}`;
        }
    }
    
    return `متن مرتبط با ${clauseType}:\n\n${relevantText}\n\n` +
           `لطفاً شماره دقیق ${clauseType} را ذکر کنید تا تحلیل دقیق‌تری ارائه شود.`;
}

// تولید پاسخ برای مجازات‌ها
function generatePunishmentResponse(question, relevantText) {
    const punishments = findPunishments(relevantText);
    if (punishments.length > 0) {
        let response = `مقررات مرتبط با مجازات:\n\n`;
        punishments.forEach(p => {
            response += `- ${p.text} (${p.source})\n`;
        });
        return response + `\nتحلیل کلی: ${analyzePunishments(punishments)}`;
    }
    
    return `متن مرتبط با مجازات:\n\n${relevantText}\n\n` +
           `برای تحلیل دقیق‌تر، لطفاً نام جرم یا تخلف را مشخص کنید.`;
}

// تولید پاسخ عمومی
function generateGeneralResponse(question, relevantText) {
    const analysis = analyzeText(relevantText);
    return `پاسخ به سوال شما:\n\n${relevantText}\n\n` +
           `تحلیل و نتیجه‌گیری:\n${analysis}\n\n` +
           `در صورت نیاز به اطلاعات بیشتر، سوال خود را دقیق‌تر فرمایید.`;
}

// توابع کمکی برای تحلیل متن
function findDefinition(term, text) {
    const pattern = new RegExp(`(تعریف|منظور از|مقصود) (از )?${term}[\\s\\S]*?((ماده|تبصره) \\d+)`, 'gi');
    const match = pattern.exec(text);
    if (match) {
        return {
            term: term,
            text: match[0].split('\n')[0],
            source: match[3]
        };
    }
    return null;
}

function findClause(type, number, text) {
    const pattern = new RegExp(`${type} ${number}[\\s\\S]*?((ماده|تبصره) \\d+|$)`, 'gi');
    const match = pattern.exec(text);
    if (match) {
        return {
            type: type,
            number: number,
            text: match[0].trim()
        };
    }
    return null;
}

function findPunishments(text) {
    const pattern = /(مجازات|جریمه)[\s\S]*?((ماده|تبصره) \d+)/gi;
    const matches = [...text.matchAll(pattern)];
    return matches.map(match => ({
        text: match[0].split('\n')[0],
        source: match[2]
    }));
}

function analyzeDefinition(text) {
    const analysis = [];
    if (text.includes('هر')) analysis.push('تعریف جامع و کلی ارائه شده است');
    if (text.includes('یا')) analysis.push('تعریف شامل حالات مختلف است');
    if (text.includes('شامل')) analysis.push('تعریف شامل مصادیق متعدد می‌شود');
    return analysis.length > 0 ? analysis.join(' و ') : 'تعریف استاندارد حقوقی';
}

function analyzeClause(text) {
    const analysis = [];
    if (text.includes('مجازات')) analysis.push('حاوی مقررات کیفری است');
    if (text.includes('ممنوع')) analysis.push('شامل ممنوعیت‌هایی است');
    if (text.includes('شرایط')) analysis.push('شروط خاصی را تعیین کرده است');
    return analysis.length > 0 ? analysis.join(' و ') : 'مربوط به تنظیم مقررات است';
}

function explainClauseUsage(text) {
    if (text.includes('مجازات')) return 'در پرونده‌های کیفری کاربرد دارد';
    if (text.includes('حقوق')) return 'در قراردادها و دعاوی حقوقی مورد استناد قرار می‌گیرد';
    return 'در موارد مختلف حقوقی و قضایی قابل استناد است';
}

function analyzePunishments(punishments) {
    const types = punishments.some(p => p.text.includes('حبس')) ? 'شامل حبس' : '';
    const fines = punishments.some(p => p.text.includes('جریمه نقدی')) ? 'و جریمه نقدی' : '';
    return `این مجازات‌ها ${types} ${fines} می‌باشند. میزان دقیق مجازات به شرایط و نحوه ارتکاب جرم بستگی دارد.`;
}

function analyzeText(text) {
    const sentences = text.split(/[.!؟]/).filter(s => s.trim().length > 0);
    const mainPoints = sentences.slice(0, 3).map(s => `- ${s.trim()}`).join('\n');
    return `نکات کلیدی:\n${mainPoints}\n\nاین متن حاوی اطلاعات حقوقی تخصصی است و تفسیر نهایی آن به شرایط خاص هر پرونده بستگی دارد.`;
}

// نمایش نشانگر تایپ
function displayTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message bot-message typing-indicator';
    indicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    elements.chatBox.appendChild(indicator);
    elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    return indicator;
}

// نمایش پیام‌ها در چت با قالب‌بندی
function displayMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    if (sender === 'bot') {
        // قالب‌بندی پاسخ‌های حقوقی
        const sections = message.split('\n\n');
        let formattedMessage = '';
        
        sections.forEach(section => {
            if (section.startsWith('تعریف') || section.startsWith('تبصره') || section.startsWith('مقررات')) {
                formattedMessage += `<div class="response-header">${section.split(':')[0]}:</div>`;
                formattedMessage += `<div class="response-section">${section.split(':').slice(1).join(':')}</div>`;
            } 
            else if (section.startsWith('تحلیل') || section.startsWith('کاربرد')) {
                formattedMessage += `<div class="analysis">${section}</div>`;
            }
            else if (section.includes('ماده') || section.includes('تبصره')) {
                formattedMessage += `<div class="legal-reference">${section}</div>`;
            }
            else {
                formattedMessage += `<div>${section}</div>`;
            }
        });
        
        messageDiv.innerHTML = formattedMessage;
    } else {
        messageDiv.textContent = message;
    }
    
    elements.chatBox.appendChild(messageDiv);
    elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
}
