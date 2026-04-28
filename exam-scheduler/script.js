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
    function createDateRow(dv='',tv='',as='',ae='',st='planning',first=false){
        const w=document.createElement('div'); w.className='date-row-wrapper';
        w.innerHTML=`${!first?'<button type="button" class="btn-remove-date" title="削除"><i class="fas fa-times"></i></button>':''}
        <div class="form-row" style="margin-bottom:0.5rem">
            <div class="form-group"><label>申込開始日</label><input type="text" class="as-inp custom-date-picker" placeholder="未設定" value="${as}"></div>
            <div class="form-group"><label>申込終了日</label><input type="text" class="ae-inp custom-date-picker" placeholder="未設定" value="${ae}"></div>
        </div>
        <input type="hidden" class="es-inp" value="${st}">
        <div class="form-row">
            <div class="form-group"><label>受験日 <span class="required">*</span></label><input type="text" class="ed-inp custom-date-picker" required placeholder="日付を選択" value="${dv}"></div>
            <div class="form-group"><label>受験時間</label><input type="text" class="et-inp custom-time-picker" placeholder="未設定" value="${tv}"></div>
        </div>`;
        if(!first) w.querySelector('.btn-remove-date').onclick=()=>w.remove();
        dc.appendChild(w);
        
        // Flatpickr Initialize
        const fpOptions = { locale: "ja", dateFormat: "Y-m-d", disableMobile: true, position: "above left" };
        flatpickr(w.querySelectorAll('.custom-date-picker'), fpOptions);
        
        const timeOptions = { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, disableMobile: true, position: "above left" };
        flatpickr(w.querySelectorAll('.custom-time-picker'), timeOptions);
    }
    $('btn-add-date-row').onclick=()=>createDateRow();

    // === Modal ===
    function openModal(id=null, dateIdx=null){
        modal.classList.remove('hidden'); dc.innerHTML='';
        const exId = typeof id === 'string' ? id : null;
        const ex = exId ? exams.find(e=>e.id===exId) : null;
        
        $('edit-date-idx').value = dateIdx !== null ? dateIdx : '';
        $('btn-delete-date').style.display = (ex && dateIdx !== null && dateIdx !== 'new') ? 'block' : 'none';
        $('btn-add-date-row').style.display = (!ex) ? 'block' : 'none';

        if(ex){
            $('exam-id').value=ex.id;
            $('exam-name').value=ex.name;
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime,status:ex.status}]:[]);
            
            if (dateIdx === 'new') {
                $('modal-title').textContent='別の日程を追加';
                createDateRow('','','','','planning',true);
            } else if (dateIdx !== null && ds[dateIdx]) {
                $('modal-title').textContent='日程を編集';
                const d = ds[dateIdx];
                createDateRow(d.date, d.time||'', d.applyStart!==undefined?d.applyStart:ex.applyStart||'', d.applyEnd!==undefined?d.applyEnd:ex.applyEnd||'', d.status||ex.status||'planning', true);
            } else {
                $('modal-title').textContent='日程を追加・編集';
                if(ds.length>0) ds.forEach((d,i)=>createDateRow(d.date,d.time||'',d.applyStart!==undefined?d.applyStart:ex.applyStart||'',d.applyEnd!==undefined?d.applyEnd:ex.applyEnd||'',d.status||ex.status||'planning',i===0));
                else createDateRow('','','','','planning',true);
            }
        } else {
            $('modal-title').textContent='資格試験を追加'; examForm.reset(); $('exam-id').value='';
            createDateRow('','','','','planning',true);
        }
        renderRecentExams();
    }
    window.openModal = openModal;
    window.editExam = openModal;
    window.addDateToExam = (eid) => { openModal(eid, 'new'); };
    
    function renderRecentExams() {
        const container = $('recent-exams-container');
        if (!container) return;
        container.innerHTML = '';
        const names = [...new Set(exams.map(e => e.name))].filter(n => n).slice(0, 5);
        if (names.length === 0) return;
        
        const label = document.createElement('span');
        label.style.fontSize = '0.75rem';
        label.style.color = 'var(--text-secondary)';
        label.style.marginRight = '0.2rem';
        label.style.fontWeight = '700';
        label.textContent = '最近の項目:';
        container.appendChild(label);

        names.forEach(name => {
            const pill = document.createElement('span');
            pill.className = 'recent-exam-pill';
            pill.textContent = name;
            pill.onclick = () => { $('exam-name').value = name; };
            container.appendChild(pill);
        });
    }
    function closeModal(){ modal.classList.add('hidden'); }
    $('btn-add-exam').onclick=()=>openModal();
    $('btn-close-modal').onclick=closeModal;
    $('btn-cancel').onclick=closeModal;
    $('btn-delete-date').onclick=()=>{
        const id=$('exam-id').value;
        const dateIdxStr=$('edit-date-idx').value;
        if(id && dateIdxStr!=='' && dateIdxStr!=='new'){
            const old=exams.find(e=>e.id===id);
            if(old && old.examDates){
                old.examDates.splice(parseInt(dateIdxStr), 1);
                saveExams(); closeModal(); render();
            }
        }
    };
    modal.onclick=e=>{if(e.target===modal)closeModal();};

    // === Settings ===
    $('btn-settings').onclick=()=>settingsModal.classList.remove('hidden');
    $('btn-close-settings').onclick=()=>settingsModal.classList.add('hidden');
    settingsModal.onclick=e=>{if(e.target===settingsModal)settingsModal.classList.add('hidden');};


    // === Form Submit ===
    examForm.onsubmit=e=>{
        e.preventDefault();
        const id=$('exam-id').value||Date.now().toString();
        const dateIdxStr = $('edit-date-idx').value;
        
        const newFormDates=[]; dc.querySelectorAll('.date-row-wrapper').forEach(w=>{
            const dv=w.querySelector('.ed-inp').value;
            if(dv) newFormDates.push({date:dv,time:w.querySelector('.et-inp').value,applyStart:w.querySelector('.as-inp').value,applyEnd:w.querySelector('.ae-inp').value,status:w.querySelector('.es-inp').value});
        });
        
        const old=exams.find(o=>o.id===id);
        let finalDates = [];
        if (old) {
            finalDates = old.examDates || [];
            if (dateIdxStr === 'new') {
                finalDates.push(...newFormDates);
            } else if (dateIdxStr !== '') {
                const idx = parseInt(dateIdxStr);
                if(newFormDates.length > 0) finalDates[idx] = newFormDates[0];
            } else {
                finalDates = newFormDates;
            }
        } else {
            finalDates = newFormDates;
        }

        const ex={id,name:$('exam-name').value,examDates:finalDates};
        
        // Preserve or migrate memos
        if(old){
            ex.memos=old.memos||[];
        } else ex.memos=[];

        const idx=exams.findIndex(o=>o.id===id);
        if(idx>=0) exams[idx]=ex; else exams.push(ex);
        saveExams(); closeModal(); render();
    };

    // === Memo & Status Functions ===
    window.cycleStatus = (eid, dateIdx) => {
        const ex = exams.find(e=>e.id===eid);
        if(!ex || !ex.examDates || !ex.examDates[dateIdx]) return;
        const d = ex.examDates[dateIdx];
        const statuses = ['planning', 'applying', 'applied', 'studying', 'finished'];
        const currentIdx = statuses.indexOf(d.status || ex.status || 'planning');
        const nextIdx = (currentIdx + 1) % statuses.length;
        d.status = statuses[nextIdx];
        saveExams(); render();
    };

    window.addMemo = (id) => {
        const text = $('memo-inp-'+id).value.trim();
        if(!text) return;
        const target = $('memo-tgt-'+id).value;
        const ex = exams.find(e=>e.id===id);
        if(ex){
            if(!ex.memos) ex.memos=[];
            ex.memos.push({id:Date.now().toString(), text, targetDate:target});
            saveExams(); render(); setTimeout(()=>switchCardTab(id, 'memo'), 0);
        }
    };
    window.deleteMemo = (id, mid) => {
        const ex = exams.find(e=>e.id===id);
        if(ex && ex.memos){
            ex.memos = ex.memos.filter(m=>m.id!==mid);
            saveExams(); render(); setTimeout(()=>switchCardTab(id, 'memo'), 0);
        }
    };

    window.deleteExam = (id) => {
        exams = exams.filter(e => e.id !== id);
        saveExams(); render();
    };

    // === Year Nav ===
    $('prev-year').onclick=()=>{currentFiscalYear--;render();};
    $('next-year').onclick=()=>{currentFiscalYear++;render();};

    // === Render ===
    function autoUpdateStatus() {
        let changed = false;
        const today = new Date(); today.setHours(0,0,0,0);
        exams.forEach(ex => {
            const ds = ex.examDates || [];
            ds.forEach(d => {
                if(d.date){
                    const dt = new Date(d.date);
                    if(dt < today && d.status !== 'finished'){
                        d.status = 'finished';
                        changed = true;
                    }
                }
            });
        });
        if(changed) saveExams();
    }
    window.autoUpdateStatus = autoUpdateStatus;
    
    function render(){ autoUpdateStatus(); updateFYLabel(); renderMiniCal(); renderList(); }
    window.render = render;
    function updateFYLabel(){ fyLabel.textContent=`${currentFiscalYear}年度 (${currentFiscalYear.toString().slice(-2)}年4月 - ${(currentFiscalYear+1).toString().slice(-2)}年3月)`; }

    function renderList(){
        listEl.innerHTML='';
        const sorted=[...exams].sort((a,b)=>{
            const ge=ex=>{const ds=ex.examDates||(ex.examDate?[{date:ex.examDate}]:[]); return ds.length?Math.min(...ds.map(d=>new Date(d.date).getTime())):Infinity;};
            return ge(a)-ge(b);
        });
        if(!sorted.length){ listEl.innerHTML=`<div class="empty-state"><i class="fas fa-folder-open"></i><p>登録された試験がありません。<br>「新規追加」から登録してください。</p></div>`; return; }

        sorted.forEach(ex=>{
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime,status:ex.status}]:[]);
            const dHtml=ds.length?ds.map((d, i)=>{
                const st=getStatusInfo(d.status||ex.status||'planning');
                const as=d.applyStart!==undefined?d.applyStart:ex.applyStart, ae=d.applyEnd!==undefined?d.applyEnd:ex.applyEnd;
                let ap=''; if(as||ae) ap=`<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.4rem"><i class="fas fa-edit" style="width:12px;margin-right:4px"></i>申込: ${as?formatDate(as):''} 〜 ${ae?formatDate(ae):''}</div>`;
                return `<div style="margin-bottom:1rem; padding-bottom:0.8rem; border-bottom:1px solid var(--border-light)">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong class="clickable-date" style="color:var(--text-primary)" onclick="editExam('${ex.id}', ${i})" title="クリックして編集">${formatDate(d.date)} ${d.time?`(${d.time})`:''}</strong>
                        <span class="exam-status-badge ${st.class} clickable-status" onclick="cycleStatus('${ex.id}', ${i})" title="クリックでステータスを変更">${st.label}</span>
                    </div>
                    ${ap}
                </div>`;
            }).join(''):`<div class="clickable-date" style="color:var(--text-secondary);font-size:0.85rem" onclick="editExam('${ex.id}', 0)" title="クリックして編集">未定</div>`;
            
            const memos=ex.memos||[];
            const targetOptions = `<option value="all">全体</option>` + ds.filter(d=>d.date).map(d=>`<option value="${d.date}">${formatDate(d.date)}の試験</option>`).join('');

            const card=document.createElement('div'); card.className='exam-card'; card.id=`card-${ex.id}`;
            card.innerHTML=`
            <div class="exam-card-header"><h3 class="exam-card-title" style="margin-bottom:0">${ex.name}</h3></div>
            <div class="card-tabs">
                <button class="card-tab active" id="tb-${ex.id}-details" onclick="switchCardTab('${ex.id}','details')">詳細</button>
                <button class="card-tab" id="tb-${ex.id}-memo" onclick="switchCardTab('${ex.id}','memo')">メモ (${memos.length})</button>
            </div>
            <div class="card-tab-content" id="tc-${ex.id}-details">
                <div class="exam-details">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom:0.8rem; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="far fa-calendar-check"></i> 日程とステータス</span>
                        <button class="btn-action" style="width:24px; height:24px; font-size:0.7rem;" onclick="addDateToExam('${ex.id}')" title="新しい日程を追加"><i class="fas fa-plus"></i></button>
                    </div>
                    ${dHtml}
                </div>
            </div>
            <div class="card-tab-content hidden" id="tc-${ex.id}-memo">
                <ul class="memo-list">${memos.map(m=>`<li class="memo-item">
                    <button class="memo-delete" onclick="deleteMemo('${ex.id}','${m.id}')" title="削除"><i class="fas fa-times"></i></button>
                    <div class="memo-header"><span class="memo-badge">${m.targetDate==='all'?'全体':formatDate(m.targetDate)+'の試験'}</span></div>
                    <div class="memo-text">${m.text}</div>
                </li>`).join('')}</ul>
                <div class="memo-input-group">
                    <textarea id="memo-inp-${ex.id}" placeholder="メモを追加... (例: 受験票を忘れない)"></textarea>
                    <div class="memo-controls">
                        <select id="memo-tgt-${ex.id}">${targetOptions}</select>
                        <button onclick="addMemo('${ex.id}')">追加</button>
                    </div>
                </div>
            </div>
            <div class="exam-card-actions"><div class="action-buttons" style="margin-left:auto"><button class="btn-action btn-delete" onclick="deleteExam('${ex.id}')" title="削除"><i class="fas fa-trash"></i></button></div></div>`;
            listEl.appendChild(card);
        });
    }

    function renderMiniCal(){
        if(!miniCalEl) return; miniCalEl.innerHTML='';
        const dw=['日','月','火','水','木','金','土'];
        const palette = [
            { bg: '#818CF8', shadow: 'rgba(129,140,248,0.4)', light: 'rgba(129,140,248,0.18)', text: '#818CF8' },
            { bg: '#FB923C', shadow: 'rgba(251,146,60,0.4)',  light: 'rgba(251,146,60,0.18)',  text: '#FB923C' },
            { bg: '#34D399', shadow: 'rgba(52,211,153,0.4)',  light: 'rgba(52,211,153,0.18)',  text: '#34D399' },
            { bg: '#F472B6', shadow: 'rgba(244,114,182,0.4)', light: 'rgba(244,114,182,0.18)', text: '#F472B6' },
            { bg: '#60A5FA', shadow: 'rgba(96,165,250,0.4)',  light: 'rgba(96,165,250,0.18)',  text: '#60A5FA' },
            { bg: '#FBBF24', shadow: 'rgba(251,191,36,0.4)',  light: 'rgba(251,191,36,0.18)',  text: '#FBBF24' },
            { bg: '#A78BFA', shadow: 'rgba(167,139,250,0.4)', light: 'rgba(167,139,250,0.18)', text: '#A78BFA' },
            { bg: '#2DD4BF', shadow: 'rgba(45,212,191,0.4)',  light: 'rgba(45,212,191,0.18)',  text: '#2DD4BF' },
        ];
        const setColorMap = new Map();
        let colorIdx = 0;
        exams.forEach(ex => {
            const ds = ex.examDates || (ex.examDate ? [{date:ex.examDate,time:ex.examTime,status:ex.status}] : []);
            ds.forEach((ed, i) => {
                setColorMap.set(ex.id + '-' + i, colorIdx % palette.length);
                colorIdx++;
            });
        });
        [4,5,6,7,8,9,10,11,12,1,2,3].forEach((m,mIdx)=>{
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
                let evs=[], fid=null, cellStyles=[];
                exams.forEach(ex=>{
                    const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime,status:ex.status}]:[]);
                    const added=new Set();
                    ds.forEach((ed, edIdx)=>{
                        let st = ed.status || ex.status || 'planning';
                        const ci = setColorMap.get(ex.id + '-' + edIdx);
                        const color = palette[ci];
                        const isApplied = (st==='applied'||st==='studying'||st==='finished');
                        if(ed.date){
                            const dt=new Date(ed.date);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                if(!fid)fid=ex.id;
                                const df=Math.ceil((dt-today)/864e5);
                                const tStr = ed.time ? ` (${ed.time})` : '';
                                evs.push({type:'exam',name:ex.name+tStr,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color});
                                cellStyles.push({color,isFinished:st==='finished',priority:3});
                            }
                        }
                        const as=ed.applyStart!==undefined?ed.applyStart:ex.applyStart;
                        if(as){
                            const dt=new Date(as);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                const k=as+ex.name+'-start-'+edIdx;
                                if(!added.has(k)){
                                    added.add(k);if(!fid)fid=ex.id;
                                    const df=Math.ceil((dt-today)/864e5);
                                    evs.push({type:'apply',name:'申込開始: '+ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color});
                                    cellStyles.push({color,isFinished:true,priority:1});
                                }
                            }
                        }
                        const ae=ed.applyEnd!==undefined?ed.applyEnd:ex.applyEnd;
                        if(ae){
                            const dt=new Date(ae);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                const k=ae+ex.name+'-end-'+edIdx;
                                if(!added.has(k)){
                                    added.add(k);if(!fid)fid=ex.id;
                                    const df=Math.ceil((dt-today)/864e5);
                                    evs.push({type:'apply-end',name:'申込締切: '+ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color});
                                    cellStyles.push({color,isFinished:true,priority:2});
                                }
                            }
                        }
                    });
                });
                let inlineStyle='';
                if(cellStyles.length>0){
                    cellStyles.sort((a,b)=>b.priority-a.priority);
                    const top=cellStyles[0];
                    if(top.isFinished){
                        inlineStyle=`background:${top.color.light};color:${top.color.text};border:2px dashed ${top.color.bg};font-weight:800;`;
                    } else {
                        inlineStyle=`background:${top.color.bg};color:white;box-shadow:0 2px 8px ${top.color.shadow};`;
                    }
                }
                let tip='', tipContent='';
                if(today.getFullYear()===yr&&today.getMonth()+1===m&&today.getDate()===d){
                    tipContent+=`<div class="tooltip-event" style="margin-bottom:4px;"><i class="fas fa-star" style="color:var(--primary-color);margin-right:6px;"></i><span class="tooltip-name" style="font-weight:800;">本日 ${m}月${d}日</span></div>`;
                }
                if(hName) tipContent+=`<div class="tooltip-holiday"><i class="fas fa-flag"></i> ${hName}</div>`;
                if(evs.length){
                    evs.forEach(ev=>{
                        const dotStyle=`background:${ev.color.bg};box-shadow:0 0 8px ${ev.color.bg};`;
                        tipContent+=`<div class="tooltip-event"><span class="tooltip-dot" style="${dotStyle}"></span><span class="tooltip-name">${ev.name}</span><span class="tooltip-days">${ev.diffStr}</span></div>`;
                        const ex=exams.find(e=>e.id===ev.exId);
                        if(ex&&ex.memos){
                            ex.memos.forEach(memo=>{
                                if(memo.targetDate==='all'||memo.targetDate===ev.edDate){
                                    tipContent+=`<div class="tooltip-memo"><i class="fas fa-sticky-note"></i> <span>${memo.text}</span></div>`;
                                }
                            });
                        }
                    });
                }
                if(tipContent) tip=`<div class="modern-tooltip">${tipContent}</div>`;
                if(today.getFullYear()===yr&&today.getMonth()+1===m&&today.getDate()===d) cls.push('is-today');
                let oc=''; if(fid){cls.push('clickable');oc=`onclick="scrollToExam('${fid}')"`;}
                if(mIdx<4) cls.push('tooltip-below');
                grid+=`<div class="${cls.join(' ')}" style="${inlineStyle}" ${oc}>${d}${tip}</div>`;
            }
            mm.innerHTML=`<div class="mini-month-name">${m}月</div><div class="mini-days-header">${hdr}</div><div class="mini-days-grid">${grid}</div>`;
            miniCalEl.appendChild(mm);
        });
    }

    render();
});
