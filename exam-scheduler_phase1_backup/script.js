document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const modal=$('exam-modal'), examForm=$('exam-form'), dc=$('exam-dates-container');
    const settingsModal=$('settings-modal'), miniCalEl=$('mini-calendar');
    const listEl=$('exam-list');
    const fyLabel=$('current-fiscal-year');
    const headerEl=document.querySelector('.header');

    // === Scroll Header Logic ===
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100 && window.scrollY > lastScrollY) {
            headerEl.classList.add('header-hidden');
        } else {
            headerEl.classList.remove('header-hidden');
        }
        lastScrollY = window.scrollY;
    }, { passive: true });

    // === Date Row ===
    function createDateRow(dv='',tv='',as='',ae='',first=false){
        const w=document.createElement('div'); w.className='date-row-wrapper';
        w.innerHTML=`${!first?'<button type="button" class="btn-remove-date" title="削除"><i class="fas fa-times"></i></button>':''}
        <div class="form-row" style="margin-bottom:0.5rem"><div class="form-group"><label>申込開始日</label><input type="date" class="as-inp" value="${as}"></div><div class="form-group"><label>申込終了日</label><input type="date" class="ae-inp" value="${ae}"></div></div>
        <div class="form-row"><div class="form-group"><label>受験日 <span class="required">*</span></label><input type="date" class="ed-inp" required value="${dv}"></div><div class="form-group"><label>受験時間</label><input type="time" class="et-inp" value="${tv}"></div></div>`;
        if(!first) w.querySelector('.btn-remove-date').onclick=()=>w.remove();
        dc.appendChild(w);
    }
    $('btn-add-date-row').onclick=()=>createDateRow();

    // === Modal ===
    function openModal(ex=null,defDate=null){
        modal.classList.remove('hidden'); dc.innerHTML='';
        if(ex){
            $('modal-title').textContent='資格試験を編集'; $('exam-id').value=ex.id;
            $('exam-name').value=ex.name; $('exam-link').value=ex.link||''; $('exam-status').value=ex.status||'planning';
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime}]:[]);
            if(ds.length>0) ds.forEach((d,i)=>createDateRow(d.date,d.time||'',d.applyStart!==undefined?d.applyStart:(ex.applyStart||''),d.applyEnd!==undefined?d.applyEnd:(ex.applyEnd||''),i===0));
            else createDateRow('','',ex.applyStart||'',ex.applyEnd||'',true);
        } else {
            $('modal-title').textContent='資格試験を追加'; examForm.reset(); $('exam-id').value='';
            createDateRow(defDate||'','',defDate||'','',true);
        }
    }
    window.openModal = openModal;
    function closeModal(){ modal.classList.add('hidden'); }
    $('btn-add-exam').onclick=()=>openModal();
    $('btn-close-modal').onclick=closeModal;
    $('btn-cancel').onclick=closeModal;
    modal.onclick=e=>{if(e.target===modal)closeModal();};

    // === Settings ===
    $('btn-settings').onclick=()=>settingsModal.classList.remove('hidden');
    $('btn-close-settings').onclick=()=>settingsModal.classList.add('hidden');
    settingsModal.onclick=e=>{if(e.target===settingsModal)settingsModal.classList.add('hidden');};
    $('btn-export-data').onclick=()=>{
        const a=document.createElement('a');
        a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(exams));
        a.download=`exam_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
    };
    $('file-import-data').onchange=e=>{
        const f=e.target.files[0]; if(!f) return;
        const r=new FileReader();
        r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(Array.isArray(d)){exams=d;saveExams();render();alert('データを復元しました！');settingsModal.classList.add('hidden');}}catch(err){alert('読み込みに失敗しました。');}};
        r.readAsText(f); e.target.value='';
    };

    // === Archive ===
    const archBtn=$('btn-archive');
    archBtn.onclick=()=>{
        showingArchive=!showingArchive;
        archBtn.className=showingArchive?'btn btn-primary':'btn btn-secondary';
        archBtn.innerHTML=showingArchive?'<i class="fas fa-arrow-left"></i> <span class="action-text">戻る</span>':'<i class="fas fa-history"></i> <span class="action-text">履歴</span><div class="btn-tooltip">ステータスが「受験完了」の試験を<br>一覧で確認できます。</div>';
        renderList();
    };

    // === Form Submit ===
    examForm.onsubmit=e=>{
        e.preventDefault();
        const eds=[]; dc.querySelectorAll('.date-row-wrapper').forEach(w=>{
            const dv=w.querySelector('.ed-inp').value;
            if(dv) eds.push({date:dv,time:w.querySelector('.et-inp').value,applyStart:w.querySelector('.as-inp').value,applyEnd:w.querySelector('.ae-inp').value});
        });
        const id=$('exam-id').value||Date.now().toString();
        const ex={id,name:$('exam-name').value,examDates:eds,link:$('exam-link').value,status:$('exam-status').value};
        // Preserve existing todos, studyTime, progress
        const old=exams.find(o=>o.id===id);
        if(old){ex.todos=old.todos;ex.studyTime=old.studyTime;ex.progress=old.progress;}
        const idx=exams.findIndex(o=>o.id===id);
        if(idx>=0) exams[idx]=ex; else exams.push(ex);
        saveExams(); closeModal(); render();
    };

    // === Year Nav ===
    $('prev-year').onclick=()=>{currentFiscalYear--;render();};
    $('next-year').onclick=()=>{currentFiscalYear++;render();};

    // === Render ===
    function render(){ updateFYLabel(); renderMiniCal(); renderList(); }
    function updateFYLabel(){ fyLabel.textContent=`${currentFiscalYear}年度 (${currentFiscalYear.toString().slice(-2)}年4月 - ${(currentFiscalYear+1).toString().slice(-2)}年3月)`; }

    function renderList(){
        listEl.innerHTML='';
        const filtered=exams.filter(e=>showingArchive?e.status==='finished':e.status!=='finished');
        const sorted=[...filtered].sort((a,b)=>{
            const ge=ex=>{const ds=ex.examDates||(ex.examDate?[{date:ex.examDate}]:[]); return ds.length?Math.min(...ds.map(d=>new Date(d.date).getTime())):Infinity;};
            return ge(a)-ge(b);
        });
        if(!sorted.length){ listEl.innerHTML=`<div class="empty-state"><i class="fas fa-folder-open"></i><p>${showingArchive?'過去の受験履歴はありません。':'登録された試験がありません。<br>「新規追加」から登録してください。'}</p></div>`; return; }

        sorted.forEach(ex=>{
            const st=getStatusInfo(ex.status);
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime}]:[]);
            const dHtml=ds.length?ds.map(d=>{
                const as=d.applyStart!==undefined?d.applyStart:ex.applyStart, ae=d.applyEnd!==undefined?d.applyEnd:ex.applyEnd;
                let ap=''; if(as||ae) ap=`<br><span style="font-size:0.75rem;color:var(--text-secondary);margin-left:1rem"><i class="fas fa-edit" style="width:12px;margin-right:4px"></i>申込: ${as?formatDate(as):''} 〜 ${ae?formatDate(ae):''}</span>`;
                return `<div style="margin-bottom:0.5rem"><strong>${formatDate(d.date)}</strong> ${d.time?`(${d.time})`:''}${ap}</div>`;
            }).join(''):'未定';
            const todos=ex.todos||[], cc=todos.filter(t=>t.isCompleted).length;
            const p=ex.progress||{}, pPct=p.pagesTotal?Math.min(100,Math.round(p.pagesDone/p.pagesTotal*100)):0, qPct=p.questionsTotal?Math.min(100,Math.round(p.questionsDone/p.questionsTotal*100)):0;

            const card=document.createElement('div'); card.className='exam-card'; card.id=`card-${ex.id}`;
            card.innerHTML=`
            <div class="exam-card-header"><h3 class="exam-card-title">${ex.name}</h3><span class="exam-status-badge ${st.class}">${st.label}</span></div>
            <div class="card-tabs">
                <button class="card-tab active" id="tb-${ex.id}-details" onclick="switchCardTab('${ex.id}','details')">詳細</button>
                <button class="card-tab" id="tb-${ex.id}-todo" onclick="switchCardTab('${ex.id}','todo')">TODO (${cc}/${todos.length})</button>
                <button class="card-tab" id="tb-${ex.id}-study" onclick="switchCardTab('${ex.id}','study')">学習</button>
            </div>
            <div class="card-tab-content" id="tc-${ex.id}-details">
                <div class="exam-details">
                    <div class="detail-row" style="align-items:flex-start"><i class="far fa-calendar-check" style="margin-top:0.25rem"></i><div style="flex:1"><strong>日程:</strong><br>${dHtml}</div></div>
                    ${ex.link?`<div class="detail-row"><i class="fas fa-external-link-alt"></i><span><a href="${ex.link}" target="_blank" class="exam-link-btn">公式サイトを開く</a></span></div>`:''}
                </div>
            </div>
            <div class="card-tab-content hidden" id="tc-${ex.id}-todo">
                <ul class="todo-list">${todos.map(t=>`<li class="todo-item"><input type="checkbox" class="todo-checkbox" ${t.isCompleted?'checked':''} onchange="toggleTodo('${ex.id}','${t.id}')"><span class="todo-text ${t.isCompleted?'completed':''}">${t.text}</span><button class="todo-delete" onclick="deleteTodo('${ex.id}','${t.id}')"><i class="fas fa-times"></i></button></li>`).join('')}</ul>
                <div class="todo-input-group"><input type="text" id="todo-inp-${ex.id}" placeholder="タスクを追加 (Enterで追加)" onkeypress="if(event.key==='Enter')addTodo('${ex.id}')"><button onclick="addTodo('${ex.id}')">追加</button></div>
            </div>
            <div class="card-tab-content hidden" id="tc-${ex.id}-study">
                <div class="study-tracker">
                    <div class="study-stats">
                        <div class="study-stat-card"><div class="study-stat-value" id="st-${ex.id}">${formatStudyTime(ex.studyTime||0)}</div><div class="study-stat-label">学習時間</div></div>
                        <div class="study-stat-card"><button class="btn-timer ${activeTimers[ex.id]?'timer-active':''}" id="bt-${ex.id}" onclick="toggleTimer('${ex.id}')">${activeTimers[ex.id]?'<i class="fas fa-pause"></i> ストップ':'<i class="fas fa-play"></i> スタート'}</button></div>
                    </div>
                    <div class="progress-row"><label>ページ</label><input type="number" id="pg-done-${ex.id}" value="${p.pagesDone||0}" min="0" style="width:70px"> / <input type="number" id="pg-total-${ex.id}" value="${p.pagesTotal||0}" min="0" style="width:70px"> <span style="font-size:0.8rem;color:var(--text-secondary)">ページ</span></div>
                    <div class="progress-row"><label>問題数</label><input type="number" id="q-done-${ex.id}" value="${p.questionsDone||0}" min="0" style="width:70px"> / <input type="number" id="q-total-${ex.id}" value="${p.questionsTotal||0}" min="0" style="width:70px"> <span style="font-size:0.8rem;color:var(--text-secondary)">問</span></div>
                    <button class="btn btn-primary" style="width:100%;margin-top:0.5rem" onclick="saveProgress('${ex.id}')"><i class="fas fa-save"></i> 進捗を保存</button>
                    <div class="progress-chart">
                        <div class="progress-bar-group"><div class="progress-bar-label"><span>📖 ページ進捗</span><span>${pPct}%</span></div><div class="progress-bar-track"><div class="progress-bar-fill bar-pages" style="width:${pPct}%"></div></div></div>
                        <div class="progress-bar-group"><div class="progress-bar-label"><span>✏️ 問題進捗</span><span>${qPct}%</span></div><div class="progress-bar-track"><div class="progress-bar-fill bar-questions" style="width:${qPct}%"></div></div></div>
                    </div>
                </div>
            </div>
            <div class="exam-card-actions"><div class="action-buttons" style="margin-left:auto"><button class="btn-action" onclick="editExam('${ex.id}')" title="編集"><i class="fas fa-pen"></i></button><button class="btn-action btn-delete" onclick="deleteExam('${ex.id}')" title="削除"><i class="fas fa-trash"></i></button></div></div>`;
            listEl.appendChild(card);
        });
    }

    function renderMiniCal(){
        if(!miniCalEl) return; miniCalEl.innerHTML='';
        const dw=['日','月','火','水','木','金','土'];
        [4,5,6,7,8,9,10,11,12,1,2,3].forEach(m=>{
            const yr=m>=4?currentFiscalYear:currentFiscalYear+1;
            const mm=document.createElement('div'); mm.className='mini-month';
            const hdr=dw.map((d,i)=>`<div class="${i===0?'day-sunday':i===6?'day-saturday':''}">${d}</div>`).join('');
            const fd=new Date(yr,m-1,1).getDay(), dim=new Date(yr,m,0).getDate();
            let grid='';
            for(let i=0;i<fd;i++) grid+='<div class="mini-day empty"></div>';
            const today=new Date(); today.setHours(0,0,0,0);
            for(let d=1;d<=dim;d++){
                let cls=['mini-day'], dow=new Date(yr,m-1,d).getDay();
                let hName = getHolidayName(yr, m, d);
                if(dow===0||hName) cls.push('day-sunday'); else if(dow===6) cls.push('day-saturday');
                let hasE=false,hasA=false,evs=[],fid=null;
                exams.forEach(ex=>{
                    const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime}]:[]);
                    const added=new Set();
                    ds.forEach(ed=>{
                        if(ed.date){const dt=new Date(ed.date);if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){hasE=true;if(!fid)fid=ex.id;const df=Math.ceil((dt-today)/864e5);evs.push({type:'exam',name:ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了'});}}
                        const as=ed.applyStart!==undefined?ed.applyStart:ex.applyStart;
                        if(as){const dt=new Date(as);if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){const k=as+ex.name;if(!added.has(k)){added.add(k);hasA=true;if(!fid)fid=ex.id;const df=Math.ceil((dt-today)/864e5);evs.push({type:'apply',name:'申込: '+ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了'});}}}
                    });
                });
                let tip='';
                let tipContent = '';
                if(hName) tipContent += `<div class="tooltip-holiday"><i class="fas fa-flag"></i> ${hName}</div>`;
                if(evs.length) tipContent += evs.map(ev=>`<div class="tooltip-event"><span class="tooltip-dot ${ev.type}"></span><span class="tooltip-name">${ev.name}</span><span class="tooltip-days">${ev.diffStr}</span></div>`).join('');
                if(tipContent) tip=`<div class="modern-tooltip">${tipContent}</div>`;
                
                if(today.getFullYear()===yr&&today.getMonth()+1===m&&today.getDate()===d) cls.push('is-today');
                if(hasE&&hasA) cls.push('has-both'); else if(hasE) cls.push('has-exam'); else if(hasA) cls.push('has-apply');
                let oc=''; if(fid){cls.push('clickable');oc=`onclick="scrollToExam('${fid}')"`;}
                grid+=`<div class="${cls.join(' ')}" ${oc}>${d}${tip}</div>`;
            }
            mm.innerHTML=`<div class="mini-month-name">${m}月</div><div class="mini-days-header">${hdr}</div><div class="mini-days-grid">${grid}</div>`;
            miniCalEl.appendChild(mm);
        });
    }

    render();
});
