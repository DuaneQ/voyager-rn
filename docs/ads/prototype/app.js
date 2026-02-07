(function(){
  const qs = s => document.querySelector(s);
  const views = {home:qs('#view-home'), campaigns:qs('#view-campaigns'), create:qs('#view-create'), reports:qs('#view-reports')};
  const navMap = { '#nav-home': 'home', '#nav-campaigns':'campaigns', '#nav-create':'create', '#nav-reports':'reports' };
  Object.keys(navMap).forEach(id=>{ const el = qs(id); if(el) el.addEventListener('click',()=>showView(navMap[id])); });
  qs('#start-create').addEventListener('click',()=>showView('create'));
  qs('#view-campaigns-cta').addEventListener('click',()=>showView('campaigns'));
  qs('#create-from-list').addEventListener('click',()=>showView('create'));

  function showView(name){ Object.values(views).forEach(v=>v.classList.add('hidden')); views[name].classList.remove('hidden'); if(name==='campaigns') renderCampaigns(); if(name==='reports') renderReports(); }

  // Sample data
  const campaigns = [ {id:'c1', name:'Summer Promo', status:'active', objective:'Traffic', start:'2026-03-01', end:'2026-03-15', spend:120.50, impressions:52300, clicks:220} , {id:'c2', name:'Beta Launch', status:'in_review', objective:'Awareness', start:'2026-02-15', end:'2026-02-28', spend:0, impressions:0, clicks:0} ];

  function renderCampaigns(){ const el = qs('#campaign-list'); el.innerHTML=''; campaigns.forEach(c=>{ const card=document.createElement('div'); card.className='campaign-card'; const statusClass = (s=>({draft:'draft', in_review:'pending', active:'active', paused:'pending', rejected:'rejected', completed:'draft'})(c.status) || 'draft'); card.innerHTML=`<div><strong>${c.name}</strong><div style="font-size:12px;color:#6b7280">${c.objective} • ${c.start} → ${c.end}</div></div><div style="text-align:right"><div class="status ${statusClass}">${formatStatus(c.status)}</div><div style="margin-top:8px"><button data-action="edit" data-id="${c.id}">Edit</button> <button data-action="report" data-id="${c.id}">Report</button></div></div>`; el.appendChild(card); });
    // add empty state
    if(campaigns.length===0) el.innerHTML='<p>No campaigns yet — create your first campaign.</p>';
  }

  function formatStatus(s){ switch(s){ case 'in_review': return 'In review'; case 'active': return 'Active'; case 'paused': return 'Paused'; case 'rejected': return 'Rejected'; case 'completed': return 'Completed'; default: return 'Draft'; } }

  // Create flow state
  const form = qs('#create-form'); let step=1; const totalSteps=5;
  const nextBtn = qs('#next-step'); const prevBtn = qs('#prev-step'); const saveDraftBtn = qs('#save-draft');
  qs('#next-step').addEventListener('click', ()=>{ if(step<totalSteps){ if(advance(step+1)) { step++; updateStepper(); } } });
  qs('#prev-step').addEventListener('click', ()=>{ if(step>1){ step--; updateStepper(); } else showView('campaigns'); });
  saveDraftBtn.addEventListener('click', saveDraft);
  function updateStepper(){ qsAll('.step').forEach(s=>s.classList.remove('active')); qs(`.step[data-step="${step}"]`).classList.add('active'); qsAll('.step-panel').forEach(p=>p.classList.add('hidden')); qs(`.step-panel[data-step="${step}"]`).classList.remove('hidden'); validateStep(); }
  function qsAll(sel){ return Array.from(document.querySelectorAll(sel)); }

  function advance(next){ // validation
    if(!validateStep()) return false;
    if(next===5) populateReview();
    step = next; return true;
  }

  function validateStep(){ const panel = qs(`.step-panel[data-step="${step}"]`); const required = Array.from(panel.querySelectorAll('[required]'));
    for(const r of required){ if(!r.value){ nextBtn.disabled=true; return false; } }
    // additional checks
    if(step===1){ const sd = form.querySelector('[name=startDate]').value; const ed = form.querySelector('[name=endDate]').value; if(ed && sd && new Date(ed) < new Date(sd)){ nextBtn.disabled=true; return false; } }
    if(step===2){ const placement = form.querySelector('[name=placement]:checked').value; if(['video_feed','itinerary_feed'].includes(placement)){ const asset = panel.querySelector('[name=asset]').files; if(!asset || asset.length===0){ nextBtn.disabled=true; return false; } } }
    if(step===5){ const agree = panel.querySelector('[name=agreePolicy]'); if(agree && !agree.checked){ nextBtn.disabled=true; return false; } }
    nextBtn.disabled=false; return true; }

  // bind change events to validate as user types
  form.addEventListener('input', ()=>validateStep());

  // Asset preview
  qs('input[name="asset"]').addEventListener('change', (e)=>{ const p = qs('#asset-preview'); p.innerHTML=''; const f = e.target.files && e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); if(f.type.startsWith('image/')){ const img = document.createElement('img'); img.src=url; img.style.maxWidth='200px'; p.appendChild(img);} else { const vid = document.createElement('video'); vid.src=url; vid.controls=true; vid.style.maxWidth='300px'; p.appendChild(vid); } validateStep(); });

  // update creative specs when placement or creative type changes
  qsAll('[name=placement]').forEach(r=>r.addEventListener('change', updateSpecs));
  qs('[name=creativeType]').addEventListener('change', updateSpecs);
  function updateSpecs(){ const placement = form.querySelector('[name=placement]:checked').value; const type = form.querySelector('[name=creativeType]').value; const s = qs('#creative-specs'); if(type==='video' && placement==='video_feed'){ s.textContent='Recommended: 9:16 (1080×1920), MP4 H.264, max 50MB, max 60s.' } else if(type==='video'){ s.textContent='Recommended: 16:9 or 3:2 MP4 H.264, max 50MB.' } else { s.textContent='Recommended: JPG/PNG/WebP max 5MB. Use 1:1 for inline placements.' } }

  function populateReview(){ const data = new FormData(form); const summary = {}; for(const [k,v] of data.entries()) summary[k]=v; const out = qs('#review-summary'); out.innerHTML = `<strong>${summary.name}</strong><div>${summary.objective} • ${summary.startDate} → ${summary.endDate || '—'}</div><div style="margin-top:8px"><strong>Creative:</strong> ${summary.creativeName || '—'} (${summary.creativeType})</div><div><strong>Audience:</strong> ${summary.audienceName || '—'} • ${summary.locations || ''}</div><div style="margin-top:8px"><strong>Budget:</strong> ${summary.budgetType} $${summary.budgetAmount}</div>`; }

  // Submit campaign
  qs('#submit-campaign').addEventListener('click', ()=>{
    const agree = form.querySelector('[name=agreePolicy]'); if(!agree || !agree.checked){ alert('You must agree to the advertising policy.'); return; }
    const data = new FormData(form); const camp = { id:'c'+(campaigns.length+1), name:data.get('name'), status:'in_review', objective:data.get('objective'), start:data.get('startDate'), end:data.get('endDate'), spend:0, impressions:0, clicks:0 };
    campaigns.push(camp);
    alert('Campaign submitted — status: In review'); showView('campaigns'); renderCampaigns();
  });

  function saveDraft(){ const data = new FormData(form); const camp = { id:'c'+(campaigns.length+1), name:data.get('name')||'Untitled', status:'draft', objective:data.get('objective')||'Awareness', start:data.get('startDate')||'', end:data.get('endDate')||'', spend:0, impressions:0, clicks:0 }; campaigns.push(camp); alert('Draft saved'); showView('campaigns'); renderCampaigns(); }

  // Reports
  function renderReports(){ const r = qs('#reports-list'); const totals = campaigns.reduce((acc,c)=>{acc.impr += c.impressions; acc.clicks += c.clicks; acc.spend += c.spend; return acc;},{impr:0,clicks:0,spend:0}); qs('#kpi-impr').textContent=totals.impr; qs('#kpi-clicks').textContent=totals.clicks; qs('#kpi-spend').textContent='$'+totals.spend.toFixed(2); r.innerHTML = '<div class="report-controls"><label>Filter by campaign <select id="report-campaign-filter"><option value="all">All campaigns</option>'+campaigns.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')+'</select></label><div class="date-presets"><button data-range="7">Last 7</button><button data-range="30">Last 30</button></div></div><div class="report-body"><p>Reporting breakdowns and charts would appear here in the production UI. Use campaign filter and date presets to drill down.</p></div>' }

  // wire up header nav elements
  Object.keys(navMap).forEach(k=>{ const el = qs(k); if(el) el.addEventListener('click',()=>{ showView(navMap[k]); }) });

  // init
  renderCampaigns(); showView('home'); updateStepper();
})();