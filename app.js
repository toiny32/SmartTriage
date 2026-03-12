// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let user = {};
let patients = [];
let schedule = [];
let scheduleCount = 0, lastRisk = null;
let playInterval = null, playTime = 0, playMax = 0;
let _jsonOutput = null, _readmeText = '';
let sevChart = null, arrChart = null;

// ═══════════════════════════════════════════
//  AVATAR / LOGIN
// ═══════════════════════════════════════════
const AVATAR_COLORS = ['#3d9bff','#ff4466','#00dda0','#f5a623','#a78bfa','#ff6b8a'];
function avatarColor(s){let h=0;for(let c of s)h=(h*31+c.charCodeAt(0))&0xffff;return AVATAR_COLORS[h%AVATAR_COLORS.length];}
function initials(f,l){return((f[0]||'')+(l[0]||'')).toUpperCase();}

function doLogin(){
  const fname=document.getElementById('l-fname').value.trim();
  if(!fname){toast('Enter your first name','e');return;}
  const lname=document.getElementById('l-lname').value.trim();
  user={fname,lname,fullName:(fname+' '+lname).trim(),
    role:document.getElementById('l-role').value,
    dept:document.getElementById('l-dept').value,
    hospital:document.getElementById('l-hospital').value.trim()||'City General Hospital',
    staffId:document.getElementById('l-staffid').value.trim()||'STAFF-'+Date.now().toString().slice(-5),
    loginTime:new Date().toLocaleString(),
    color:avatarColor(fname+lname)};
  localStorage.setItem('st_user', JSON.stringify(user));
  const ls=document.getElementById('login-screen');
  ls.classList.add('exit');
  setTimeout(()=>{ls.style.display='none';const app=document.getElementById('app');app.style.display='block';app.classList.add('visible');applyUserToUI();toast('Welcome, '+user.fname+'! 👋','s');},500);
}

// Auto-login if saved session exists
(function(){
  try {
    const saved = localStorage.getItem('st_user');
    if(saved){
      user = JSON.parse(saved);
      const ls=document.getElementById('login-screen');
      ls.style.display='none';
      const app=document.getElementById('app');
      app.style.display='block';app.classList.add('visible');
      // Pre-fill login form in case they want to see it
      document.getElementById('l-fname').value=user.fname||'';
      document.getElementById('l-lname').value=user.lname||'';
      applyUserToUI();
    }
  } catch(e){ localStorage.removeItem('st_user'); }
})();

function applyUserToUI(){
  const ini=initials(user.fname,user.lname||'');
  const av=document.getElementById('hdr-avatar');
  av.textContent=ini;av.style.background=user.color;
  document.getElementById('hdr-name').textContent=user.fname;
  const avLg=document.getElementById('p-avatar-lg');
  avLg.style.background=user.color;avLg.innerHTML=`<div class="online-ring"></div>${ini}`;
  document.getElementById('p-full-name').textContent=user.fullName||user.fname;
  const rc={'Attending Physician':'var(--accent)','Emergency Medicine Resident':'var(--green)','Triage Nurse':'var(--amber)','Charge Nurse':'var(--amber)','ER Department Head':'var(--red)','Medical Director':'var(--red)','Hospitalist':'var(--purple)'}[user.role]||'var(--text2)';
  const rb=document.getElementById('p-role-badge');rb.textContent=user.role;rb.style.cssText=`background:${rc}22;border:1px solid ${rc}44;color:${rc}`;
  document.getElementById('p-dept').textContent=user.dept;
  updateProfileStats();renderProfileInfo();
}
function updateProfileStats(){
  document.getElementById('ps-pts').textContent=patients.length;
  document.getElementById('ps-sched').textContent=scheduleCount;
  document.getElementById('ps-risk').textContent=lastRisk!==null?lastRisk:'—';
}
function renderProfileInfo(){
  document.getElementById('p-info-list').innerHTML=[
    ['STAFF ID',user.staffId],['HOSPITAL',user.hospital],['DEPARTMENT',user.dept],['ROLE',user.role],['SESSION',user.loginTime]
  ].map(([k,v])=>`<div class="pi-row"><span class="pi-key">${k}</span><span class="pi-val">${v}</span></div>`).join('');
}
function openProfile(){updateProfileStats();document.getElementById('profile-overlay').classList.add('open');document.getElementById('profile-panel').classList.add('open');}
function closeProfile(){document.getElementById('profile-overlay').classList.remove('open');document.getElementById('profile-panel').classList.remove('open');}
function showEditProfile(){
  document.getElementById('ep-fname').value=user.fname;document.getElementById('ep-lname').value=user.lname;
  document.getElementById('ep-role').value=user.role;document.getElementById('ep-dept').value=user.dept;
  document.getElementById('ep-hospital').value=user.hospital;document.getElementById('ep-staffid').value=user.staffId;
  document.getElementById('edit-profile-modal').classList.remove('hidden');
}
function closeEditProfile(){document.getElementById('edit-profile-modal').classList.add('hidden');}
function saveProfileEdit(){
  user.fname=document.getElementById('ep-fname').value.trim()||user.fname;
  user.lname=document.getElementById('ep-lname').value.trim();
  user.fullName=(user.fname+' '+user.lname).trim();
  user.role=document.getElementById('ep-role').value;user.dept=document.getElementById('ep-dept').value;
  user.hospital=document.getElementById('ep-hospital').value.trim()||user.hospital;
  user.staffId=document.getElementById('ep-staffid').value.trim()||user.staffId;
  user.color=avatarColor(user.fname+user.lname);
  localStorage.setItem('st_user', JSON.stringify(user));
  applyUserToUI();closeEditProfile();closeProfile();toast('Profile updated','s');
}
function doLogout(){
  if(!confirm('Sign out?'))return;closeProfile();
  localStorage.removeItem('st_user');
  patients=[];schedule=[];scheduleCount=0;lastRisk=null;
  if(sevChart){sevChart.destroy();sevChart=null;}if(arrChart){arrChart.destroy();arrChart=null;}
  document.getElementById('app').style.display='none';
  const ls=document.getElementById('login-screen');ls.style.display='flex';ls.classList.remove('exit');
  ls.style.opacity='0';ls.style.transform='scale(.96)';
  setTimeout(()=>{ls.style.transition='opacity .4s,transform .4s';ls.style.opacity='1';ls.style.transform='scale(1)';},20);
}

