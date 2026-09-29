# Negah Admin Console

## راهنمای توسعه UI

[فارسی](docs/ui-component-guide.fa.md) | [English](docs/ui-component-guide.en.md)

Before building or changing a feature, read the [UI implementation and shared component guide](docs/ui-component-guide.en.md) for component selection, accordion behavior, styling rules, and production examples.

پیش از ساخت یا تغییر فیچر، [راهنمای کامپوننت‌ها و قواعد پیاده‌سازی UI](docs/ui-component-guide.fa.md) را بخوانید. این راهنما انتخاب کارت، خط‌چین، accordion، فرم و نمونه‌های واقعی را برای توسعه‌دهندگان و ایجنت‌ها توضیح می‌دهد.

Enterprise-grade admin dashboard for managing contracts, services, and business performance.

This project is a modern frontend application designed to provide a clear and efficient interface for internal company operations, including contract management, service tracking, performance reporting, and forecasting.

---

## ✨ Key Features

- Contract management (create, edit, view, and organize contracts)
- Service and client management
- Company performance tracking
- Forecasting and analytics overview
- Clean, responsive, and user-friendly UI
- Scalable architecture suitable for enterprise applications

---

## 🧱 Tech Stack

- **React** – Component-based UI development
- **Ant Design (AntD)** – Enterprise-class UI framework
- **React Router** – Client-side routing
- **Axios** – HTTP client for API communication
- **Day.js** – Date and time handling
- **JavaScript (ES6+)**

> The project is structured with scalability and maintainability in mind, following common enterprise frontend best practices.

---

## 📂 Project Structure

```text
src/
├── components/      # Reusable UI components
├── pages/           # Application pages (Dashboard, Contracts, Services, etc.)
├── routes/          # Route definitions
├── services/        # API communication layer
├── hooks/           # Custom React hooks
├── utils/           # Helper functions
├── assets/          # Static assets
└── App.js
