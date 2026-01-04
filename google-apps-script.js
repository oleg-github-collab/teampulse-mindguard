/**
 * TeamPulse Mindguard AI - CRM Apps Script
 * Автоматична система обробки заявок з лендінгу
 *
 * ІНСТРУКЦІЯ З НАЛАШТУВАННЯ:
 *
 * 1. Відкрийте Google Spreadsheet: https://docs.google.com/spreadsheets/d/1hftScjBinIi3rMZuM_tb_hQrT_By5clz-1Xy59W4Elk/edit
 * 2. Розширення → Apps Script
 * 3. Скопіюйте весь цей код у редактор Apps Script
 * 4. Натисніть "Розгорнути" → "Нове розгортання"
 * 5. Тип: Веб-додаток
 * 6. Виконати як: Я (your.email@gmail.com)
 * 7. Доступ: Будь-хто
 * 8. Натисніть "Розгорнути"
 * 9. Скопіюйте URL розгортання (він виглядає як: https://script.google.com/macros/s/AKfycby.../exec)
 * 10. Вставте цей URL у форму на лендінгу
 */

// ============================================
// НАЛАШТУВАННЯ
// ============================================

const CONFIG = {
  // Email адміністратора для сповіщень
  ADMIN_EMAIL: 'work.olegkaminskyi@gmail.com',

  // Назва аркуша для заявок
  SHEET_NAME: 'Заявки',

  // Назва аркуша для статистики
  STATS_SHEET_NAME: 'Статистика',

  // Шаблон email для клієнта
  CLIENT_EMAIL_SUBJECT: '✅ Заявка отримана - TeamPulse Mindguard AI',

  // Шаблон email для адміністратора
  ADMIN_EMAIL_SUBJECT: '🚀 Нова заявка на TeamPulse Mindguard AI',

  // Статуси заявок
  STATUSES: {
    NEW: '🆕 Нова',
    CONTACTED: '📞 Зв\'язалися',
    IN_PROGRESS: '⏳ В роботі',
    DEMO_SCHEDULED: '📅 Демо заплановано',
    COMPLETED: '✅ Закрито',
    REJECTED: '❌ Відхилено'
  }
};

// ============================================
// ОСНОВНА ФУНКЦІЯ - ПРИЙОМ ДАНИХ З ФОРМИ
// ============================================

function doPost(e) {
  try {
    // Логуємо отримані дані
    Logger.log('Отримано POST запит: ' + JSON.stringify(e));

    // Парсимо дані з форми
    const data = JSON.parse(e.postData.contents);
    Logger.log('Розпарсені дані: ' + JSON.stringify(data));

    // Перевіряємо обов'язкові поля
    if (!data.company || !data.name || !data.email || !data.phone || !data.teamSize) {
      return createResponse({
        success: false,
        message: 'Заповніть всі обов\'язкові поля'
      });
    }

    // Зберігаємо заявку в таблицю
    const leadId = saveLead(data);
    Logger.log('Заявка збережена з ID: ' + leadId);

    // Відправляємо email клієнту
    try {
      sendClientEmail(data);
      Logger.log('Email клієнту відправлено на: ' + data.email);
    } catch (emailError) {
      Logger.log('Помилка відправки email клієнту: ' + emailError);
    }

    // Відправляємо email адміністратору
    try {
      sendAdminEmail(data, leadId);
      Logger.log('Email адміністратору відправлено');
    } catch (emailError) {
      Logger.log('Помилка відправки email адміністратору: ' + emailError);
    }

    // Оновлюємо статистику
    updateStats(data);

    return createResponse({
      success: true,
      message: 'Заявка успішно отримана! Очікуйте на email.',
      leadId: leadId
    });

  } catch (error) {
    Logger.log('Помилка doPost: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return createResponse({
      success: false,
      message: 'Помилка обробки заявки: ' + error.message
    });
  }
}

// ============================================
// ТЕСТОВА ФУНКЦІЯ (для перевірки в редакторі)
// ============================================

