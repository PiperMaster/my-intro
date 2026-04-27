// === Core App State & Utilities ===
let exams = JSON.parse(localStorage.getItem('examScheduler_data')) || [];
let currentFiscalYear, showingArchive = false, activeTimers = {};
let currentUser = null;

// Dark Mode Init
if(localStorage.getItem('examScheduler_darkmode') === 'true') {
    document.body.classList.add('dark-mode');
}

// === Firebase Setup ===
const firebaseConfig = {
    apiKey: "AIzaSyCdFxHceR1tWkwldr3DzwVIUp_Wqf-ekxY",
    authDomain: "examschedulerv2.firebaseapp.com",
    projectId: "examschedulerv2",
    storageBucket: "examschedulerv2.firebasestorage.app",
    messagingSenderId: "1019163742434",
    appId: "1:1019163742434:web:1624b1099677ab93fa0ebb"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

function loadExamsFromCloud() {
    if(!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if(doc.exists && doc.data().exams) {
            exams = doc.data().exams;
        } else {
            exams = [];
        }
        if(window.render) window.render();
    }).catch(e => console.error("Error loading data: ", e));
}

function getFiscalYear(d) { const y=d.getFullYear(), m=d.getMonth()+1; return m>=4?y:y-1; }
currentFiscalYear = getFiscalYear(new Date());

function saveExams() { 
    localStorage.setItem('examScheduler_data', JSON.stringify(exams));
    if(currentUser) {
        db.collection('users').doc(currentUser.uid).set({
            exams: exams,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge: true}).catch(e => console.error("Error saving data: ", e));
    }
}

function formatDate(ds) {
    if (!ds) return '';
    if (ds instanceof Date) { return `${ds.getFullYear()}年${ds.getMonth()+1}月${ds.getDate()}日`; }
    const d = new Date(ds); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

const holidays = {
    "2025-01-01": "元日", "2025-01-13": "成人の日", "2025-02-11": "建国記念の日", "2025-02-23": "天皇誕生日", "2025-02-24": "振替休日",
    "2025-03-20": "春分の日", "2025-04-29": "昭和の日", "2025-05-03": "憲法記念日", "2025-05-04": "みどりの日", "2025-05-05": "こどもの日", "2025-05-06": "振替休日",
    "2025-07-21": "海の日", "2025-08-11": "山の日", "2025-09-15": "敬老の日", "2025-09-23": "秋分の日", "2025-10-13": "スポーツの日",
    "2025-11-03": "文化の日", "2025-11-23": "勤労感謝の日", "2025-11-24": "振替休日",
    "2026-01-01": "元日", "2026-01-12": "成人の日", "2026-02-11": "建国記念の日", "2026-02-23": "天皇誕生日",
    "2026-03-20": "春分の日", "2026-04-29": "昭和の日", "2026-05-03": "憲法記念日", "2026-05-04": "みどりの日", "2026-05-05": "こどもの日", "2026-05-06": "振替休日",
    "2026-07-20": "海の日", "2026-08-11": "山の日", "2026-09-21": "敬老の日", "2026-09-22": "国民の休日", "2026-09-23": "秋分の日", "2026-10-12": "スポーツの日",
    "2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日",
    "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日", "2027-02-23": "天皇誕生日",
    "2027-03-21": "春分の日", "2027-03-22": "振替休日", "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日", "2027-05-05": "こどもの日",
    "2027-07-19": "海の日", "2027-08-11": "山の日", "2027-09-20": "敬老の日", "2027-09-23": "秋分の日", "2027-10-11": "スポーツの日",
    "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日"
};
function getHolidayName(y,m,d) { return holidays[`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`]; }
function isHoliday(y,m,d) { return !!getHolidayName(y,m,d); }

function getStatusInfo(s) {
    const m = { planning:{label:'検討中',class:'status-planning'}, applying:{label:'申込期間中',class:'status-applying'}, applied:{label:'申込完了',class:'status-applied'}, studying:{label:'勉強中',class:'status-studying'}, finished:{label:'受験完了',class:'status-finished'} };
    return m[s]||m.planning;
}

function formatStudyTime(sec) {
    if(!sec) return "00:00:00";
    return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}

// === Global functions for onclick handlers ===
window.editExam = (id) => { const e=exams.find(x=>x.id===id); if(e) openModal(e); };
window.openModalWithDate = (y,m) => { openModal(null, `${y}-${String(m).padStart(2,'0')}-01`); };
window.scrollToExam = (id) => { const el=document.getElementById(`card-${id}`); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('highlight-pulse'); setTimeout(()=>el.classList.remove('highlight-pulse'),2000); } };