// ═══════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════
const htmlEl=document.documentElement;
document.getElementById('themeBtn').addEventListener('click',()=>{
  const dark=htmlEl.getAttribute('data-theme')==='dark';
  htmlEl.setAttribute('data-theme',dark?'light':'dark');
  document.getElementById('themeKnob').textContent=dark?'☀️':'🌙';
  if(schedule.length)setTimeout(()=>rebuildCharts(),50);
});

// ═══════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════
const TABS=['dashboard','csv','schedule','export'];
function gotoTab(t){
  TABS.forEach(id=>{document.getElementById('p-'+id)?.classList.toggle('hidden',id!==t);document.getElementById('t-'+id)?.classList.toggle('active',id===t);});
  if(t==='schedule'&&!schedule.length){document.getElementById('sched-content').classList.add('hidden');document.getElementById('empty-sched').classList.remove('hidden');}
  if(t==='export'&&schedule.length){
    document.getElementById('empty-json').classList.add('hidden');
    document.getElementById('json-wrap').classList.remove('hidden');
    document.getElementById('empty-report').classList.add('hidden');
    document.getElementById('report-wrap').classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════
//  SEV METER
// ═══════════════════════════════════════════
function updateSev(){const v=parseInt(document.getElementById('f-sev').value)||0;document.querySelectorAll('.sev-seg').forEach(s=>{s.className='sev-seg'+(+s.dataset.i<=v?' on-'+s.dataset.i:'');});}

// ═══════════════════════════════════════════
//  PATIENT ID
// ═══════════════════════════════════════════
let pidCounter=1;
function nextPid(){while(patients.find(p=>p.patient_id==='P'+pidCounter))pidCounter++;return'P'+pidCounter;}

// ═══════════════════════════════════════════
//  ADD PATIENT — duplicate checks
//  - Same patient_id: BLOCKED always
//  - Same name + same id: BLOCKED
//  - Same name + different id: ALLOWED (different person with same name)
// ═══════════════════════════════════════════
function addPatient(){
  const name=document.getElementById('f-name').value.trim();
  const pid=document.getElementById('f-id').value.trim()||nextPid();
  const sev=parseInt(document.getElementById('f-sev').value);
  const spec=document.getElementById('f-spec').value;
  const arr=parseInt(document.getElementById('f-arr').value);
  const treat=parseInt(document.getElementById('f-treat').value);
  if(!sev||!spec||isNaN(arr)||isNaN(treat)){toast('Fill all required fields','e');return;}
  if(arr<0){toast('Arrival time must be ≥ 0','e');return;}
  if(treat<1){toast('Treatment time must be ≥ 1','e');return;}
  // Block: same patient_id — do NOT add, just show error
  if(patients.find(p=>p.patient_id===pid)){
    toast('Patient ID "'+pid+'" already exists. Patient not added.','e');
    return;
  }
  // Allow same name with different id — just warn, still add
  const sameName=patients.find(p=>p.name&&name&&p.name.toLowerCase()===name.toLowerCase());
  if(sameName){toast('Note: another patient named "'+name+'" exists (ID: '+sameName.patient_id+'). Adding as different patient.','w');}
  patients.push({patient_id:pid,name:name||pid,severity:sev,arrival_time:arr,treatment_time:treat,required_specialization:spec});
  pidCounter++;renderQueue();clearForm();toast('Patient '+pid+' added','s');updateProfileStats();
}

function clearForm(){
  ['f-name','f-id','f-arr','f-treat'].forEach(id=>document.getElementById(id).value='');
  ['f-sev','f-spec'].forEach(id=>document.getElementById(id).value='');
  updateSev();document.getElementById('f-id').placeholder=nextPid();
}
function removePatient(i){patients.splice(i,1);renderQueue();updateProfileStats();}
function clearAll(){if(!confirm('Clear all patients?'))return;patients=[];renderQueue();updateProfileStats();}

// ═══════════════════════════════════════════
//  RENDER QUEUE
// ═══════════════════════════════════════════
const sevColors=['','#22c55e','#eab308','#f97316','#ef4444','#dc2626'];
function renderQueue(){
  const has=patients.length>0;
  document.getElementById('empty-q').classList.toggle('hidden',has);
  document.getElementById('q-tbl').classList.toggle('hidden',!has);
  document.getElementById('run-bar').classList.toggle('hidden',!has);
  if(!has){document.getElementById('q-count').textContent='';return;}
  document.getElementById('q-count').textContent=patients.length+' patient'+(patients.length!==1?'s':'')+' queued';
  const tb=document.getElementById('q-tbody');tb.innerHTML='';
  patients.forEach((p,i)=>{
    const sb=`<span class="badge-${p.required_specialization[0]}">${p.required_specialization}</span>`;
    tb.innerHTML+=`<tr>
      <td class="mono" style="color:var(--text3)">${i+1}</td>
      <td class="mono">${p.patient_id}</td>
      <td>${p.name}</td>
      <td><span style="color:${sevColors[p.severity]};font-weight:700;font-family:'IBM Plex Mono',monospace">${p.severity}</span></td>
      <td class="mono">${p.arrival_time}</td>
      <td class="mono">${p.treatment_time}</td>
      <td>${sb}</td>
      <td><button class="btn btn-red btn-sm" onclick="removePatient(${i})">✕</button></td>
    </tr>`;
  });
  document.getElementById('f-id').placeholder=nextPid();
}

// ═══════════════════════════════════════════
//  SAMPLE DATA
// ═══════════════════════════════════════════
function loadSample(){
  patients=[
    {patient_id:'P1',name:'Alice Chen',  severity:5,arrival_time:0,treatment_time:8, required_specialization:'TRAUMA'},
    {patient_id:'P2',name:'Bob Martinez',severity:3,arrival_time:2,treatment_time:4, required_specialization:'CARDIO'},
    {patient_id:'P3',name:'Clara Walsh', severity:4,arrival_time:3,treatment_time:6, required_specialization:'TRAUMA'},
    {patient_id:'P4',name:'David Kim',   severity:2,arrival_time:5,treatment_time:3, required_specialization:'GENERAL'},
    {patient_id:'P5',name:'Eva Patel',   severity:5,arrival_time:7,treatment_time:5, required_specialization:'TRAUMA'},
    {patient_id:'P6',name:'Frank Lee',   severity:1,arrival_time:8,treatment_time:2, required_specialization:'GENERAL'},
  ];
  pidCounter=7;renderQueue();toast('Sample data loaded (6 patients)','i');updateProfileStats();
}

// ═══════════════════════════════════════════
//  CSV — auto-run schedule after upload
// ═══════════════════════════════════════════
function doDragOver(e){e.preventDefault();document.getElementById('dropZone').classList.add('over');}
function doDragLeave(){document.getElementById('dropZone').classList.remove('over');}
function doDrop(e){e.preventDefault();document.getElementById('dropZone').classList.remove('over');if(e.dataTransfer.files[0])parseCSV(e.dataTransfer.files[0]);}
function handleFile(e){if(e.target.files[0])parseCSV(e.target.files[0]);}

function parseCSV(f){
  const reader=new FileReader();
  reader.onload=e=>{
    const lines=e.target.result.trim().split('\n');
    const hdrs=lines[0].split(',').map(h=>h.trim().toLowerCase());
    const req=['patient_id','severity','arrival_time','treatment_time','required_specialization'];
    const miss=req.filter(x=>!hdrs.includes(x));
    if(miss.length){toast('Missing columns: '+miss.join(', '),'e');return;}
    patients=[];let errs=0;const seen=new Set();
    const tb=document.getElementById('csv-tbody');tb.innerHTML='';
    for(let i=1;i<lines.length;i++){
      const line=lines[i].trim();if(!line)continue;
      const vals=line.split(',').map(x=>x.trim());
      const row={};hdrs.forEach((h,j)=>row[h]=vals[j]);
      const pid=row.patient_id;const spec=(row.required_specialization||'').toUpperCase();
      if(!pid||isNaN(+row.severity)||isNaN(+row.arrival_time)||isNaN(+row.treatment_time)||
         !['TRAUMA','CARDIO','GENERAL'].includes(spec)||seen.has(pid)){errs++;continue;}
      seen.add(pid);
      patients.push({patient_id:pid,name:row.name||pid,severity:+row.severity,
        arrival_time:+row.arrival_time,treatment_time:+row.treatment_time,required_specialization:spec});
      const sb=`<span class="badge-${spec[0]}">${spec}</span>`;
      tb.innerHTML+=`<tr>
        <td class="mono">${pid}</td>
        <td style="color:${sevColors[+row.severity]||'var(--text)'};font-weight:700;font-family:'IBM Plex Mono',monospace">${row.severity}</td>
        <td class="mono">${row.arrival_time}</td>
        <td class="mono">${row.treatment_time}</td>
        <td>${sb}</td>
      </tr>`;
    }
    document.getElementById('csv-preview').classList.remove('hidden');
    document.getElementById('csv-count').textContent=patients.length+' patients'+(errs?' ('+errs+' skipped/duplicate)':'');
    renderQueue();updateProfileStats();
    toast('Loaded '+patients.length+' patients — running schedule...','i');
    // AUTO-RUN schedule after short delay
    setTimeout(()=>runSmartTriage(true),300);
  };
  reader.readAsText(f);
}

function dlSample(){
  const c=`patient_id,severity,arrival_time,treatment_time,required_specialization\nP1,5,0,8,TRAUMA\nP2,3,2,4,CARDIO\nP3,4,3,6,TRAUMA\nP4,2,5,3,GENERAL\nP5,5,7,5,TRAUMA\nP6,1,8,2,GENERAL`;
  dl(c,'text/csv','sample_patients.csv');toast('Sample CSV downloaded','i');
}

// ═══════════════════════════════════════════
//  OPTIMIZED ALGORITHM
//  Multi-pass: greedy + local improvement swaps
//  Minimizes: Σ severity × wait_time
// ═══════════════════════════════════════════
function canTreat(d,s){return d==='Doctor_G'||(d==='Doctor_T'&&s==='TRAUMA')||(d==='Doctor_C'&&s==='CARDIO');}
function calcRisk(sc){return sc.reduce((s,x)=>s+x._severity*(x.start_time-x._arrival),0);}

function rebuildTimesFromAssignments(pts, assignments){
  // assignments: [{patient_id, doctor_id}] in any order
  // Re-simulate timeline to get correct start/end times
  const ptMap={};pts.forEach(p=>ptMap[p.patient_id]=p);
  const byDoc={Doctor_T:[],Doctor_C:[],Doctor_G:[]};
  assignments.forEach(a=>byDoc[a.doctor_id].push(ptMap[a.patient_id]));
  // Sort each doctor's queue by arrival time
  Object.keys(byDoc).forEach(d=>byDoc[d].sort((a,b)=>a.arrival_time-b.arrival_time));
  const result=[];
  Object.entries(byDoc).forEach(([docId,list])=>{
    let free=0;
    list.forEach(p=>{
      const start=Math.max(free,p.arrival_time);
      free=start+p.treatment_time;
      result.push({patient_id:p.patient_id,doctor_id:docId,start_time:start,end_time:free,
        _severity:p.severity,_arrival:p.arrival_time,_spec:p.required_specialization,_name:p.name||p.patient_id,
        _wait:start-p.arrival_time,_risk:p.severity*(start-p.arrival_time)});
    });
  });
  result.sort((a,b)=>a.start_time-b.start_time);
  return result;
}

function runOptimized(pts){
  if(!pts.length)return[];
  const sorted=[...pts].sort((a,b)=>a.arrival_time-b.arrival_time);

  // ── Phase 1: Greedy priority scheduling ──
  const docs={Doctor_T:{freeAt:0},Doctor_C:{freeAt:0},Doctor_G:{freeAt:0}};
  const sched=[];const done=new Set();const wait=[];

  // Priority score: heavily weight severity, penalize long treatment (prefer quick wins for high-sev)
  function score(p,now){
    const wait_so_far=now-p.arrival_time;
    return p.severity*1000 + wait_so_far*p.severity*2 - p.treatment_time*0.1;
  }

  function assign(docId,p){
    const start=Math.max(docs[docId].freeAt,p.arrival_time);
    docs[docId].freeAt=start+p.treatment_time;
    done.add(p.patient_id);
    sched.push({patient_id:p.patient_id,doctor_id:docId,start_time:start,end_time:start+p.treatment_time,
      _severity:p.severity,_arrival:p.arrival_time,_spec:p.required_specialization,_name:p.name||p.patient_id});
    const wi=wait.findIndex(x=>x.patient_id===p.patient_id);if(wi>=0)wait.splice(wi,1);
  }

  let iter=0;
  while(done.size<sorted.length&&iter<500000){
    iter++;
    const now=Math.min(...Object.values(docs).map(d=>d.freeAt));
    sorted.forEach(p=>{if(!done.has(p.patient_id)&&p.arrival_time<=now&&!wait.find(w=>w.patient_id===p.patient_id))wait.push(p);});
    let any=false;
    for(const[docId,doc] of Object.entries(docs)){
      if(done.size>=sorted.length)break;
      if(doc.freeAt>now)continue;
      const cands=wait.filter(p=>canTreat(docId,p.required_specialization));
      if(!cands.length){
        const fut=sorted.filter(p=>!done.has(p.patient_id)&&!wait.find(w=>w.patient_id===p.patient_id)&&canTreat(docId,p.required_specialization));
        if(fut.length)doc.freeAt=Math.min(...fut.map(p=>p.arrival_time));
        continue;
      }
      cands.sort((a,b)=>score(b,now)-score(a,now));
      let best=cands[0];
      // Smart overflow: Doctor_G defers to specialist if specialist will be free very soon
      if(docId==='Doctor_G'&&best.required_specialization!=='GENERAL'){
        const sd=best.required_specialization==='TRAUMA'?'Doctor_T':'Doctor_C';
        if(docs[sd].freeAt<=now+3&&best.severity<=3){
          const go=cands.filter(p=>p.required_specialization==='GENERAL');
          if(go.length){go.sort((a,b)=>score(b,now)-score(a,now));best=go[0];}else continue;
        }
      }
      assign(docId,best);any=true;
    }
    if(!any){
      const nf=Math.min(...Object.values(docs).map(d=>d.freeAt));
      const na=sorted.filter(p=>!done.has(p.patient_id)&&!wait.find(w=>w.patient_id===p.patient_id)).reduce((m,p)=>Math.min(m,p.arrival_time),Infinity);
      const nx=Math.min(nf,na);if(nx===Infinity)break;
      Object.values(docs).forEach(d=>{if(d.freeAt<=now)d.freeAt=nx;});
      sorted.forEach(p=>{if(!done.has(p.patient_id)&&p.arrival_time<=nx&&!wait.find(w=>w.patient_id===p.patient_id))wait.push(p);});
    }
  }

  sched.sort((a,b)=>a.start_time-b.start_time);
  sched.forEach(s=>{s._wait=s.start_time-s._arrival;s._risk=s._severity*s._wait;});

  // ── Phase 2: Local improvement — try swapping doctor assignments ──
  let bestSched=sched;
  let bestRisk=calcRisk(sched);
  const assignments=sched.map(s=>({patient_id:s.patient_id,doctor_id:s.doctor_id}));

  for(let pass=0;pass<3;pass++){
    let improved=false;
    for(let i=0;i<assignments.length;i++){
      for(let j=i+1;j<assignments.length;j++){
        const ai=assignments[i],aj=assignments[j];
        const pi=pts.find(p=>p.patient_id===ai.patient_id);
        const pj=pts.find(p=>p.patient_id===aj.patient_id);
        // Can they swap doctors?
        if(!canTreat(aj.doctor_id,pi.required_specialization))continue;
        if(!canTreat(ai.doctor_id,pj.required_specialization))continue;
        // Try the swap
        const swapped=assignments.map((a,k)=>{
          if(k===i)return{patient_id:a.patient_id,doctor_id:aj.doctor_id};
          if(k===j)return{patient_id:a.patient_id,doctor_id:ai.doctor_id};
          return a;
        });
        const rebuilt=rebuildTimesFromAssignments(pts,swapped);
        const newRisk=calcRisk(rebuilt);
        if(newRisk<bestRisk){
          bestRisk=newRisk;bestSched=rebuilt;
          assignments[i]={patient_id:ai.patient_id,doctor_id:aj.doctor_id};
          assignments[j]={patient_id:aj.patient_id,doctor_id:ai.doctor_id};
          improved=true;break;
        }
      }
      if(improved)break;
    }
    if(!improved)break;
  }

  bestSched.sort((a,b)=>a.start_time-b.start_time);
  bestSched.forEach(s=>{s._wait=s.start_time-s._arrival;s._risk=s._severity*s._wait;});
  return bestSched;
}

// ═══════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════
function runSmartTriage(fromCsv=false){
  if(!patients.length){toast('No patients to schedule','e');return;}
  toast('Optimizing schedule...','i');
  setTimeout(()=>{
    schedule=runOptimized(patients);
    const risk=calcRisk(schedule);
    scheduleCount++;lastRisk=risk;
    renderSchedule(risk);
    document.getElementById('sched-badge').textContent=schedule.length;
    document.getElementById('sched-badge').style.display='';
    gotoTab('schedule');
    buildJSON(risk);buildReport(risk);
    updateProfileStats();
    const msg=fromCsv?'CSV loaded & scheduled · Risk = '+risk:'Schedule complete · Risk = '+risk;
    toast(msg,risk===0?'s':risk<100?'i':'w');
  },60);
}

// ═══════════════════════════════════════════
//  RENDER SCHEDULE
// ═══════════════════════════════════════════
function renderSchedule(totalRisk){
  document.getElementById('sched-content').classList.remove('hidden');
  document.getElementById('empty-sched').classList.add('hidden');
  const critPts=schedule.filter(s=>s._severity===5).length;
  const zeroPts=schedule.filter(s=>s._wait===0).length;
  const makespan=schedule.length?Math.max(...schedule.map(s=>s.end_time)):0;

  // Risk Optimization card on Dashboard
  document.getElementById('risk-opt-card').style.display='';
  document.getElementById('risk-opt-num').textContent=totalRisk;
  const rn=document.getElementById('risk-opt-num');
  rn.style.color=totalRisk===0?'var(--green)':totalRisk<100?'var(--amber)':'var(--red)';
  const maxBar=Math.max(patients.length*5*20,1);
  const barPct=Math.min(100,(totalRisk/maxBar)*100);
  document.getElementById('risk-opt-bar').style.width=barPct+'%';
  const grade=totalRisk===0?'🟢 Perfect — Zero risk':totalRisk<20?'✅ Excellent — Very low risk':totalRisk<50?'🟡 Good — Low risk':totalRisk<200?'🟠 Fair — Moderate risk':'🔴 High risk — consider more doctors';
  document.getElementById('risk-opt-grade').innerHTML=`<span style="color:${totalRisk===0?'var(--green)':totalRisk<20?'var(--green)':totalRisk<100?'var(--amber)':'var(--red)'}">${grade}</span>`;

  const re=document.getElementById('k-risk');
  re.textContent=totalRisk;re.className='kpi-num '+(totalRisk===0?'good':totalRisk<100?'ok':'bad');
  document.getElementById('k-pts').textContent=schedule.length;
  const ce=document.getElementById('k-crit');ce.textContent=critPts;ce.className='kpi-num '+(critPts===0?'good':critPts<3?'ok':'bad');
  const ze=document.getElementById('k-zero');ze.textContent=zeroPts;ze.className='kpi-num '+(zeroPts===schedule.length?'good':zeroPts>schedule.length/2?'ok':'bad');

  renderDoctorStatus(0);
  renderTimeline(makespan);
  playMax=makespan;playTime=0;
  document.getElementById('pb-slider').max=makespan;
  document.getElementById('pb-slider').value=0;
  document.getElementById('pb-t').textContent=0;
  renderHeatmap(totalRisk);

  const tb=document.getElementById('sched-tbody');tb.innerHTML='';
  schedule.forEach((s,i)=>{
    const rc=s._risk===0?'color:var(--green)':s._risk<20?'color:var(--amber)':'color:var(--red)';
    tb.innerHTML+=`<tr>
      <td class="mono" style="color:var(--text3)">${i+1}</td>
      <td class="mono" style="font-weight:700">${s.patient_id}</td>
      <td>${s._name}</td>
      <td class="mono" style="font-size:.68rem">${s.doctor_id}</td>
      <td class="mono">${s.start_time}</td>
      <td class="mono">${s.end_time}</td>
      <td class="mono">${s._wait} min</td>
      <td class="mono" style="${rc};font-weight:700">${s._risk}</td>
      <td><span class="badge-${s._spec[0]}">${s._spec}</span></td>
    </tr>`;
  });

  // Build charts from patient data
  buildPatientCharts();
}

// ═══════════════════════════════════════════
//  DOCTOR STATUS (live during playback)
// ═══════════════════════════════════════════
function renderDoctorStatus(t){
  ['T','C','G'].forEach(k=>{
    const docId='Doctor_'+k;
    const current=schedule.find(s=>s.doctor_id===docId&&s.start_time<=t&&s.end_time>t);
    const card=document.getElementById('dsc-'+k);
    const pill=document.getElementById('dsp-'+k);
    const lbl=document.getElementById('dst-'+k);
    const cpEl=document.getElementById('dcp-'+k);
    const faEl=document.getElementById('dfa-'+k);
    const pf=document.getElementById('dpf-'+k);

    if(current){
      card.className='doc-status-card '+['TRAUMA','CARDIO','GENERAL'][['T','C','G'].indexOf(k)]+' busy';
      pill.className='doc-status-pill busy';lbl.textContent='TREATING';
      cpEl.textContent='→ '+current.patient_id+' ('+current._name+') · Sev '+current._severity;
      faEl.textContent='Free at T='+current.end_time+' min';
      const prog=((t-current.start_time)/(current.end_time-current.start_time))*100;
      pf.style.width=Math.min(100,prog)+'%';
    } else {
      // Check if there's a next patient queued
      const next=schedule.filter(s=>s.doctor_id===docId&&s.start_time>t).sort((a,b)=>a.start_time-b.start_time)[0];
      card.className='doc-status-card '+['TRAUMA','CARDIO','GENERAL'][['T','C','G'].indexOf(k)]+' free';
      pill.className='doc-status-pill free';lbl.textContent='FREE';
      cpEl.textContent=next?'Next: '+next.patient_id+' at T='+next.start_time:'No more patients';
      faEl.textContent='';pf.style.width='0%';
    }
  });
}

// ═══════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════
function renderTimeline(makespan){
  const W=Math.max(makespan,1);
  const sc=sev=>sev>=5?'sev-critical':sev===4?'sev-serious':sev===3?'sev-moderate':sev===2?'sev-minor':'sev-minimal';
  let h='<div style="display:flex;padding:0 0 8px 100px;font-family:\'IBM Plex Mono\',monospace;font-size:.58rem;color:var(--text3)">';
  const step=Math.ceil(W/Math.min(14,W));
  for(let t=0;t<=W;t+=step)h+=`<span style="flex:${step};text-align:left;padding-left:2px">${t}</span>`;
  h+='</div>';
  ['Doctor_T','Doctor_C','Doctor_G'].forEach(d=>{
    const ds=schedule.filter(s=>s.doctor_id===d).sort((a,b)=>a.start_time-b.start_time);
    h+=`<div class="tl-row"><div class="tl-lbl">${d}</div><div class="tl-track" style="position:relative">
      <div class="tl-cursor-line" id="cur-${d}" style="left:0%;opacity:0"></div>`;
    // Show idle gaps between treatments
    let prevEnd=0;
    ds.forEach(s=>{
      if(s.start_time>prevEnd){
        const iL=(prevEnd/W)*100,iW=((s.start_time-prevEnd)/W)*100;
        if(iW>1)h+=`<div class="tl-idle" style="left:${iL}%;width:${iW}%"><span class="tl-idle-lbl">IDLE</span></div>`;
      }
      const L=(s.start_time/W)*100,Wd=((s.end_time-s.start_time)/W)*100;
      h+=`<div class="tl-block ${sc(s._severity)}" style="left:${L}%;width:${Wd}%"
        title="${s.patient_id} | Sev ${s._severity} | ${s.start_time}–${s.end_time} | wait:${s._wait}min | risk:${s._risk}">${Wd>4?s.patient_id:''}</div>`;
      prevEnd=s.end_time;
    });
    h+='</div></div>';
  });
  document.getElementById('timeline').innerHTML=h;
}

// ═══════════════════════════════════════════
//  PLAYBACK — updates doctor status live
// ═══════════════════════════════════════════
function togglePlay(){
  if(playInterval){clearInterval(playInterval);playInterval=null;document.getElementById('pb-play').textContent='▶ Play';return;}
  if(playTime>=playMax)playTime=0;
  document.getElementById('pb-play').textContent='⏸ Pause';
  const spd=parseInt(document.getElementById('pb-speed').value);
  playInterval=setInterval(()=>{
    playTime++;updatePlayback(playTime);
    if(playTime>=playMax){clearInterval(playInterval);playInterval=null;document.getElementById('pb-play').textContent='▶ Play';}
  },spd*16);
}
function resetPlay(){if(playInterval){clearInterval(playInterval);playInterval=null;}playTime=0;document.getElementById('pb-play').textContent='▶ Play';document.getElementById('pb-slider').value=0;updatePlayback(0);}
function scrubTime(v){playTime=parseInt(v);updatePlayback(playTime);}
function updatePlayback(t){
  document.getElementById('pb-t').textContent=t;
  document.getElementById('pb-slider').value=t;
  const W=Math.max(playMax,1),pct=(t/W)*100;
  ['Doctor_T','Doctor_C','Doctor_G'].forEach(d=>{const c=document.getElementById('cur-'+d);if(c){c.style.left=pct+'%';c.style.opacity='1';}});
  renderDoctorStatus(t);
  document.getElementById('pb-waiting').textContent=patients.filter(p=>p.arrival_time<=t&&!schedule.find(s=>s.patient_id===p.patient_id&&s.start_time<=t)).length;
  document.getElementById('pb-treating').textContent=schedule.filter(s=>s.start_time<=t&&s.end_time>t).length;
  document.getElementById('pb-done').textContent=schedule.filter(s=>s.end_time<=t).length;
  document.getElementById('pb-risk').textContent=schedule.filter(s=>s.end_time<=t).reduce((sum,s)=>sum+s._risk,0);
}

// ═══════════════════════════════════════════
//  HEATMAP
// ═══════════════════════════════════════════
function renderHeatmap(totalRisk){
  const sorted=[...schedule].sort((a,b)=>b._risk-a._risk);
  const maxR=sorted[0]?._risk||1;
  const sc=sev=>sev>=5?'var(--red)':sev===4?'#ff7840':sev===3?'var(--amber)':sev===2?'#64c850':'var(--green)';
  const sl=sev=>['','Minimal','Minor','Moderate','Serious','Critical'][sev];
  let h='';
  sorted.forEach(s=>{
    const pct=totalRisk===0?0:Math.max(4,(s._risk/Math.max(maxR,1))*100);
    const c=sc(s._severity);
    h+=`<div class="heatmap-row">
      <span class="mono" style="font-size:.66rem;width:40px;color:var(--text2)">${s.patient_id}</span>
      <span style="width:6px;height:6px;border-radius:50%;background:${c};flex-shrink:0;display:inline-block;margin-right:4px"></span>
      <div class="hm-bar-wrap"><div class="hm-bar" style="width:${pct}%;background:${c}">
        ${pct>12?`<span style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;font-weight:700">${s._risk}</span>`:''}
      </div></div>
      <span class="hm-val">r=${s._risk}</span>
      <span class="hm-label" style="color:${c}">${sl(s._severity)}</span>
    </div>`;
  });
  document.getElementById('heatmap').innerHTML=h||'<div style="color:var(--text3);font-family:\'IBM Plex Mono\',monospace;font-size:.73rem;padding:14px">🎉 Zero risk — all patients treated immediately!</div>';
}

// ═══════════════════════════════════════════
//  AUTO CHARTS FROM CSV/DATA
// ═══════════════════════════════════════════
function buildPatientCharts(){
  if(!window.Chart||!patients.length){
    document.getElementById('vitals-chart-card').style.display='none';return;
  }
  document.getElementById('vitals-chart-card').style.display='';
  const isDark=htmlEl.getAttribute('data-theme')==='dark';
  const gridC=isDark?'rgba(255,255,255,.04)':'rgba(0,0,0,.06)';
  const textC=isDark?'#6b84aa':'#64748b';

  // Chart 1: Severity bar chart
  const sevCtx=document.getElementById('sev-chart').getContext('2d');
  if(sevChart)sevChart.destroy();
  const sevMap={1:0,2:0,3:0,4:0,5:0};
  patients.forEach(p=>sevMap[p.severity]=(sevMap[p.severity]||0)+1);
  sevChart=new Chart(sevCtx,{
    type:'bar',
    data:{
      labels:['1 — Minimal','2 — Minor','3 — Moderate','4 — Serious','5 — Critical'],
      datasets:[{
        label:'Patients',
        data:[sevMap[1],sevMap[2],sevMap[3],sevMap[4],sevMap[5]],
        backgroundColor:['rgba(34,197,94,.7)','rgba(234,179,8,.7)','rgba(249,115,22,.7)','rgba(239,68,68,.7)','rgba(220,38,38,.9)'],
        borderColor:['#22c55e','#eab308','#f97316','#ef4444','#dc2626'],
        borderWidth:1,borderRadius:6
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:600},
      plugins:{legend:{display:false},tooltip:{backgroundColor:isDark?'#0a0e1a':'#fff',borderColor:isDark?'#1a2238':'#cdd6ed',borderWidth:1,titleColor:textC,bodyColor:isDark?'#e2ecff':'#0d1530',titleFont:{family:"'IBM Plex Mono',monospace",size:10},bodyFont:{family:"'IBM Plex Mono',monospace",size:11}}},
      scales:{x:{grid:{color:gridC},ticks:{color:textC,font:{family:"'IBM Plex Mono',monospace",size:9}}},y:{grid:{color:gridC},ticks:{color:textC,font:{family:"'IBM Plex Mono',monospace",size:9},stepSize:1}}}}
  });

  // Chart 2: Scatter — arrival time vs treatment time, colored by severity
  const arrCtx=document.getElementById('arr-chart').getContext('2d');
  if(arrChart)arrChart.destroy();
  const colors5=['#22c55e','#eab308','#f97316','#ef4444','#dc2626'];
  const datasets=[1,2,3,4,5].map(sev=>({
    label:'Sev '+sev,
    data:patients.filter(p=>p.severity===sev).map(p=>({x:p.arrival_time,y:p.treatment_time,id:p.patient_id})),
    backgroundColor:colors5[sev-1]+'bb',borderColor:colors5[sev-1],pointRadius:6,pointHoverRadius:8
  }));
  arrChart=new Chart(arrCtx,{
    type:'scatter',
    data:{datasets},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:600},
      plugins:{legend:{display:true,labels:{color:textC,font:{family:"'IBM Plex Mono',monospace",size:9},boxWidth:10}},
        tooltip:{backgroundColor:isDark?'#0a0e1a':'#fff',borderColor:isDark?'#1a2238':'#cdd6ed',borderWidth:1,titleColor:textC,bodyColor:isDark?'#e2ecff':'#0d1530',titleFont:{family:"'IBM Plex Mono',monospace",size:10},bodyFont:{family:"'IBM Plex Mono',monospace",size:11},
          callbacks:{label:ctx=>`${ctx.raw.id} · Arrival:${ctx.raw.x}min · Treat:${ctx.raw.y}min`}}},
      scales:{x:{grid:{color:gridC},ticks:{color:textC,font:{family:"'IBM Plex Mono',monospace",size:9}},title:{display:true,text:'Arrival Time (min)',color:textC,font:{family:"'IBM Plex Mono',monospace",size:9}}},
        y:{grid:{color:gridC},ticks:{color:textC,font:{family:"'IBM Plex Mono',monospace",size:9}},title:{display:true,text:'Treatment Time (min)',color:textC,font:{family:"'IBM Plex Mono',monospace",size:9}}}}}
  });
}

function rebuildCharts(){if(schedule.length)buildPatientCharts();}

// ═══════════════════════════════════════════
//  JSON BUILD + RISK MISMATCH WARNING
// ═══════════════════════════════════════════
function buildJSON(risk){
  if(!schedule.length)return;
  const sortedSched=[...schedule].sort((a,b)=>a.start_time-b.start_time);
  _jsonOutput={
    treatments:sortedSched.map(s=>({patient_id:s.patient_id,doctor_id:s.doctor_id,start_time:s.start_time,end_time:s.end_time})),
    estimated_total_risk:risk
  };
  const recomputed=sortedSched.reduce((sum,s)=>{
    const p=patients.find(x=>x.patient_id===s.patient_id);
    return sum+(p?s._severity*(s.start_time-p.arrival_time):0);
  },0);
  const mismatch=document.getElementById('risk-mismatch-warn');
  if(Math.abs(recomputed-risk)>0){
    _jsonOutput.estimated_total_risk=recomputed;
    mismatch.className='warn-banner';mismatch.classList.remove('hidden');
    mismatch.innerHTML='⚠️ Risk mismatch auto-corrected: '+risk+' → '+recomputed;
  } else {
    mismatch.className='ok-banner';mismatch.classList.remove('hidden');
    mismatch.innerHTML='✅ estimated_total_risk = '+risk+' verified correct.';
  }
  document.getElementById('empty-json').classList.add('hidden');
  document.getElementById('json-wrap').classList.remove('hidden');
  const raw=JSON.stringify(_jsonOutput,null,2)
    .replace(/"([^"]+)":/g,'<span class="jk">"$1"</span>:')
    .replace(/: "([^"]+)"/g,': <span class="js">"$1"</span>')
    .replace(/: (\d+)/g,': <span class="jn">$1</span>');
  document.getElementById('json-out').innerHTML=raw;
}

// ═══════════════════════════════════════════
//  REPORT JSON — detailed schedule report
// ═══════════════════════════════════════════
let _reportOutput = null;
function buildReport(risk){
  if(!schedule.length)return;
  const makespan=Math.max(...schedule.map(s=>s.end_time));
  const avgWait=Math.round(schedule.reduce((a,b)=>a+b._wait,0)/schedule.length*10)/10;
  const sortedSched=[...schedule].sort((a,b)=>a.start_time-b.start_time);
  _reportOutput={
    report:{
      generated_by:user.fullName||user.fname,
      role:user.role,
      hospital:user.hospital,
      generated_at:new Date().toISOString(),
      total_patients:patients.length,
      total_er_risk:risk,
      avg_wait_minutes:avgWait,
      makespan_minutes:makespan,
      zero_wait_patients:schedule.filter(s=>s._wait===0).length,
      critical_patients:schedule.filter(s=>s._severity===5).length,
      algorithm:'Optimized Priority Greedy + Local Swap Improvement'
    },
    doctor_summary:{
      Doctor_T:{patients_treated:schedule.filter(s=>s.doctor_id==='Doctor_T').length,specialization:'TRAUMA'},
      Doctor_C:{patients_treated:schedule.filter(s=>s.doctor_id==='Doctor_C').length,specialization:'CARDIO'},
      Doctor_G:{patients_treated:schedule.filter(s=>s.doctor_id==='Doctor_G').length,specialization:'GENERAL (any)'}
    },
    schedule_details:sortedSched.map(s=>({
      patient_id:s.patient_id,
      patient_name:s._name,
      severity:s._severity,
      specialization:s._spec,
      doctor_id:s.doctor_id,
      arrival_time:s._arrival,
      start_time:s.start_time,
      end_time:s.end_time,
      wait_time:s._wait,
      patient_risk:s._risk
    }))
  };
  document.getElementById('empty-report').classList.add('hidden');
  document.getElementById('report-wrap').classList.remove('hidden');
  const raw=JSON.stringify(_reportOutput,null,2)
    .replace(/"([^"]+)":/g,'<span class="jk">"$1"</span>:')
    .replace(/: "([^"]+)"/g,': <span class="js">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g,': <span class="jn">$1</span>');
  document.getElementById('report-out').innerHTML=raw;
}

function dlJSON(){if(!_jsonOutput){toast('Run schedule first','e');return;}dl(JSON.stringify(_jsonOutput,null,2),'application/json','submission.json');toast('submission.json downloaded','s');}
function copyJSON(){if(!_jsonOutput)return;navigator.clipboard.writeText(JSON.stringify(_jsonOutput,null,2)).then(()=>toast('Copied','s')).catch(()=>toast('Failed','e'));}
function dlReport(){if(!_reportOutput){toast('Run schedule first','e');return;}dl(JSON.stringify(_reportOutput,null,2),'application/json','smarttriage_report.json');toast('Report downloaded','s');}
function copyReport(){if(!_reportOutput)return;navigator.clipboard.writeText(JSON.stringify(_reportOutput,null,2)).then(()=>toast('Copied','s')).catch(()=>toast('Failed','e'));}

// ═══════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════
function dl(c,t,n){
  const blob=new Blob([c],{type:t});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=n;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
}
function toast(msg,type='i'){
  const icons={s:'✅',e:'❌',i:'ℹ️',w:'⚠️'};
  const el=document.createElement('div');el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{el.style.cssText='opacity:0;transform:translateX(30px);transition:.3s';setTimeout(()=>el.remove(),300);},3500);
}

// Chart.js
(function(){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';s.onload=()=>{window._chartJSReady=true;};document.head.appendChild(s);})();

document.getElementById('f-id').placeholder=nextPid();
