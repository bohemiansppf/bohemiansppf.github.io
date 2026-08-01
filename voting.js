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
// 1. НАСТРОЙКИ FIREBASE
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB3mD-Bi8QTWGXe3fLZbs8bFLPp54qSOio",
  authDomain: "bohemians-app.firebaseapp.com",
  projectId: "bohemians-app",
  storageBucket: "bohemians-app.firebasestorage.app",
  messagingSenderId: "422065637395",
  appId: "1:422065637395:web:d8992a0a95b72e9f3017e6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DUMMY_DOMAIN = "@bohemians.local";

let currentUser = null;
let pollsData = [];
let unsubscribePolls = null; // Для управления подпиской на Firestore

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

  // Отправка формы входа
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const rawUsername = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (authError) authError.style.display = "none";

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
    const pollsContainer = document.getElementById('polls-container');

    if (user) {
      // --- ЮЗЕР ВОШЕЛ ---
      const cleanUsername = user.email ? user.email.split("@")[0] : "Člen";
      if (userEmailSpan) userEmailSpan.innerText = cleanUsername;

      if (authLoggedOut) authLoggedOut.style.display = "none";
      if (loginForm) loginForm.style.display = "none";
      if (authLoggedIn) authLoggedIn.style.display = "flex";

      // Запрашиваем данные из базы ТОЛЬКО после успешного входа
      if (!unsubscribePolls) {
        const pollsRef = collection(db, "polls");
        const q = query(pollsRef, orderBy("createdAt", "desc"));

        unsubscribePolls = onSnapshot(q, (snapshot) => {
          pollsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderPolls();
        }, (error) => {
          console.error("Firestore error:", error);
          if (pollsContainer) {
            pollsContainer.innerHTML = '<div class="polls-loading">Chyba při načítání dat.</div>';
          }
        });
      }
    } else {
      // --- ЮЗЕР НЕ ВОШЕЛ (ГОСТЬ) ---
      // Отписываемся от базы, если вышли
      if (unsubscribePolls) {
        unsubscribePolls();
        unsubscribePolls = null;
      }
      pollsData = [];

      if (authLoggedIn) authLoggedIn.style.display = "none";
      if (loginForm) loginForm.style.display = "none";
      if (authLoggedOut) authLoggedOut.style.display = "flex";

      // Показываем красивую заглушку с замочком
      if (pollsContainer) {
        pollsContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-top: 20px;">
            <p style="font-size: 1.3rem; margin-bottom: 10px;">
              🔒 <strong>Hlasování a výsledky jsou přístupné pouze členům spolku.</strong>
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Pro zobrazení probíhajících anket a výsledků se prosím přihlaste výše.
            </p>
          </div>
        `;
      }
    }
  });
});

// =========================================================================
// 3. ОТРИСОВКА ОПРОСОВ И РЕЗУЛЬТАТОВ
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
    const isClosed = poll.closesAt && new Date(poll.closesAt.seconds * 1000) < new Date();
    
    const votes = poll.votes || {};
    const totalVotes = Object.keys(votes).length;
    const userVotedOption = currentUser ? votes[currentUser.uid] : null;

    const optionCounts = (poll.options || []).map((_, idx) => {
      return Object.values(votes).filter(v => v === idx).length;
    });

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
                 ${isUserChoice ? 'Hlas započítán' : 'Hlasovat'}
               </button>`
            : ''
          }
        </div>
      `;
    });

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