window.switchCardTab = (eid, tab) => {
    ['details','memo'].forEach(t => { 
        const c = document.getElementById(`tc-${eid}-${t}`);
        const b = document.getElementById(`tb-${eid}-${t}`);
        if(c) c.classList.add('hidden'); 
        if(b) b.classList.remove('active'); 
    });
    const tc = document.getElementById(`tc-${eid}-${tab}`);
    const tb = document.getElementById(`tb-${eid}-${tab}`);
    if(tc) tc.classList.remove('hidden');
    if(tb) tb.classList.add('active');
};

// === Firebase Auth Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    const authUnlogged = document.getElementById('auth-unlogged');
    const authLogged = document.getElementById('auth-logged');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const btnLoginGoogle = document.getElementById('btn-login-google');
    const btnLogout = document.getElementById('btn-logout');

    const toggleDarkMode = document.getElementById('toggle-darkmode');
    const toggleNotifications = document.getElementById('toggle-notifications');

    if(toggleDarkMode) {
        toggleDarkMode.checked = localStorage.getItem('examScheduler_darkmode') === 'true';
        toggleDarkMode.addEventListener('change', (e) => {
            if(e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('examScheduler_darkmode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('examScheduler_darkmode', 'false');
            }
        });
    }

    if(toggleNotifications) {
        toggleNotifications.checked = localStorage.getItem('examScheduler_notifications') === 'true';
        toggleNotifications.addEventListener('change', async (e) => {
            if(e.target.checked) {
                if (!("Notification" in window)) {
                    alert("このブラウザはプッシュ通知に対応していません。");
                    e.target.checked = false;
                    return;
                }
                const perm = await Notification.requestPermission();
                if(perm === 'granted') {
                    localStorage.setItem('examScheduler_notifications', 'true');
                    new Notification("プッシュ通知をオンにしました！", { body: "試験が近づくとお知らせします。" });
                } else {
                    e.target.checked = false;
                    localStorage.setItem('examScheduler_notifications', 'false');
                    alert("ブラウザの通知許可が拒否されています。設定をご確認ください。");
                }
            } else {
                localStorage.setItem('examScheduler_notifications', 'false');
            }
        });
    }

    if(btnLoginGoogle) {
        btnLoginGoogle.onclick = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(e => {
                console.error("Login failed:", e);
                alert("ログインに失敗しました。");
            });
        };
    }
    
    if(btnLogout) {
        btnLogout.onclick = () => {
            if(confirm("ログアウトしますか？（ローカルのデータ表示に戻ります）")) {
                auth.signOut();
            }
        };
    }

    auth.onAuthStateChanged(user => {
        if(user) {
            currentUser = user;
            if(authUnlogged) authUnlogged.classList.add('hidden');
            if(authLogged) authLogged.classList.remove('hidden');
            if(userAvatar) userAvatar.src = user.photoURL || '';
            if(userName) userName.textContent = user.displayName || 'ユーザー';
            if(userEmail) userEmail.textContent = user.email || '';
            loadExamsFromCloud();
        } else {
            currentUser = null;
            // Load local data on logout
            exams = JSON.parse(localStorage.getItem('examScheduler_data')) || [];
            if(window.render) window.render();
            
            if(authUnlogged) authUnlogged.classList.remove('hidden');
            if(authLogged) authLogged.classList.add('hidden');
        }
    });
});
