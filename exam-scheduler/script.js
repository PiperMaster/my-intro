document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const modal=$('exam-modal'), examForm=$('exam-form'), dc=$('exam-dates-container');
    const settingsModal=$('settings-modal'), miniCalEl=$('mini-calendar');
    const listEl=$('exam-list');
    const resultsDashboard=$('results-dashboard');
    const scheduleView=$('schedule-view'), resultsView=$('results-view');
    const scheduleViewBtn=$('view-schedule-btn'), resultsViewBtn=$('view-results-btn');
    const fyLabel=$('current-fiscal-year');
    const nextExamPop=$('next-exam-pop');
    const headerEl=document.querySelector('.header');
    const MAIN_VIEW_KEY = 'examSchedulerActiveView';
    let activeView = localStorage.getItem(MAIN_VIEW_KEY) === 'results' ? 'results' : 'schedule';

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
    function lockPageScroll(){ document.body.classList.add('modal-open'); }
    function unlockPageScroll(){ document.body.classList.remove('modal-open'); }
    function normalizeStatus(status){
        return ['planning','applying','applied'].includes(status) ? status : 'planning';
    }
    function normalizeResultType(type){
        return ['passfail','score'].includes(type) ? type : 'passfail';
    }
    function getExamResultType(ex){
        return normalizeResultType(ex && ex.resultType);
    }
    function normalizeResult(result, type){
        type = normalizeResultType(type);
        if(type === 'passfail'){
            return result && ['pass','fail'].includes(result.outcome) ? {type, outcome:result.outcome} : {type, outcome:''};
        }
        if(type === 'score'){
            const score = result && result.score !== undefined && result.score !== '' ? Number(result.score) : '';
            const maxScore = result && result.maxScore !== undefined && result.maxScore !== '' ? Number(result.maxScore) : '';
            return {type, score:Number.isFinite(score) ? score : '', maxScore:Number.isFinite(maxScore) ? maxScore : ''};
        }
        return {type:'passfail', outcome:''};
    }
    function escapeAttr(value){
        return String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function updateResultInputs(){
        const type = normalizeResultType($('result-type').value);
        document.querySelectorAll('.result-type-option').forEach(btn=>{
            btn.classList.toggle('active', btn.dataset.resultType === type);
        });
    }

    function createDateRow(dv='',tv='',as='',ae='',st='planning',first=false){
        st = normalizeStatus(st);
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
        lockPageScroll();
        const exId = typeof id === 'string' ? id : null;
        const ex = exId ? exams.find(e=>e.id===exId) : null;
        
        $('edit-date-idx').value = dateIdx !== null ? dateIdx : '';
        $('btn-delete-date').style.display = (ex && dateIdx !== null && dateIdx !== 'new') ? 'block' : 'none';
        $('btn-add-date-row').style.display = (!ex) ? 'block' : 'none';

        if(ex){
            $('exam-id').value=ex.id;
            $('exam-name').value=ex.name;
            $('result-type').value=getExamResultType(ex);
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
            $('result-type').value='passfail';
            createDateRow('','','','','planning',true);
        }
        updateResultInputs();
        renderRecentExams();
        const smartInput = $('smart-schedule-input');
        if(smartInput){
            smartInput.value = '';
            smartInput.style.height = '';
        }
    }
    window.openModal = openModal;
    window.editExam = openModal;
    window.addDateToExam = (eid) => { openModal(eid, 'new'); };
    document.querySelectorAll('.result-type-option').forEach(btn=>{
        btn.onclick=()=>{
            $('result-type').value = btn.dataset.resultType;
            updateResultInputs();
        };
    });
    
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
    function closeModal(){ modal.classList.add('hidden'); unlockPageScroll(); }
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

    // === Smart Schedule Parser ===
    function toHalfWidth(str){
        return str.replace(/[０-９]/g, ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0))
            .replace(/[：]/g, ':');
    }

    function toDateValue(year, month, day){
        const y=String(year), m=String(month).padStart(2,'0'), d=String(day).padStart(2,'0');
        return `${y}-${m}-${d}`;
    }

    function parseDateValue(value){
        const [y,m,d]=value.split('-').map(Number);
        return new Date(y, m-1, d);
    }

    function inferDateValue(token, anchorDate=null){
        let year = token.year;
        if(!year){
            const today = new Date(); today.setHours(0,0,0,0);
            year = anchorDate ? anchorDate.getFullYear() : today.getFullYear();
            let candidate = new Date(year, token.month-1, token.day);
            if(anchorDate && candidate > anchorDate) candidate = new Date(year-1, token.month-1, token.day);
            if(!anchorDate && candidate < today) candidate = new Date(year+1, token.month-1, token.day);
            year = candidate.getFullYear();
        }
        return toDateValue(year, token.month, token.day);
    }

    function extractDateTokens(text){
        const tokens=[];
        const re=/(?:(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})日?|(\d{1,2})[月\/\-.](\d{1,2})日?)/g;
        let match;
        while((match=re.exec(text))){
            const hasYear=!!match[1];
            tokens.push({
                raw: match[0],
                index: match.index,
                end: match.index + match[0].length,
                year: hasYear ? Number(match[1]) : null,
                month: Number(hasYear ? match[2] : match[4]),
                day: Number(hasYear ? match[3] : match[5])
            });
        }
        return tokens;
    }

    function extractTimeValue(text){
        const match = text.match(/(\d{1,2})\s*(?::|時)\s*(\d{1,2})?\s*(?:分)?\s*(?:開始|から|スタート)?/);
        if(!match) return '';
        const hour = Number(match[1]);
        const minute = match[2] ? Number(match[2]) : 0;
        if(hour > 23 || minute > 59) return '';
        return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    }

    function getApplyRange(text){
        const start=text.search(/申込|申し込み|受付|出願/);
        if(start < 0) return null;
        const rest=text.slice(start);
        const endMatch=rest.search(/[。.\n]/);
        return {start, end:endMatch >= 0 ? start + endMatch : text.length};
    }

    function parseExamName(text, examToken){
        let source = examToken ? text.slice(0, examToken.index) : text.split(/[。.\n]/)[0];
        source = source.replace(/申込.*$/,'').replace(/受験.*$/,'').replace(/試験.*$/,'').trim();
        const woIndex = source.lastIndexOf('を');
        if(woIndex > 0) source = source.slice(0, woIndex);
        source = source.replace(/^(資格|試験|予定|今回は)\s*/,'').replace(/[、,\s]+$/,'').trim();
        if(source) return source;

        const fallback = text.match(/(?:^|[。.\n、,])\s*([^。.\n、,]+?)を(?:受験|受け|申し込|申込)/);
        return fallback ? fallback[1].trim() : '';
    }

    function parseSmartSchedule(text){
        const normalized = toHalfWidth(text).trim();
        if(!normalized) return {};
        const tokens = extractDateTokens(normalized);
        const applyRange = getApplyRange(normalized);
        const applyTokens = applyRange ? tokens.filter(t=>t.index>=applyRange.start && t.index<=applyRange.end) : [];
        const examTokens = tokens.filter(t=>!applyTokens.includes(t));
        const examToken = examTokens.find(t=>{
            const around = normalized.slice(Math.max(0,t.index-12), Math.min(normalized.length,t.end+12));
            return /受験|試験|受け|開催|実施|本番|当日/.test(around);
        }) || examTokens[0] || null;

        const result = {
            name: parseExamName(normalized, examToken),
            examDate: '',
            examTime: extractTimeValue(normalized),
            applyStart: '',
            applyEnd: ''
        };

        if(examToken){
            result.examDate = inferDateValue(examToken);
        }
        if(applyTokens.length >= 1){
            const examAnchor = result.examDate ? parseDateValue(result.examDate) : null;
            result.applyStart = inferDateValue(applyTokens[0], examAnchor);
            if(applyTokens[1]) result.applyEnd = inferDateValue(applyTokens[1], examAnchor);
        }
        return result;
    }

    function applySmartSchedule(){
        const parsed = parseSmartSchedule($('smart-schedule-input').value);
        let applied = 0;
        if(parsed.name){ $('exam-name').value = parsed.name; applied++; }
        const row = dc.querySelector('.date-row-wrapper');
        if(row){
            if(parsed.applyStart){ row.querySelector('.as-inp').value = parsed.applyStart; applied++; }
            if(parsed.applyEnd){ row.querySelector('.ae-inp').value = parsed.applyEnd; applied++; }
            if(parsed.examDate){ row.querySelector('.ed-inp').value = parsed.examDate; applied++; }
            if(parsed.examTime){ row.querySelector('.et-inp').value = parsed.examTime; applied++; }
        }
        if(!applied) alert('読み取れる日程が見つかりませんでした。例文に近い形式で入力してください。');
    }
    $('btn-parse-schedule').onclick=applySmartSchedule;
    const smartScheduleInput = $('smart-schedule-input');
    if(smartScheduleInput){
        const resizeSmartInput = () => {
            smartScheduleInput.style.height = 'auto';
            smartScheduleInput.style.height = `${smartScheduleInput.scrollHeight}px`;
        };
        smartScheduleInput.addEventListener('input', resizeSmartInput);
        resizeSmartInput();
    }

    // === Settings ===
    function openSettingsModal(){
        settingsModal.classList.remove('hidden');
        lockPageScroll();
    }
    function closeSettingsModal(){
        settingsModal.classList.add('hidden');
        unlockPageScroll();
    }
    $('btn-settings').onclick=openSettingsModal;
    $('btn-close-settings').onclick=closeSettingsModal;
    settingsModal.onclick=e=>{if(e.target===settingsModal)closeSettingsModal();};

    function switchMainView(view){
        activeView = view === 'results' ? 'results' : 'schedule';
        localStorage.setItem(MAIN_VIEW_KEY, activeView);
        scheduleView.classList.toggle('hidden', activeView !== 'schedule');
        resultsView.classList.toggle('hidden', activeView !== 'results');
        scheduleViewBtn.classList.toggle('active', activeView === 'schedule');
        resultsViewBtn.classList.toggle('active', activeView === 'results');
        scheduleViewBtn.setAttribute('aria-selected', activeView === 'schedule' ? 'true' : 'false');
        resultsViewBtn.setAttribute('aria-selected', activeView === 'results' ? 'true' : 'false');
        if(activeView === 'results') renderResultsDashboard();
    }
    scheduleViewBtn.onclick=()=>switchMainView('schedule');
    resultsViewBtn.onclick=()=>switchMainView('results');

    function saveInlineResult(eid, dateIdx, result){
        const ex = exams.find(e=>e.id===eid);
        if(!ex || !ex.examDates || !ex.examDates[dateIdx]) return;
        const type = getExamResultType(ex);
        ex.examDates[dateIdx].result = normalizeResult(result, type);
        saveExams();
        renderResultsDashboard();
    }
    window.saveResultOutcome = (eid, dateIdx, outcome) => {
        saveInlineResult(eid, dateIdx, {outcome});
    };
    window.saveResultScore = (eid, dateIdx) => {
        const card = document.querySelector(`[data-result-card="${eid}-${dateIdx}"]`);
        if(!card) return;
        const ex = exams.find(e=>e.id===eid);
        const current = ex && ex.examDates && ex.examDates[dateIdx] ? normalizeResult(ex.examDates[dateIdx].result, 'score') : {maxScore:''};
        const rawScore = card.querySelector('.result-score-input').value.trim().replace(',', '.');
        const score = rawScore === '' ? '' : (Number.isFinite(Number(rawScore)) ? rawScore : '');
        saveInlineResult(eid, dateIdx, {
            score,
            maxScore: current.maxScore
        });
    };


    // === Form Submit ===
    examForm.onsubmit=e=>{
        e.preventDefault();
        const id=$('exam-id').value||Date.now().toString();
        const dateIdxStr = $('edit-date-idx').value;
        const resultType = normalizeResultType($('result-type').value);
        
        const newFormDates=[]; dc.querySelectorAll('.date-row-wrapper').forEach(w=>{
            const dv=w.querySelector('.ed-inp').value;
            if(dv){
                const item = {date:dv,time:w.querySelector('.et-inp').value,applyStart:w.querySelector('.as-inp').value,applyEnd:w.querySelector('.ae-inp').value,status:normalizeStatus(w.querySelector('.es-inp').value)};
                newFormDates.push(item);
            }
        });
        
        const old=exams.find(o=>o.id===id);
        let finalDates = [];
        if (old) {
            finalDates = old.examDates || [];
            if (dateIdxStr === 'new') {
                finalDates.push(...newFormDates);
            } else if (dateIdxStr !== '') {
                const idx = parseInt(dateIdxStr);
                if(newFormDates.length > 0) finalDates[idx] = {...newFormDates[0], result:finalDates[idx] ? finalDates[idx].result : undefined};
            } else {
                finalDates = newFormDates.map((d,i)=>({...d, result:finalDates[i] ? finalDates[i].result : undefined}));
            }
        } else {
            finalDates = newFormDates;
        }

        const ex={id,name:$('exam-name').value,resultType,examDates:finalDates};
        
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
        const statuses = ['planning', 'applying', 'applied'];
        const currentIdx = statuses.indexOf(normalizeStatus(d.status || ex.status || 'planning'));
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
        return;
    }
    window.autoUpdateStatus = autoUpdateStatus;
    
    function render(){ autoUpdateStatus(); updateFYLabel(); renderNextExamPop(); renderMiniCal(); renderList(); renderResultsDashboard(); }
    window.render = render;
    function updateFYLabel(){ fyLabel.textContent=`${currentFiscalYear}年度 (${currentFiscalYear.toString().slice(-2)}年4月 - ${(currentFiscalYear+1).toString().slice(-2)}年3月)`; }

    function getResultRecords(){
        const records = [];
        exams.forEach(ex=>{
            const type = getExamResultType(ex);
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime,status:ex.status,result:ex.result}]:[]);
            ds.forEach((d,i)=>{
                const result = normalizeResult(d.result, type);
                records.push({ex, dateInfo:d, dateIdx:i, type, result});
            });
        });
        return records.sort((a,b)=>new Date(a.dateInfo.date||0)-new Date(b.dateInfo.date||0));
    }
    function getResultLabel(record){
        if(record.type === 'passfail'){
            if(record.result.outcome === 'pass') return '<span class="result-badge result-pass">合格</span>';
            if(record.result.outcome === 'fail') return '<span class="result-badge result-fail">不合格</span>';
            return '<span class="result-badge result-empty">未入力</span>';
        }
        if(record.type === 'score'){
            if(record.result.score === '') return '<span class="result-badge result-empty">未入力</span>';
            const max = record.result.maxScore !== '' ? ` / ${record.result.maxScore}` : '';
            return `<span class="result-score-text">${record.result.score}${max}点</span>`;
        }
        return '<span class="result-badge result-empty">未入力</span>';
    }
    function getResultControl(record){
        if(record.type === 'score'){
            const score = record.result.score !== '' ? record.result.score : '';
            return `<div class="result-inline-score">
                <input class="result-score-input" type="text" inputmode="decimal" value="${escapeAttr(score)}" placeholder="0" onchange="saveResultScore('${record.ex.id}', ${record.dateIdx})">
            </div>`;
        }
        return `<div class="result-passfail-switch">
            <button type="button" class="${record.result.outcome===''?'active':''}" onclick="saveResultOutcome('${record.ex.id}', ${record.dateIdx}, '')">未入力</button>
            <button type="button" class="${record.result.outcome==='pass'?'active is-pass':''}" onclick="saveResultOutcome('${record.ex.id}', ${record.dateIdx}, 'pass')">合格</button>
            <button type="button" class="${record.result.outcome==='fail'?'active is-fail':''}" onclick="saveResultOutcome('${record.ex.id}', ${record.dateIdx}, 'fail')">不合格</button>
        </div>`;
    }
    function buildScoreChart(scoreRecords, passFailRecords){
        const scorePoints = scoreRecords.filter(r=>r.result.score !== '');
        const passFailPoints = passFailRecords.filter(r=>['pass','fail'].includes(r.result.outcome));
        const points = [...scorePoints, ...passFailPoints]
            .sort((a,b)=>new Date(a.dateInfo.date||0)-new Date(b.dateInfo.date||0))
            .slice(-12);
        if(!points.length){
            return `<div class="result-chart-empty"><i class="fas fa-chart-line"></i><span>スコアまたは合否を入力すると推移グラフが表示されます。</span></div>`;
        }
        return '<div id="result-score-chart" class="score-chart score-chart-highcharts"></div>';
    }
    function renderScoreChart(scoreRecords, passFailRecords){
        const chartEl = $('result-score-chart');
        if(!chartEl) return;
        const scorePoints = scoreRecords.filter(r=>r.result.score !== '');
        const passFailPoints = passFailRecords.filter(r=>['pass','fail'].includes(r.result.outcome));
        const points = [...scorePoints, ...passFailPoints]
            .sort((a,b)=>new Date(a.dateInfo.date||0)-new Date(b.dateInfo.date||0))
            .slice(-12);
        if(!points.length) return;
        const formatChartDate = (dateStr) => {
            const d = new Date(dateStr);
            if(isNaN(d)) return '';
            return `${d.getMonth()+1}/${d.getDate()}`;
        };
        const formatResultDateTime = (dateInfo) => `${formatDate(dateInfo.date)}${dateInfo.time ? ` (${dateInfo.time})` : ''}`;
        if(!window.Highcharts){
            chartEl.innerHTML = '<div class="result-chart-empty"><i class="fas fa-chart-line"></i><span>グラフライブラリを読み込めませんでした。</span></div>';
            return;
        }
        const dateKeys = [...new Set(points.map(p=>p.dateInfo.date || ''))];
        const categories = dateKeys.map(formatChartDate);
        const dateIndex = new Map(dateKeys.map((date, index)=>[date, index]));
        const scoreValues = points.filter(p=>p.type === 'score' && p.result.score !== '').map(p=>Number(p.result.score));
        const maxScore = scoreValues.length ? Math.max(...scoreValues, 550) : 550;
        const yMax = Math.ceil(maxScore / 50) * 50;
        const useBreak = scoreValues.some(v=>v >= 500);
        const scoreData = points.filter(p=>p.type === 'score').map(p=>({
            x: dateIndex.get(p.dateInfo.date || ''),
            y: Number(p.result.score),
            name: p.ex.name,
            custom: { dateTime: formatResultDateTime(p.dateInfo), value: `${p.result.score}点` }
        }));
        const passColor = {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, 'rgba(239, 68, 68, 0)'], [0.5, '#EF4444'], [1, '#EF4444']]
        };
        const failColor = {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, 'rgba(59, 130, 246, 0)'], [0.5, '#3B82F6'], [1, '#3B82F6']]
        };
        const passFailData = points.filter(p=>p.type === 'passfail').map(p=>{
            const isPass = p.result.outcome === 'pass';
            return {
                x: dateIndex.get(p.dateInfo.date || ''),
                y: 1,
                color: isPass ? passColor : failColor,
                name: p.ex.name,
                custom: { dateTime: formatResultDateTime(p.dateInfo), value: isPass ? '合格' : '不合格' }
            };
        });
        Highcharts.chart(chartEl, {
            chart: {
                backgroundColor: 'transparent',
                height: 320,
                spacing: [12, 12, 22, 10],
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            credits: { enabled: false },
            legend: { enabled: false },
            xAxis: {
                categories,
                tickLength: 0,
                lineColor: '#E5E7EB',
                crosshair: {
                    color: '#CBD5E1',
                    width: 1,
                    dashStyle: 'ShortDash'
                },
                labels: { style: { color: '#6B7280', fontWeight: '700' } }
            },
            yAxis: [{
                min: 0,
                max: yMax,
                breaks: useBreak ? [{ from: 0, to: 500, breakSize: 12 }] : [],
                title: { text: null },
                gridLineColor: '#EEF2F7',
                lineWidth: 1,
                lineColor: '#E5E7EB',
                tickColor: '#E5E7EB',
                crosshair: {
                    color: '#CBD5E1',
                    width: 1,
                    dashStyle: 'ShortDash'
                },
                labels: {
                    format: '{value}点',
                    style: { color: '#6B7280', fontWeight: '700' }
                }
            }, {
                min: 0,
                max: 1,
                visible: false
            }],
            tooltip: {
                useHTML: true,
                borderWidth: 0,
                borderRadius: 8,
                shadow: false,
                backgroundColor: 'rgba(17, 24, 39, 0.94)',
                style: { color: '#fff', fontWeight: '700' },
                formatter: function(){
                    const point = this.point;
                    return `<strong>${point.name}</strong><br><span>${point.custom.dateTime}</span><br><span>${point.custom.value}</span>`;
                }
            },
            plotOptions: {
                series: {
                    animation: false,
                    states: { inactive: { opacity: 1 } }
                },
                line: {
                    connectNulls: true,
                    stickyTracking: false,
                    findNearestPointBy: 'xy',
                    marker: {
                        enabled: true,
                        radius: 4,
                        lineWidth: 2,
                        lineColor: '#4F46E5',
                        fillColor: '#FFFFFF'
                    }
                },
                column: {
                    pointWidth: 24,
                    borderRadius: '50%',
                    borderWidth: 0
                }
            },
            series: [{
                type: 'column',
                yAxis: 1,
                data: passFailData,
                color: '#3B82F6',
                zIndex: 1
            }, {
                type: 'line',
                data: scoreData,
                color: '#4F46E5',
                lineWidth: 4,
                stickyTracking: false,
                zIndex: 3
            }]
        });
    }
    function renderResultsDashboard(){
        if(!resultsDashboard) return;
        const records = getResultRecords();
        const scoreRecords = records.filter(r=>r.type==='score');
        const passFailRecords = records.filter(r=>r.type==='passfail');
        const scoreInputCount = scoreRecords.filter(r=>r.result.score !== '').length;
        const passFailInputCount = passFailRecords.filter(r=>['pass','fail'].includes(r.result.outcome)).length;
        const resultChartCount = scoreInputCount + passFailInputCount;
        if(!records.length){
            resultsDashboard.innerHTML = `<div class="empty-state"><i class="fas fa-chart-line"></i><p>結果を表示できる試験がありません。<br>試験を追加するとここに一覧が表示されます。</p></div>`;
            return;
        }
        const rows = records.map(r=>`
            <div class="result-record-card" data-result-card="${r.ex.id}-${r.dateIdx}">
                <div class="result-record-main">
                    <span class="result-record-exam-name">${r.ex.name}</span>
                    <strong class="result-record-date">${formatDate(r.dateInfo.date)}${r.dateInfo.time?` (${r.dateInfo.time})`:''}</strong>
                </div>
                <div class="result-record-meta">
                    <span class="result-type-pill">${r.type==='score'?'スコア':'合否'}</span>
                    ${getResultControl(r)}
                </div>
            </div>`).join('');
        resultsDashboard.innerHTML = `
            <div class="result-panel">
                <div class="result-panel-head">
                    <h3><i class="fas fa-chart-line"></i> スコア推移</h3>
                    <span>${resultChartCount}件</span>
                </div>
                ${buildScoreChart(scoreRecords, passFailRecords)}
            </div>
            <div class="result-panel">
                <div class="result-panel-head">
                    <h3><i class="fas fa-list-check"></i> 成績記録</h3>
                    <span>${records.length}件</span>
                </div>
                <div class="result-record-list">${rows}</div>
            </div>`;
        renderScoreChart(scoreRecords, passFailRecords);
    }

    function renderNextExamPop(){
        if(!nextExamPop) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const upcoming = [];
        exams.forEach(ex=>{
            const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime}]:[]);
            ds.forEach((d,i)=>{
                if(!d.date) return;
                const dt = parseDateValue(d.date);
                dt.setHours(0,0,0,0);
                if(dt < today) return;
                upcoming.push({ex, dateInfo:d, dateIndex:i, date:dt, days:Math.ceil((dt-today)/864e5)});
            });
        });
        upcoming.sort((a,b)=>a.date-b.date);
        const next = upcoming[0];
        if(!next){
            nextExamPop.classList.add('hidden');
            nextExamPop.innerHTML = '';
            return;
        }
        const dayText = next.days === 0 ? '本日' : `あと${next.days}日`;
        const dateText = `${formatDate(next.dateInfo.date)}${next.dateInfo.time?` (${next.dateInfo.time})`:''}`;
        const memos = (next.ex.memos||[]).filter(m=>m.targetDate==='all'||m.targetDate===next.dateInfo.date);
        const memoHtml = memos.length
            ? memos.slice(0,2).map(m=>`<div class="next-exam-memo"><i class="fas fa-sticky-note"></i><span>${m.text}</span></div>`).join('')
            : '<div class="next-exam-memo is-empty"><i class="far fa-note-sticky"></i><span>メモなし</span></div>';
        nextExamPop.classList.remove('hidden');
        nextExamPop.innerHTML = `
            <button class="next-exam-left" type="button" onclick="scrollToCalendarDate('${next.dateInfo.date}')">
                <div class="next-exam-icon"><i class="fas fa-hourglass-half"></i></div>
                <div class="next-exam-main">
                    <span class="next-exam-label">直近の試験</span>
                    <strong>${next.ex.name}</strong>
                    <span>${dateText}</span>
                </div>
            </button>
            <div class="next-exam-notes">
                ${memoHtml}
            </div>
            <button class="next-exam-count" type="button" onclick="scrollToExam('${next.ex.id}', '${next.dateInfo.date}', '${next.ex.id}')">${dayText}</button>
        `;
    }

    let applyRangeOverlay = null;
    let applyRangeHoverTimer = null;
    let applyRangeHighlightedCells = [];
    let applyRangeHoverToken = 0;
    function getApplyRangeOverlay(){
        if(!applyRangeOverlay){
            applyRangeOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            applyRangeOverlay.classList.add('apply-range-overlay', 'hidden');
            document.body.appendChild(applyRangeOverlay);
        }
        return applyRangeOverlay;
    }

    function hideApplyRangeLines(){
        applyRangeHoverToken++;
        if(applyRangeHoverTimer){
            clearInterval(applyRangeHoverTimer);
            applyRangeHoverTimer = null;
        }
        restoreApplyRangeCells();
        const overlay = getApplyRangeOverlay();
        overlay.innerHTML = '';
        overlay.classList.add('hidden');
    }

    function eachDateValue(start, end){
        const values = [];
        const cursor = parseDateValue(start);
        const last = parseDateValue(end);
        if(cursor > last) return values;
        while(cursor <= last){
            values.push(toDateValue(cursor.getFullYear(), cursor.getMonth()+1, cursor.getDate()));
            cursor.setDate(cursor.getDate()+1);
        }
        return values;
    }

    function getApplyRangeCells(range){
        const cells = [];
        eachDateValue(range.start, range.end).forEach(date=>{
            miniCalEl.querySelectorAll(`[data-calendar-date="${date}"]`).forEach(cell=>{
                cells.push({date, cell, isPlaceholder:false});
            });
        });
        miniCalEl.querySelectorAll('[data-calendar-line-date]').forEach(cell=>{
            const date = cell.dataset.calendarLineDate;
            const monthStart = cell.dataset.calendarLineMonth;
            const crossesIntoMonth = range.start < monthStart && monthStart <= range.end;
            if(crossesIntoMonth && range.start <= date && date <= range.end){
                cells.push({date, cell, isPlaceholder:true});
            }
        });
        return cells;
    }

    function buildCalendarPaths(cells, range){
        const monthGroups = [];
        cells.forEach(item=>{
            const rect = item.cell.getBoundingClientRect();
            const monthEl = item.cell.closest('.mini-month');
            let monthGroup = monthGroups.find(g=>g.monthEl===monthEl);
            if(!monthGroup){
                monthGroup = {monthEl, rows:[]};
                monthGroups.push(monthGroup);
            }
            const topKey = Math.round(rect.top);
            let row = monthGroup.rows.find(g=>Math.abs(g.top-topKey)<3);
            if(!row){
                row = {top:topKey, items:[]};
                monthGroup.rows.push(row);
            }
            row.items.push({...item, rect});
        });

        return monthGroups.map(monthGroup=>{
            const rows = monthGroup.rows.sort((a,b)=>a.top-b.top);
            rows.forEach(row=>row.items.sort((a,b)=>a.rect.left-b.rect.left));
            let d = '';
            rows.forEach(row=>{
                for(let i=0;i<row.items.length-1;i++){
                    const current = row.items[i];
                    const next = row.items[i+1];
                    const y = current.rect.top + current.rect.height / 2;
                    const x1 = current.rect.right;
                    const x2 = next.rect.left;
                    if(x2 <= x1) continue;
                    const blockers = row.items
                        .filter(item=>item.cell.dataset.applyRangeIds && !item.isPlaceholder && item.date !== range.start && item.date !== range.end)
                        .map(item=>({left:item.rect.left, right:item.rect.right}))
                        .filter(block=>block.right > x1 && block.left < x2)
                        .sort((a,b)=>a.left-b.left);
                    let cursor = x1;
                    blockers.forEach(block=>{
                        if(block.left > cursor) d += ` M ${cursor} ${y} L ${block.left} ${y}`;
                        cursor = Math.max(cursor, block.right);
                    });
                    if(x2 > cursor) d += ` M ${cursor} ${y} L ${x2} ${y}`;
                }
            });
            return d;
        });
    }

    function restoreApplyRangeCells(){
        applyRangeHighlightedCells.forEach(({cell, style})=>{
            cell.setAttribute('style', style);
            cell.classList.remove('calendar-hover-blink');
        });
        applyRangeHighlightedCells = [];
    }

    function applyRangeCellStyle(cell, range){
        if(!applyRangeHighlightedCells.some(item=>item.cell===cell)){
            applyRangeHighlightedCells.push({cell, style:cell.getAttribute('style') || ''});
        }
        cell.style.background = range.color.light;
        cell.style.color = range.color.text;
        cell.style.border = `2px dashed ${range.color.bg}`;
        cell.style.boxShadow = 'none';
        cell.style.fontWeight = '800';
        cell.style.setProperty('--hover-blink-bg', range.color.light);
        cell.style.setProperty('--hover-blink-color', range.color.text);
        cell.style.setProperty('--hover-blink-border', `2px dashed ${range.color.bg}`);
        cell.style.setProperty('--hover-blink-shadow', 'none');
        cell.classList.add('calendar-hover-blink');
    }

    function showApplyRangeLines(rangeIds, applyRanges){
        const overlay = getApplyRangeOverlay();
        overlay.innerHTML = '';
        restoreApplyRangeCells();
        rangeIds.forEach(id=>{
            const range = applyRanges.get(id);
            if(!range) return;
            const startCell = miniCalEl.querySelector(`[data-calendar-date="${range.start}"][data-apply-range-ids~="${id}"]`);
            const endCell = miniCalEl.querySelector(`[data-calendar-date="${range.end}"][data-apply-range-ids~="${id}"]`);
            if(startCell) applyRangeCellStyle(startCell, range);
            if(endCell) applyRangeCellStyle(endCell, range);
        });
        overlay.classList.toggle('hidden', !overlay.childElementCount);
    }

    function bindApplyRangeHover(applyRanges){
        miniCalEl.querySelectorAll('[data-apply-range-ids]').forEach(cell=>{
            const getIds = () => cell.dataset.applyRangeIds.split(' ').filter(Boolean);
            cell.addEventListener('mouseenter', () => {
                hideApplyRangeLines();
                const token = ++applyRangeHoverToken;
                const ids = getIds();
                let index = 0;
                const showCurrent = () => {
                    if(token !== applyRangeHoverToken) return;
                    showApplyRangeLines([ids[index]], applyRanges);
                };
                requestAnimationFrame(showCurrent);
                if(ids.length > 1){
                    applyRangeHoverTimer = setInterval(()=>{
                        if(token !== applyRangeHoverToken) return;
                        index = (index + 1) % ids.length;
                        showCurrent();
                    }, 1000);
                }
            });
            cell.addEventListener('mouseleave', hideApplyRangeLines);
        });
    }

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
                const st=getStatusInfo(normalizeStatus(d.status||ex.status||'planning'));
                const as=d.applyStart!==undefined?d.applyStart:ex.applyStart, ae=d.applyEnd!==undefined?d.applyEnd:ex.applyEnd;
                let ap=''; if(as||ae) ap=`<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.4rem"><i class="fas fa-edit" style="width:12px;margin-right:4px"></i>申込: ${as?formatDate(as):''} 〜 ${ae?formatDate(ae):''}</div>`;
                return `<div class="exam-date-item" data-exam-id="${ex.id}" data-exam-date="${d.date}" data-apply-start="${as||''}" data-apply-end="${ae||''}" style="margin-bottom:1rem; padding:0.55rem 0.55rem 0.8rem; border-bottom:1px solid var(--border-light); border-radius:10px;">
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
        if(applyRangeOverlay) hideApplyRangeLines();
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
            { bg: '#F87171', shadow: 'rgba(248,113,113,0.4)', light: 'rgba(248,113,113,0.18)', text: '#F87171' },
            { bg: '#22D3EE', shadow: 'rgba(34,211,238,0.4)',  light: 'rgba(34,211,238,0.18)',  text: '#0891B2' },
            { bg: '#A3E635', shadow: 'rgba(163,230,53,0.4)',  light: 'rgba(163,230,53,0.18)',  text: '#65A30D' },
            { bg: '#E879F9', shadow: 'rgba(232,121,249,0.4)', light: 'rgba(232,121,249,0.18)', text: '#C026D3' },
            { bg: '#38BDF8', shadow: 'rgba(56,189,248,0.4)',  light: 'rgba(56,189,248,0.18)',  text: '#0284C7' },
            { bg: '#FACC15', shadow: 'rgba(250,204,21,0.4)',  light: 'rgba(250,204,21,0.18)',  text: '#CA8A04' },
            { bg: '#C084FC', shadow: 'rgba(192,132,252,0.4)', light: 'rgba(192,132,252,0.18)', text: '#9333EA' },
            { bg: '#4ADE80', shadow: 'rgba(74,222,128,0.4)',  light: 'rgba(74,222,128,0.18)',  text: '#16A34A' },
        ];
        const setColorMap = new Map();
        const applyRanges = new Map();
        let colorIdx = 0;
        exams.forEach(ex => {
            const ds = ex.examDates || (ex.examDate ? [{date:ex.examDate,time:ex.examTime,status:ex.status}] : []);
            ds.forEach((ed, i) => {
                setColorMap.set(ex.id + '-' + i, colorIdx % palette.length);
                const as=ed.applyStart!==undefined?ed.applyStart:ex.applyStart;
                const ae=ed.applyEnd!==undefined?ed.applyEnd:ex.applyEnd;
                if(as && ae){
                    const color = palette[colorIdx % palette.length];
                    applyRanges.set(ex.id + '-' + i, {start:as, end:ae, color});
                }
                colorIdx++;
            });
        });
        [4,5,6,7,8,9,10,11,12,1,2,3].forEach((m,mIdx)=>{
            const yr=m>=4?currentFiscalYear:currentFiscalYear+1;
            const mm=document.createElement('div'); mm.className='mini-month';
            const hdr=dw.map((d,i)=>`<div class="${i===0?'day-sunday':i===6?'day-saturday':''}">${d}</div>`).join('');
            const fd=new Date(yr,m-1,1).getDay(), dim=new Date(yr,m,0).getDate();
            let grid='';
            const monthStartValue = toDateValue(yr, m, 1);
            for(let i=0;i<fd;i++){
                const lineDate = new Date(yr, m-1, i-fd+1);
                const lineDateValue = toDateValue(lineDate.getFullYear(), lineDate.getMonth()+1, lineDate.getDate());
                grid+=`<div class="mini-day empty" data-calendar-line-date="${lineDateValue}" data-calendar-line-month="${monthStartValue}"></div>`;
            }
            const today=new Date(); today.setHours(0,0,0,0);
            for(let d=1;d<=dim;d++){
                const cellDate = new Date(yr,m-1,d);
                let cls=['mini-day'], dow=cellDate.getDay();
                let hName = getHolidayName(yr, m, d);
                if(dow===0||hName) cls.push('day-sunday'); else if(dow===6) cls.push('day-saturday');
                let evs=[], fid=null, cellStyles=[], applyRangeIds=new Set(), examHoverIds=new Set();
                exams.forEach(ex=>{
                    const ds=ex.examDates||(ex.examDate?[{date:ex.examDate,time:ex.examTime,status:ex.status}]:[]);
                    const added=new Set();
                    ds.forEach((ed, edIdx)=>{
                        let st = normalizeStatus(ed.status || ex.status || 'planning');
                        const ci = setColorMap.get(ex.id + '-' + edIdx);
                        const color = palette[ci];
                        const isApplied = st==='applied';
                        if(ed.date){
                            const dt=new Date(ed.date);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                if(!fid)fid=ex.id;
                                const df=Math.ceil((dt-today)/864e5);
                                const tStr = ed.time ? ` (${ed.time})` : '';
                                evs.push({type:'exam',name:ex.name+tStr,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color,isFinished:false});
                                cellStyles.push({color,isFinished:false,priority:3});
                                examHoverIds.add(ex.id + '-' + edIdx);
                            }
                        }
                        const as=ed.applyStart!==undefined?ed.applyStart:ex.applyStart;
                        const ae=ed.applyEnd!==undefined?ed.applyEnd:ex.applyEnd;
                        const applyRangeId = ex.id + '-' + edIdx;
                        if(as){
                            const dt=new Date(as);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                const k=as+ex.name+'-start-'+edIdx;
                                if(!added.has(k)){
                                    added.add(k);if(!fid)fid=ex.id;
                                    const df=Math.ceil((dt-today)/864e5);
                                    evs.push({type:'apply',name:'申込開始: '+ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color,isFinished:true});
                                    cellStyles.push({color,isFinished:true,priority:1});
                                    if(ae) applyRangeIds.add(applyRangeId);
                                }
                            }
                        }
                        if(ae){
                            const dt=new Date(ae);
                            if(dt.getFullYear()===yr&&dt.getMonth()+1===m&&dt.getDate()===d){
                                const k=ae+ex.name+'-end-'+edIdx;
                                if(!added.has(k)){
                                    added.add(k);if(!fid)fid=ex.id;
                                    const df=Math.ceil((dt-today)/864e5);
                                    evs.push({type:'apply-end',name:'申込締切: '+ex.name,diffStr:df>0?`あと${df}日`:df===0?'本日':'終了',exId:ex.id,edDate:ed.date,color,isFinished:true});
                                    cellStyles.push({color,isFinished:true,priority:2});
                                    if(as) applyRangeIds.add(applyRangeId);
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
                        inlineStyle=`background:${top.color.light};color:${top.color.text};border:2px dashed ${top.color.bg};font-weight:800;--hover-blink-bg:${top.color.light};--hover-blink-color:${top.color.text};--hover-blink-border:2px dashed ${top.color.bg};--hover-blink-shadow:none;`;
                    } else {
                        inlineStyle=`background:${top.color.bg};color:white;box-shadow:0 2px 8px ${top.color.shadow};--hover-blink-bg:${top.color.bg};--hover-blink-color:white;--hover-blink-border:0 solid transparent;--hover-blink-shadow:0 2px 8px ${top.color.shadow};`;
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
                        let eventContent=`<div class="tooltip-event"><span class="tooltip-dot" style="${dotStyle}"></span><span class="tooltip-name">${ev.name}</span><span class="tooltip-days">${ev.diffStr}</span></div>`;
                        const ex=exams.find(e=>e.id===ev.exId);
                        if(ex&&ex.memos){
                            ex.memos.forEach(memo=>{
                                if(memo.targetDate==='all'||memo.targetDate===ev.edDate){
                                    eventContent+=`<div class="tooltip-memo"><i class="fas fa-sticky-note"></i> <span>${memo.text}</span></div>`;
                                }
                            });
                        }
                        tipContent+=`<div class="tooltip-event-group" style="--event-color:${ev.color.bg};">${eventContent}</div>`;
                    });
                }
                if(tipContent) tip=`<div class="modern-tooltip">${tipContent}</div>`;
                if(cellDate < today) cls.push('is-past');
                if(today.getFullYear()===yr&&today.getMonth()+1===m&&today.getDate()===d) cls.push('is-today');
                const cellDateValue = toDateValue(yr, m, d);
                const eventExamIds = [...new Set(evs.map(ev=>ev.exId))];
                let oc=''; if(eventExamIds.length){cls.push('clickable');oc=`onclick="scrollToExam('${eventExamIds[0]}', '${cellDateValue}', '${eventExamIds.join(',')}')"`;}
                if(tipContent) cls.push('has-tooltip');
                const eventBadge = evs.length >= 2 ? `<span class="mini-event-badge">${evs.length}</span>` : '';
                const rangeAttr = applyRangeIds.size ? ` data-apply-range-ids="${[...applyRangeIds].join(' ')}"` : '';
                const examHoverAttr = examHoverIds.size ? ` data-exam-hover-ids="${[...examHoverIds].join(' ')}"` : '';
                grid+=`<div class="${cls.join(' ')}" data-calendar-date="${cellDateValue}"${rangeAttr}${examHoverAttr} style="${inlineStyle}" ${oc}><span class="calendar-hover-surface"></span><span class="mini-day-number">${d}</span>${eventBadge}${tip}</div>`;
            }
            mm.innerHTML=`<div class="mini-month-name">${m}月</div><div class="mini-days-header">${hdr}</div><div class="mini-days-grid">${grid}</div>`;
            miniCalEl.appendChild(mm);
        });
        bindApplyRangeHover(applyRanges);
    }

    render();
    switchMainView(activeView);
});
