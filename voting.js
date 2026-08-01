import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =========================================================================
// 1. НАСТРОЙКИ FIREBASE (Замени значения в кавычках на данные из Firebase)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB3mD-Bi8QTWGXe3fLZbs8bFLPp54qSOio",
  authDomain: "bohemians-app.firebaseapp.com",
  projectId: "bohemians-app",
  storageBucket: "bohemians-app.firebasestorage.app",
  messagingSenderId: "422065637395",
  appId: "1:422065637395:web:d8992a0a95b72e9f3017e6"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Фиктивный домен для работы авторизации без email
const DUMMY_DOMAIN = "@bohemians.local";

let currentUser = null;
let pollsData = [];

// =========================================================================
// 2. РАБОТА С DOM И АВТОРИЗАЦИЕЙ
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const authLoggedOut = document.getElementById("auth-logged-out");
  const authLoggedIn = document.getElementById("auth-logged-in");
  const loginForm = document.getElementById("login-form");
  const userEmailSpan = document.getElementById("user-email");
  const authError = document.getElementById("auth-error");
  const btnShowLogin = document.getElementById("btn-show-login");
  const btnCancelLogin = document.getElementById("btn-cancel-login");
  const btnLogout = document.getElementById("btn-logout");

  // Показ формы входа
  btnShowLogin?.addEventListener("click", () => {
    if (authLoggedOut) authLoggedOut.style.display = "none";
    if (loginForm) loginForm.style.display = "flex";
  });

  // Отмена входа
  btnCancelLogin?.addEventListener("click", () => {
    if (loginForm) loginForm.style.display = "none";
    if (authLoggedOut) authLoggedOut.style.display = "flex";
    if (authError) authError.style.display = "none";
  });

  // Обработка отправки формы входа
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const rawUsername = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (authError) authError.style.display = "none";

    // Приводим логин к формату e-mail
    const emailAuth = rawUsername.includes("@") ? rawUsername : `${rawUsername}${DUMMY_DOMAIN}`;

    try {
      await signInWithEmailAndPassword(auth, emailAuth, password);
      loginForm.reset();
      loginForm.style.display = "none";
    } catch (error) {
      console.error("Auth error:", error);
      if (authError) {
        authError.innerText = "Chybné přihlašovací jméno nebo heslo.";
        authError.style.display = "block";
      }
    }
  });

  // Выход из аккаунта
  btnLogout?.addEventListener("click", () => {
    signOut(auth);
  });

  // Отслеживание состояния входа
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      // Вытягиваем чистый логин без @bohemians.local
      const cleanUsername = user.email ? user.email.split("@")[0] : "Člen";
      if (userEmailSpan) userEmailSpan.innerText = cleanUsername;

      if (authLoggedOut) authLoggedOut.style.display = "none";
      if (loginForm) loginForm.style.display = "none";
      if (authLoggedIn) authLoggedIn.style.display = "flex";
    } else {
      if (authLoggedIn) authLoggedIn.style.display = "none";
      if (loginForm) loginForm.style.display = "none";
      if (authLoggedOut) authLoggedOut.style.display = "flex";
    }
    renderPolls();
  });

  // =========================================================================
  // 3. ПОЛУЧЕНИЕ ГОЛОСОВАНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
  // =========================================================================
  const pollsRef = collection(db, "polls");
  const q = query(pollsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    pollsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderPolls();
  }, (error) => {
    console.error("Firestore error:", error);
    const pollsContainer = document.getElementById("polls-container");
    if (pollsContainer) {
      pollsContainer.innerHTML = '<div class="polls-loading">Chyba při načítání dat. Zkontrolujte připojení.</div>';
    }
  });
});

// =========================================================================
// 4. ОТРЕСОВКА ОПРОСОВ И РЕЗУЛЬТАТОВ
// =========================================================================
function renderPolls() {
  const pollsContainer = document.getElementById("polls-container");
  if (!pollsContainer) return;

  if (pollsData.length === 0) {
    pollsContainer.innerHTML = '<div class="polls-loading">Zatím nebyly vytvořeny žádné průzkumy.</div>';
    return;
  }

  pollsContainer.innerHTML = "";

  pollsData.forEach(poll => {
    // Проверка закрытия опроса по времени
    const isClosed = poll.closesAt && new Date(poll.closesAt.seconds * 1000) < new Date();
    
    // Сбор всех голосов
    const votes = poll.votes || {};
    const totalVotes = Object.keys(votes).length;
    const userVotedOption = currentUser ? votes[currentUser.uid] : null;

    // Подсчет голосов по каждому варианту
    const optionCounts = (poll.options || []).map((_, idx) => {
      return Object.values(votes).filter(v => v === idx).length;
    });

    // Генерация HTML для опций
    let optionsHTML = "";
    (poll.options || []).forEach((optionText, idx) => {
      const count = optionCounts[idx];
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const isUserChoice = userVotedOption === idx;

      optionsHTML += `
        <div class="option-item ${isUserChoice ? "user-voted" : ""}">
          <div class="option-header">
            <span class="option-text">
              ${optionText} 
              ${isUserChoice ? '<i class="fas fa-check-circle" style="color: var(--primary-blue); margin-left: 5px;"></i>' : ''}
            </span>
            <span class="option-count">${percent}% (${count})</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percent}%"></div>
          </div>
          ${
            currentUser && !isClosed 
            ? `<button class="btn-primary-small btn-vote" data-poll="${poll.id}" data-option="${idx}">
                 ${isUserChoice ? 'Změnit volbu' : 'Hlasovat'}
               </button>`
            : ''
          }
        </div>
      `;
    });

    // Карточка опроса
    const pollCard = document.createElement("div");
    pollCard.className = `poll-card ${isClosed ? "closed" : ""}`;

    pollCard.innerHTML = `
      <div class="poll-header">
        <h3 class="poll-title">${poll.title}</h3>
        <span class="poll-status-badge ${isClosed ? 'badge-closed' : 'badge-active'}">
          ${isClosed ? 'Ukončeno' : 'Aktivní'}
        </span>
      </div>
      ${poll.description ? `<p class="poll-description">${poll.description}</p>` : ''}
      <div class="poll-meta">
        <span><i class="fas fa-users"></i> Celkem hlasů: ${totalVotes}</span>
        ${poll.closesAt ? `<span><i class="fas fa-clock"></i> Konec: ${new Date(poll.closesAt.seconds * 1000).toLocaleString('cs-CZ')}</span>` : ''}
      </div>
      <div class="poll-options">${optionsHTML}</div>
    `;

    pollsContainer.appendChild(pollCard);
  });

  // Привязка кликов к кнопкам «Hlasovat»
  document.querySelectorAll(".btn-vote").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const targetBtn = e.currentTarget;
      const pollId = targetBtn.dataset.poll;
      const optionIdx = parseInt(targetBtn.dataset.option);

      if (!currentUser) return;

      try {
        const pollDocRef = doc(db, "polls", pollId);
        await setDoc(pollDocRef, {
          votes: {
            [currentUser.uid]: optionIdx
          }
        }, { merge: true });
      } catch (err) {
        console.error("Voting error:", err);
        alert("Chyba při ukládání hlasu.");
      }
    });
  });
}
