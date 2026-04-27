// === Core App State & Utilities ===
let exams = JSON.parse(localStorage.getItem('examScheduler_data')) || [];
let currentFiscalYear, showingArchive = false, activeTimers = {};

function getFiscalYear(d) { const y=d.getFullYear(), m=d.getMonth()+1; return m>=4?y:y-1; }
currentFiscalYear = getFiscalYear(new Date());

function saveExams() { localStorage.setItem('examScheduler_data', JSON.stringify(exams)); }

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
window.deleteExam = (id) => { if(confirm('この資格試験を削除してもよろしいですか？')){ exams=exams.filter(e=>e.id!==id); saveExams(); render(); } };
window.editExam = (id) => { const e=exams.find(x=>x.id===id); if(e) openModal(e); };
window.openModalWithDate = (y,m) => { openModal(null, `${y}-${String(m).padStart(2,'0')}-01`); };
window.scrollToExam = (id) => { const el=document.getElementById(`card-${id}`); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('highlight-pulse'); setTimeout(()=>el.classList.remove('highlight-pulse'),2000); } };

window.switchCardTab = (eid, tab) => {
    ['details','todo','study'].forEach(t => { document.getElementById(`tc-${eid}-${t}`).classList.add('hidden'); document.getElementById(`tb-${eid}-${t}`).classList.remove('active'); });
    document.getElementById(`tc-${eid}-${tab}`).classList.remove('hidden');
    document.getElementById(`tb-${eid}-${tab}`).classList.add('active');
};

window.addTodo = (eid) => {
    const inp=document.getElementById(`todo-inp-${eid}`), txt=inp.value.trim(); if(!txt) return;
    const ex=exams.find(e=>e.id===eid); if(!ex.todos) ex.todos=[];
    ex.todos.push({id:Date.now().toString(),text:txt,isCompleted:false}); saveExams(); render();
    setTimeout(()=>switchCardTab(eid,'todo'),0);
};
window.toggleTodo = (eid,tid) => {
    const ex=exams.find(e=>e.id===eid), t=ex.todos.find(x=>x.id===tid);
    if(t){ t.isCompleted=!t.isCompleted; saveExams(); render(); setTimeout(()=>switchCardTab(eid,'todo'),0); }
};
window.deleteTodo = (eid,tid) => {
    const ex=exams.find(e=>e.id===eid); ex.todos=ex.todos.filter(x=>x.id!==tid);
    saveExams(); render(); setTimeout(()=>switchCardTab(eid,'todo'),0);
};

window.toggleTimer = (eid) => {
    const ex=exams.find(e=>e.id===eid); if(!ex.studyTime) ex.studyTime=0;
    if(activeTimers[eid]){ clearInterval(activeTimers[eid].interval); delete activeTimers[eid]; saveExams(); render(); setTimeout(()=>switchCardTab(eid,'study'),0); }
    else { activeTimers[eid]={startTime:Date.now(),initialTime:ex.studyTime,interval:setInterval(()=>{
        ex.studyTime=activeTimers[eid].initialTime+Math.floor((Date.now()-activeTimers[eid].startTime)/1000);
        const el=document.getElementById(`st-${eid}`); if(el) el.textContent=formatStudyTime(ex.studyTime);
    },1000)}; const btn=document.getElementById(`bt-${eid}`); if(btn){btn.innerHTML='<i class="fas fa-pause"></i> ストップ';btn.classList.add('timer-active');} }
};

window.saveProgress = (eid) => {
    const ex=exams.find(e=>e.id===eid); if(!ex.progress) ex.progress={};
    ex.progress.pagesDone=parseInt(document.getElementById(`pg-done-${eid}`).value)||0;
    ex.progress.pagesTotal=parseInt(document.getElementById(`pg-total-${eid}`).value)||0;
    ex.progress.questionsDone=parseInt(document.getElementById(`q-done-${eid}`).value)||0;
    ex.progress.questionsTotal=parseInt(document.getElementById(`q-total-${eid}`).value)||0;
    saveExams(); render(); setTimeout(()=>switchCardTab(eid,'study'),0);
};

window.addEventListener('beforeunload',()=>{
    Object.keys(activeTimers).forEach(eid=>{const ex=exams.find(e=>e.id===eid);if(ex){ex.studyTime=activeTimers[eid].initialTime+Math.floor((Date.now()-activeTimers[eid].startTime)/1000);}});
    if(Object.keys(activeTimers).length>0) saveExams();
});