function testDoPost() {
  const testData = {
    company: 'Test Company',
    name: 'Тестовий Користувач',
    email: 'test@example.com',
    phone: '+380501234567',
    teamSize: '26-50',
    message: 'Тестова заявка для перевірки системи'
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(mockEvent);
  Logger.log('Результат тесту: ' + result.getContent());

  // Відкриваємо таблицю для перевірки
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  Logger.log('Перевірте аркуш "' + CONFIG.SHEET_NAME + '" - додано новий рядок');
}

// ============================================
// ЗБЕРЕЖЕННЯ ЗАЯВКИ В GOOGLE SHEETS
// ============================================

function saveLead(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // Створюємо аркуш якщо його немає
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    initializeLeadsSheet(sheet);
  }

  // Генеруємо ID заявки
  const leadId = 'LEAD-' + new Date().getTime();
  const timestamp = new Date();

  // Додаємо рядок з даними
  sheet.appendRow([
    leadId,
    timestamp,
    data.company,
    data.name,
    data.email,
    data.phone,
    data.teamSize,
    data.message || '-',
    CONFIG.STATUSES.NEW,
    '', // Примітки (порожнє)
    '', // Відповідальний (порожнє)
    calculatePriority(data.teamSize),
    calculateEstimatedRevenue(data.teamSize)
  ]);

  // Форматуємо останній рядок
  formatLastRow(sheet);

  return leadId;
}

// ============================================
// ІНІЦІАЛІЗАЦІЯ АРКУША ЗАЯВОК
// ============================================

function initializeLeadsSheet(sheet) {
  // Заголовки таблиці
  const headers = [
    'ID Заявки',
    'Дата/Час',
    'Компанія',
    'Ім\'я',
    'Email',
    'Телефон',
    'Розмір Команди',
    'Повідомлення',
    'Статус',
    'Примітки',
    'Відповідальний',
    'Пріоритет',
    'Орієнтовний Дохід'
  ];

  sheet.appendRow(headers);

  // Форматування заголовків
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#6366f1');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  // Ширина колонок
  sheet.setColumnWidth(1, 150); // ID
  sheet.setColumnWidth(2, 150); // Дата
  sheet.setColumnWidth(3, 200); // Компанія
  sheet.setColumnWidth(4, 150); // Ім'я
  sheet.setColumnWidth(5, 200); // Email
  sheet.setColumnWidth(6, 120); // Телефон
  sheet.setColumnWidth(7, 150); // Розмір команди
  sheet.setColumnWidth(8, 300); // Повідомлення
  sheet.setColumnWidth(9, 120); // Статус
  sheet.setColumnWidth(10, 200); // Примітки
  sheet.setColumnWidth(11, 150); // Відповідальний
  sheet.setColumnWidth(12, 100); // Пріоритет
  sheet.setColumnWidth(13, 150); // Дохід

  // Заморожуємо перший рядок
  sheet.setFrozenRows(1);
}

// ============================================
// ФОРМАТУВАННЯ ОСТАННЬОГО РЯДКА
// ============================================

function formatLastRow(sheet) {
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow, 1, 1, 13);

  // Чергування кольорів рядків
  if (lastRow % 2 === 0) {
    range.setBackground('#f8fafc');
  } else {
    range.setBackground('#ffffff');
  }

  // Форматування дати
  sheet.getRange(lastRow, 2).setNumberFormat('dd.mm.yyyy hh:mm:ss');

  // Вирівнювання
  range.setVerticalAlignment('middle');

  // Колір статусу
  const statusCell = sheet.getRange(lastRow, 9);
  statusCell.setBackground('#e0e7ff');
  statusCell.setFontWeight('bold');

  // Колір пріоритету
  const priorityCell = sheet.getRange(lastRow, 12);
  const priority = priorityCell.getValue();
  if (priority === '🔥 Високий') {
    priorityCell.setBackground('#fee2e2');
  } else if (priority === '⚡ Середній') {
    priorityCell.setBackground('#fef3c7');
  } else {
    priorityCell.setBackground('#dbeafe');
  }
}

// ============================================
// РОЗРАХУНОК ПРІОРИТЕТУ
// ============================================

function calculatePriority(teamSize) {
  const size = parseInt(teamSize.split('-')[0]) || 0;

  if (size >= 51) return '🔥 Високий';
  if (size >= 26) return '⚡ Середній';
  return '💡 Низький';
}

// ============================================
// РОЗРАХУНОК ОРІЄНТОВНОГО ДОХОДУ
// ============================================

