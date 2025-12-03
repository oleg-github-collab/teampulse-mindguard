# 🚀 Deployment Checklist - TeamPulse Mindguard AI

## Pre-Deployment Checklist

### ✅ Security

- [ ] Змінити дефолтний пароль (opslab/mindguard2025)
- [ ] Додати змінні оточення для credentials
- [ ] Увімкнути HTTPS/SSL
- [ ] Налаштувати Content Security Policy (CSP)
- [ ] Додати rate limiting для API
- [ ] Видалити console.log() з production коду
- [ ] Перевірити .gitignore (додати .env, node_modules)
- [ ] Налаштувати CORS для конкретних доменів
- [ ] Додати helmet security headers
- [ ] Впровадити JWT для автентифікації

### ✅ Performance

- [ ] Мінімізувати CSS/JS файли
- [ ] Налаштувати compression
- [ ] Додати кешування статичних файлів
- [ ] Оптимізувати зображення (якщо є)
- [ ] Налаштувати CDN для статики
- [ ] Перевірити розмір bundle
- [ ] Додати lazy loading для великих компонентів

### ✅ Database

- [ ] Мігрувати з JSON на PostgreSQL/MongoDB
- [ ] Налаштувати backup strategy
- [ ] Додати database migrations
- [ ] Налаштувати connection pooling
- [ ] Додати indices для швидких запитів
- [ ] Налаштувати database replication

### ✅ Monitoring & Logging

- [ ] Додати error tracking (Sentry)
- [ ] Налаштувати logging (Winston, Bunyan)
- [ ] Додати performance monitoring (New Relic, DataDog)
- [ ] Налаштувати uptime monitoring (UptimeRobot)
- [ ] Додати analytics (Google Analytics, Mixpanel)
- [ ] Налаштувати alerts для критичних помилок

### ✅ Environment

- [ ] Створити production .env файл
- [ ] Налаштувати NODE_ENV=production
- [ ] Перевірити всі environment variables
- [ ] Додати fallback значення
- [ ] Документувати всі env vars

### ✅ Testing

- [ ] Тести для API endpoints
- [ ] E2E тести для критичних флоу
- [ ] Перевірити на різних браузерах
- [ ] Перевірити на різних пристроях
- [ ] Performance тести
- [ ] Security scan (npm audit)

---

## Railway Deployment

### Step 1: Підготовка

```bash
# Перевірити що все працює локально
npm start

# Перевірити package.json
cat package.json

# Переконатися що є start script
# "start": "node server.js"
```

### Step 2: Встановлення Railway CLI

```bash
npm install -g @railway/cli
```

### Step 3: Логін та ініціалізація

```bash
railway login
railway init
```

### Step 4: Налаштування змінних оточення

В Railway dashboard:

```
PORT=3000
NODE_ENV=production
```

### Step 5: Деплой

```bash
railway up
```

### Step 6: Отримати URL

```bash
railway domain
```

### Step 7: Перевірка

Відкрийте отриманий URL в браузері.

---

## Heroku Deployment

### Step 1: Створити Procfile

```bash
echo "web: node server.js" > Procfile
```

### Step 2: Ініціалізація

```bash
# Встановити Heroku CLI
brew tap heroku/brew && brew install heroku

# Логін
heroku login

# Створити app
heroku create teampulse-mindguard
```

### Step 3: Налаштування

```bash
# Додати environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=3000

# Перевірити
heroku config
```

### Step 4: Деплой

```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

### Step 5: Відкрити

```bash
heroku open
```

### Step 6: Моніторинг

```bash
# Перегляд логів
heroku logs --tail

# Перевірка статусу
heroku ps
```

---

## Vercel Deployment

### Step 1: Встановлення

```bash
npm install -g vercel
```

### Step 2: Створити vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### Step 3: Деплой

```bash
vercel
```

### Step 4: Production деплой

```bash
vercel --prod
```

---

## Docker Deployment

### Step 1: Створити Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Step 2: Створити .dockerignore

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
```

### Step 3: Build

```bash
docker build -t teampulse-mindguard .
```

### Step 4: Run

```bash
docker run -p 3000:3000 -e NODE_ENV=production teampulse-mindguard
```

### Step 5: Деплой на Docker Hub

```bash
docker tag teampulse-mindguard your-username/teampulse-mindguard
docker push your-username/teampulse-mindguard
```

---

## Nginx Configuration (для VPS)

### Step 1: Встановити Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Встановити додаток

```bash
cd /var/www
git clone your-repo
cd teampulse-mindguard
npm install --production
```

### Step 3: Налаштувати PM2

```bash
npm install -g pm2
pm2 start server.js --name teampulse
pm2 save
pm2 startup
```

### Step 4: Nginx конфігурація

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: SSL з Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Post-Deployment Checklist

### ✅ Verification

- [ ] Відкрити landing page
- [ ] Перевірити login/logout
- [ ] Перевірити всі 3 місяці
- [ ] Перевірити графіки
- [ ] Перевірити AI-чат
- [ ] Перевірити advanced analytics
- [ ] Перевірити API endpoints
- [ ] Перевірити на мобільних пристроях

### ✅ Performance

- [ ] Перевірити load time (<3 секунд)
- [ ] Перевірити Lighthouse score (>90)
- [ ] Перевірити memory leaks
- [ ] Перевірити CPU usage

### ✅ Monitoring Setup

- [ ] Налаштувати uptime monitoring
- [ ] Підключити error tracking
- [ ] Налаштувати alerts
- [ ] Додати dashboard для метрик

### ✅ Backup

- [ ] Налаштувати автоматичні backups
- [ ] Перевірити restore процес
- [ ] Документувати backup strategy

---

## Production .env Template

```env
# Server
NODE_ENV=production
PORT=3000

# Security
SESSION_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Database (якщо використовуєте)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=teampulse
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# External Services
SENTRY_DSN=your-sentry-dsn
OPENAI_API_KEY=your-openai-key (for real AI)

# Email (якщо використовуєте)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password

# Monitoring
NEW_RELIC_LICENSE_KEY=your-key
```

---

## Security Enhancements for Production

### 1. Змінити authentication

```javascript
// Замість
if (username === 'opslab' && password === 'mindguard2025') {

// Використовувати
const bcrypt = require('bcrypt');
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 2. Додати rate limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. Налаштувати CSP

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));
```

### 4. HTTPS redirect

```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

---

## Rollback Plan

### Якщо щось пішло не так:

**Railway:**
```bash
railway rollback
```

**Heroku:**
```bash
heroku releases
heroku rollback v42  # замініть на попередню версію
```

**Docker:**
```bash
docker pull your-username/teampulse-mindguard:previous-tag
docker stop current-container
docker run new-container
```

**VPS:**
```bash
cd /var/www/teampulse-mindguard
git reset --hard previous-commit
pm2 restart teampulse
```

---

## Support Contacts

**Railway:** https://railway.app/help
**Heroku:** https://help.heroku.com
**Vercel:** https://vercel.com/support

---

## Success Criteria

✅ Uptime > 99.9%
✅ Response time < 500ms
✅ Zero security vulnerabilities
✅ Automated backups working
✅ Monitoring and alerts active
✅ All functionality working as expected

---

**Останнє оновлення:** 2024-10-31
**Версія:** 1.0.0
