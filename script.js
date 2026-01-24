document.addEventListener("DOMContentLoaded", () => {
  // === 1. МОБИЛЬНОЕ МЕНЮ (Твой старый код, чуть причесанный) ===
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      const icon = hamburger.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-bars");
        icon.classList.toggle("fa-times");
      }
    });

    document.querySelectorAll(".nav-link").forEach((n) =>
      n.addEventListener("click", () => {
        navMenu.classList.remove("active");
        const icon = hamburger.querySelector("i");
        if (icon) {
          icon.classList.add("fa-bars");
          icon.classList.remove("fa-times");
        }
      }),
    );
  }

  // === 2. АНИМАЦИЯ ПОЯВЛЕНИЯ ===
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".news-item").forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
    item.style.transition = "all 0.6s ease-out";
    observer.observe(item);
  });

  // === 3. LIGHTBOX (ГАЛЕРЕЯ) - НОВЫЙ КОД ===
  const lightbox = document.getElementById("lightbox");

  // Проверяем, есть ли лайтбокс на странице (чтобы не ломать index.html)
  if (lightbox) {
    const lightboxImg = document.getElementById("lightbox-img");
    const captionText = document.getElementById("lightbox-caption");
    const closeBtn = document.querySelector(".close-lightbox");
    const prevBtn = document.querySelector(".lightbox-prev");
    const nextBtn = document.querySelector(".lightbox-next");

    // Собираем все картинки в массив
    // Мы ищем img внутри .media-container, так как у тебя такая структура в foto.html
    const galleryImages = Array.from(
      document.querySelectorAll(".media-container img"),
    );

    let currentIndex = 0;

    // Функция открытия
    const openLightbox = (index) => {
      currentIndex = index;
      const img = galleryImages[currentIndex];

      lightbox.classList.add("active");
      lightboxImg.src = img.src;

      // Пытаемся найти описание.
      // 1. Сначала смотрим alt у картинки.
      // 2. Если нет, ищем текст в соседнем блоке .news-content -> h4
      let text = img.alt;
      if (!text || text === "") {
        const parentArticle = img.closest(".news-item");
        const title = parentArticle ? parentArticle.querySelector("h4") : null;
        if (title) text = title.innerText.trim();
      }

      captionText.innerText = text || ""; // Если текста нет совсем, будет пусто
      document.body.style.overflow = "hidden"; // Блокируем скролл сайта
    };

    // Функция закрытия
    const closeLightbox = () => {
      lightbox.classList.remove("active");
      document.body.style.overflow = "auto";
    };

    // Листание
    const showImage = (step) => {
      currentIndex += step;

      // Зацикливание (если дошли до конца - идем в начало)
      if (currentIndex >= galleryImages.length) currentIndex = 0;
      if (currentIndex < 0) currentIndex = galleryImages.length - 1;

      openLightbox(currentIndex);
    };

    // Вешаем события на картинки
    galleryImages.forEach((img, index) => {
      // Добавляем курсор-лупу, чтобы было понятно, что можно кликнуть
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => openLightbox(index));
    });

    // События кнопок
    closeBtn.addEventListener("click", closeLightbox);
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Чтобы клик не ушел на фон
      showImage(1);
    });
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showImage(-1);
    });

    // Закрытие по клику на фон
    lightbox.addEventListener("click", (e) => {
      if (
        e.target === lightbox ||
        e.target.closest(".lightbox-content-wrapper") === null
      ) {
        // Если кликнули не по картинке и не по кнопкам навигации
        if (!e.target.closest("button")) closeLightbox();
      }
    });

    // Клавиатура (Esc, Влево, Вправо)
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("active")) return;

      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showImage(1);
      if (e.key === "ArrowLeft") showImage(-1);
    });
  }
});