function calculateEstimatedRevenue(teamSize) {
  // Середня ціна за співробітника на місяць: $15
  const pricePerEmployee = 15;

  const sizeMap = {
    '5-10': 7.5,
    '11-25': 18,
    '26-50': 38,
    '51-100': 75,
    '100+': 150
  };

  const avgSize = sizeMap[teamSize] || 7.5;
  const monthlyRevenue = avgSize * pricePerEmployee;

  // Річний дохід (з припущенням 12 місяців)
  return '$' + (monthlyRevenue * 12).toLocaleString();
}

// ============================================
// ВІДПРАВКА EMAIL КЛІЄНТУ
// ============================================

function sendClientEmail(data) {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .info-box { background: #f0f9ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        h1 { margin: 0; font-size: 28px; }
        h2 { color: #6366f1; font-size: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧠 TeamPulse Mindguard AI</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ваша заявка успішно отримана!</p>
        </div>

        <div class="content">
          <h2>Дякуємо, ${data.name}!</h2>

          <p>Ми отримали вашу заявку від компанії <strong>${data.company}</strong>. Наша команда вже розглядає її та найближчим часом зв'яжеться з вами для обговорення деталей.</p>

          <div class="info-box">
            <strong>📋 Деталі вашої заявки:</strong><br>
            📧 Email: ${data.email}<br>
            📱 Телефон: ${data.phone}<br>
            👥 Розмір команди: ${data.teamSize}<br>
            ${data.message ? '💬 Повідомлення: ' + data.message : ''}
          </div>

          <h2>Що далі?</h2>
          <p>
            1️⃣ Наш менеджер зв'яжеться з вами протягом <strong>24 годин</strong><br>
            2️⃣ Ми проведемо безкоштовну консультацію та відповімо на всі питання<br>
            3️⃣ Підготуємо індивідуальну пропозицію для вашої команди<br>
            4️⃣ За бажання організуємо демонстрацію платформи
          </p>

          <div style="text-align: center;">
            <a href="https://teampulse-mindguard-production.up.railway.app/dashboard.html" class="button">Переглянути Демо Платформи</a>
          </div>

          <div class="info-box">
            <strong>💡 Корисна інформація:</strong><br>
            Поки ви очікуєте на нашу відповідь, рекомендуємо ознайомитись з демо-версією платформи. Там ви побачите приклади дашбордів, метрик та аналітики для моніторингу психічного здоров'я команди.
          </div>
        </div>

        <div class="footer">
          <p><strong>TeamPulse Mindguard AI by OpsLab</strong></p>
          <p>Є питання? Відповідайте на цей email або телефонуйте: +380 XX XXX XX XX</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 15px;">
            © 2025 TeamPulse Mindguard AI. Всі права захищені.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: CONFIG.CLIENT_EMAIL_SUBJECT,
    htmlBody: htmlBody
  });
}

// ============================================
// ВІДПРАВКА EMAIL АДМІНІСТРАТОРУ
// ============================================

