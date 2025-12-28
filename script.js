document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления новостей (оставил твою идею, но сделал плавнее)
    const newsItems = document.querySelectorAll('.news-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    newsItems.forEach(item => {
        // Начальные стили задаем здесь, чтобы без JS сайт тоже выглядел норм
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'all 0.6s ease-out';
        observer.observe(item);
    });

    // Мобильное меню - современный подход
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');

            // Меняем иконку (опционально)
            const icon = hamburger.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Закрываем меню при клике на ссылку
        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const icon = hamburger.querySelector('i');
            if(icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }));
    }
});