function sendAdminEmail(data, leadId) {
  const priority = calculatePriority(data.teamSize);
  const revenue = calculateEstimatedRevenue(data.teamSize);

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 12px 12px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .data-table td:first-child { font-weight: bold; color: #6366f1; width: 40%; }
        .priority-high { background: #fee2e2; color: #dc2626; padding: 8px 16px; border-radius: 6px; font-weight: bold; }
        .priority-medium { background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 6px; font-weight: bold; }
        .priority-low { background: #dbeafe; color: #2563eb; padding: 8px 16px; border-radius: 6px; font-weight: bold; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        h1 { margin: 0; font-size: 28px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Нова Заявка!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">TeamPulse Mindguard AI</p>
        </div>

        <div class="content">
          <p><strong>ID Заявки:</strong> ${leadId}</p>
          <p><strong>Дата/Час:</strong> ${new Date().toLocaleString('uk-UA')}</p>

          <div style="text-align: center; margin: 20px 0;">
            <span class="priority-${priority.includes('Високий') ? 'high' : priority.includes('Середній') ? 'medium' : 'low'}">
              ${priority}
            </span>
          </div>

          <table class="data-table">
            <tr>
              <td>🏢 Компанія</td>
              <td>${data.company}</td>
            </tr>
            <tr>
              <td>👤 Ім'я</td>
              <td>${data.name}</td>
            </tr>
            <tr>
              <td>📧 Email</td>
              <td><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td>📱 Телефон</td>
              <td><a href="tel:${data.phone}">${data.phone}</a></td>
            </tr>
            <tr>
              <td>👥 Розмір команди</td>
              <td>${data.teamSize}</td>
            </tr>
            <tr>
              <td>💰 Орієнтовний дохід/рік</td>
              <td><strong style="color: #10b981; font-size: 18px;">${revenue}</strong></td>
            </tr>
            ${data.message ? `
            <tr>
              <td>💬 Повідомлення</td>
              <td>${data.message}</td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align: center;">
            <a href="https://docs.google.com/spreadsheets/d/1hftScjBinIi3rMZuM_tb_hQrT_By5clz-1Xy59W4Elk/edit" class="button">
              Відкрити CRM
            </a>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>⚡ Дія потрібна:</strong><br>
            Зв'яжіться з клієнтом протягом 24 годин та оновіть статус заявки в CRM.
          </div>
        </div>

        <div class="footer">
          <p><strong>TeamPulse Mindguard AI - CRM System</strong></p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
            Автоматично згенеровано Apps Script
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    subject: CONFIG.ADMIN_EMAIL_SUBJECT,
    htmlBody: htmlBody
  });
}

// ============================================
// ОНОВЛЕННЯ СТАТИСТИКИ
// ============================================

function updateStats(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let statsSheet = ss.getSheetByName(CONFIG.STATS_SHEET_NAME);

    // Створюємо аркуш статистики якщо його немає
    if (!statsSheet) {
      statsSheet = ss.insertSheet(CONFIG.STATS_SHEET_NAME);
      initializeStatsSheet(statsSheet);
    }

    // Отримуємо поточну дату
    const today = new Date();
    const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd.MM.yyyy');

    // Перевіряємо чи є дані в таблиці
    const lastRow = statsSheet.getLastRow();

    if (lastRow <= 1) {
      // Немає даних - додаємо перший рядок
      statsSheet.appendRow([today, 1, data.teamSize]);
      return;
    }

    // Шукаємо рядок з сьогоднішньою датою
    const dataRange = statsSheet.getRange(2, 1, lastRow - 1, 3);
    const values = dataRange.getValues();
    let rowFound = false;

    for (let i = 0; i < values.length; i++) {
      if (values[i][0]) {
        const cellDate = Utilities.formatDate(new Date(values[i][0]), Session.getScriptTimeZone(), 'dd.MM.yyyy');
        if (cellDate === dateStr) {
          // Оновлюємо лічильник
          const currentCount = values[i][1] || 0;
          statsSheet.getRange(i + 2, 2).setValue(currentCount + 1);
          rowFound = true;
          break;
        }
      }
    }

    // Якщо рядка немає - додаємо новий
    if (!rowFound) {
      statsSheet.appendRow([today, 1, data.teamSize]);
    }
  } catch (error) {
    Logger.log('Помилка updateStats: ' + error);
    // Не блокуємо основний процес якщо статистика не працює
  }
}

// ============================================
// ІНІЦІАЛІЗАЦІЯ АРКУША СТАТИСТИКИ
// ============================================

function initializeStatsSheet(sheet) {
  const headers = ['Дата', 'Кількість заявок', 'Популярний розмір команди'];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, 3);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#10b981');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 200);

  sheet.setFrozenRows(1);
}

// ============================================
// СТВОРЕННЯ ВІДПОВІДІ
// ============================================

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ДОДАТКОВІ ФУНКЦІЇ ДЛЯ РУЧНОГО КЕРУВАННЯ
// ============================================

/**
 * Оновити статус заявки
 * Використовуйте в меню: Розширення → Макроси → updateLeadStatus
 */
function updateLeadStatus() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  const activeRange = sheet.getActiveRange();
  const row = activeRange.getRow();

  if (row === 1) {
    ui.alert('Оберіть рядок із заявкою (не заголовок)');
    return;
  }

  const result = ui.alert(
    'Оновити статус',
    'Виберіть новий статус для заявки:',
    ui.ButtonSet.OK_CANCEL
  );

  if (result === ui.Button.OK) {
    // Тут можна додати вибір статусу через prompt або menu
    ui.alert('Функція в розробці. Редагуйте статус вручну в колонці "Статус".');
  }
}

/**
 * Створити звіт за період
 */
function generateReport() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Звіт', 'Функція генерації звітів в розробці', ui.ButtonSet.OK);
}
