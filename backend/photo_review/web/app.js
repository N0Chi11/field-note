'use strict';
const $ = id => document.getElementById(id);
const token = document.body.dataset.token;
const base = document.body.dataset.basePath ?? '/photo-review';
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embedded');
const labels = {keep:'首选保留',reserve:'可用备选',reject:'不推荐',error:'分析失败',pending:'待审核 / 比较'};
const english = {keep:'KEEP',reserve:'RESERVE',reject:'REJECT',error:'ERROR',pending:'PENDING'};
let state = {photos:[],job:{state:'idle'},options:{threshold:.92,mode:'event'}};
let filter='all', busy=false, selected=new Set(), detailId=null, fingerprint='', faceFingerprint='', initialized=false, cloudDirty=false;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
async function request(path,body,raw=false){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'X-Liuguang-Token':token,...(body===undefined||raw?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:raw?body:JSON.stringify(body)});
  if(!response.ok){let message='操作失败';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
  return response;
}
async function action(path,body={}){if(busy)return;busy=true;notice('');controls();try{const r=await request(path,body);const data=await r.json();if(data.errors?.length)notice(data.errors.join('\n'));await refresh();}catch(e){notice(e.message);}finally{busy=false;controls();}}
const modelLabels={'auto':'Kimi · 自动选择视觉模型','kimi-k3':'Kimi K3','kimi-k2.6':'Kimi K2.6','kimi-k2.7-code':'Kimi K2.7 Code','kimi-k2.7-code-highspeed':'Kimi K2.7 Code 高速版'};
function cloudSource(photo){const review=photo.metrics?.cloud_review;if(photo.cloud_status==='running')return (modelLabels[state.cloud?.model]||'Kimi')+' 审核中';if(photo.cloud_status==='error')return '联网审核未完成';if(review){const label=modelLabels[review.model]||'Kimi';return label+(review.signature===state.cloud?.signature&&review.mode===state.options.mode?' 联网审核':' · 先前设置的结果');}return photo.metrics?'旧本地结果 · 仅参考':'尚未经过 Kimi 审核';}
function preview(id){const path=base+'/preview/'+encodeURIComponent(id);return base?path:path+'?token='+encodeURIComponent(token);}
function facePreview(id,index){const path=base+'/face/'+encodeURIComponent(id)+'/'+index;return base?path:path+'?token='+encodeURIComponent(token);}
const eyeLabels={open:'睁眼',closed:'闭眼风险',narrow:'眯眼 / 半闭眼',downcast:'低头 / 向下看',occluded:'眼部遮挡',uncertain:'眼部未判清'};
function eyeSummary(metrics){
  if(metrics.cloud_review){
    const faces=metrics.cloud_review.faces||[],important=faces.filter(f=>f.role!=='background'),background=faces.filter(f=>f.role==='background');
    const counts={};for(const face of important)counts[face.eye_state]=(counts[face.eye_state]||0)+1;
    const parts=['closed','narrow','downcast','open','occluded','uncertain'].filter(key=>counts[key]).map(key=>counts[key]+'人'+eyeLabels[key]);
    const summary=parts.length?'主体 / 重要人物：'+parts.join('；'):'未提供可评估的主体人脸编号，详情中说明';
    return summary+(background.length?'；另有 '+background.length+' 名背景人物，详见逐人结果':'');
  }
  const counts=metrics.eye_counts||{};
  if(!metrics.eye_counts){for(const f of metrics.faces||[]){const key=eyeLabels[f.eye_state]?f.eye_state:'uncertain';counts[key]=(counts[key]||0)+1;}counts.closed=Math.max(counts.closed||0,metrics.closed_eyes||0);}
  const parts=['closed','narrow','downcast','open','uncertain'].filter(key=>counts[key]).map(key=>counts[key]+'人'+eyeLabels[key]);
  return parts.length?parts.join('；'):'未找到可评估人脸';
}
function qualitySummary(photo){if(photo.cloud_error)return photo.cloud_error;const m=photo.metrics,review=m?.cloud_review;if(!review)return '尚未经过 Kimi 审核';return review.summary;}
function openFace(photo,index){const face=photo.metrics.faces[index];$('face-name').textContent=photo.name+' · 人脸 '+(index+1)+' · '+(eyeLabels[face.eye_state]||eyeLabels.uncertain);$('face-image').src=facePreview(photo.id,index);$('face-reason').textContent=face.eye_reason||'眼部信号不足';$('face-detail').showModal();}
function updateFaces(photo){
  const faces=photo.metrics?.faces||[];const next=JSON.stringify([photo.id,faces]);
  $('detail-eyes-summary').textContent=photo.metrics?.cloud_review?eyeSummary(photo.metrics):'以下为旧本地结果，尚未经过 Kimi 审核';
  if(next===faceFingerprint)return;faceFingerprint=next;
  $('detail-faces').replaceChildren();faces.forEach((face,index)=>{const card=el('button','face-card '+face.eye_state);card.type='button';const img=el('img');img.src=facePreview(photo.id,index);img.alt='人脸 '+(index+1);img.loading='lazy';card.append(img,el('b','','人脸 '+(index+1)+' · '+(eyeLabels[face.eye_state]||eyeLabels.uncertain)));if(face.eye_role){card.append(el('span','',({primary:'主体',secondary:'重要人物',background:'背景人物'}[face.eye_role]||'')+' · '+({high:'证据较充分',medium:'证据一般',low:'证据不足'}[face.eye_confidence]||'')));}card.append(el('span','',face.eye_reason||'眼部信号不足'));card.onclick=()=>openFace(photo,index);$('detail-faces').append(card);});
}
function controls(){const running=state.job.state==='running';for(const id of ['files','reset','start','mode','threshold','merge','split','export'])$(id).disabled=busy||running;
  $('start').disabled=busy||running||!state.photos.length;$('stop').hidden=!running;$('stop').disabled=busy;
  $('start-selected').disabled=busy||running||!selected.size;
  for(const id of ['cloud-save','cloud-region','cloud-model','cloud-key','cloud-effort','cloud-instructions'])$(id).disabled=busy||running;
  const serverKey=state.cloud?.key_source==='server';$('cloud-forget').disabled=busy||running||serverKey;$('cloud-forget').textContent=serverKey?'由服务器安全配置':'清除本次密钥';
  $('cloud-key').placeholder=serverKey?'留空使用服务器密钥；也可临时输入新密钥':'可由服务器配置，或仅在本次运行中临时输入';
  const alwaysDetailed=$('cloud-model').value.startsWith('kimi-k2.7');
  $('cloud-effort').disabled=busy||running||alwaysDetailed;
  $('cloud-effort-note').textContent=alwaysDetailed?'此模型始终进行详细审阅。':'详细审阅通常会增加等待时间和用量。';
  $('export').disabled=busy||running||!state.photos.some(p=>p.status==='keep');
  $('merge').disabled=busy||running||selected.size<2;$('split').disabled=busy||running||!selected.size;
  document.querySelectorAll('[data-mark]').forEach(b=>b.disabled=busy||running);
  $('start').textContent=(state.job.state==='error'||state.job.state==='stopped'?'继续联网审核全部':'联网审核全部')+'（'+state.photos.length+' 张）';
  $('start-selected').textContent='联网审核勾选照片（'+selected.size+' 张）';
  $('cloud-key-status').textContent=serverKey?'已从服务器环境变量安全读取；密钥不会发送到浏览器或代码仓库。':state.cloud?.configured?'已配置临时密钥，仅在服务端内存中使用。':'尚未配置；可由服务器管理员写入 .env。';
  const available=state.cloud?.available_models||[];
  const supported=available.filter(name=>modelLabels[name]);
  $('cloud-model-list').textContent=!state.cloud?.configured?'保存密钥后显示平台返回的模型。不会自动提交照片。':supported.length?'平台已列出：'+supported.map(name=>modelLabels[name]).join('、')+'。具体调用权限与余额以照片请求为准。':'平台返回：'+(available.slice(0,8).join('、')||'空列表')+'。没有列出上述视觉模型，仍可手动选择并审核一张确认。';
  const reviewed=state.photos.filter(p=>p.metrics?.cloud_review).length;
  $('review-coverage').textContent='Kimi 已审核 '+reviewed+' / '+state.photos.length+' 张；尚未联网审核的旧结果仅供参考。';
  $('selected-count').textContent='已勾选 '+selected.size+' 张';
}
function render(){
  $('stats').replaceChildren();for(const status of Object.keys(labels)){const count=state.photos.filter(p=>p.status===status).length;const button=el('button','stat');button.append(el('span','',labels[status]),el('b','',String(count)),el('small','',english[status]));button.onclick=()=>{filter=status;render();};$('stats').append(button);}
  $('filters').replaceChildren();for(const status of ['all',...Object.keys(labels)]){const button=el('button',filter===status?'active':'',status==='all'?'全部 '+state.photos.length:labels[status]);button.onclick=()=>{filter=status;render();};$('filters').append(button);}
  const photos=state.photos.filter(p=>filter==='all'||p.status===filter);
  if($('sort').value==='group')photos.sort((a,b)=>(a.group??1e6)-(b.group??1e6)||(a.rank??1e6)-(b.rank??1e6));
  if($('sort').value==='score')photos.sort((a,b)=>(b.score??-1)-(a.score??-1));
  $('grid').replaceChildren();for(const p of photos){
    const card=el('article','card'),wrap=el('div','photo-wrap'),button=el('button','photo-open'),img=el('img');img.src=preview(p.id);img.alt=p.name;img.loading='lazy';button.append(img);button.onclick=()=>openDetail(p.id);
    const check=el('input');check.type='checkbox';check.checked=selected.has(p.id);check.setAttribute('aria-label','勾选 '+p.name);check.onchange=()=>{check.checked?selected.add(p.id):selected.delete(p.id);controls();};
    wrap.append(button,el('span','badge '+p.status,(p.metrics?.cloud_review?'':p.metrics?'旧本地 · ':'')+(labels[p.status]||p.status)),check);
    const head=el('div','card-head');head.append(el('b','',p.name),el('span','',p.metrics?.cloud_review&&p.score!=null?p.score.toFixed(1):'—'));
    const waiting=p.metrics?.cloud_review&&p.auto_status==='pending';
    card.append(wrap,head,el('p','source',cloudSource(p)),el('p','quality',qualitySummary(p)),el('div','group',p.group?'组 '+String(p.group).padStart(2,'0')+(!waiting&&p.rank?' / 第 '+p.rank+' 名':' / 等待同组比较'):'等待审核和分组'));$('grid').append(card);
  }
  $('empty').hidden=photos.length>0;$('empty').querySelector('h3').textContent=state.photos.length?'当前分类没有照片':'从一组照片开始';controls();
  if(detailId)updateDetail();
}
function updateDetail(){const p=state.photos.find(p=>p.id===detailId);if(!p){$('detail').close();detailId=null;return;}
  $('detail-name').textContent=p.name;$('detail-image').src=preview(p.id);$('detail-badge').textContent=labels[p.status];$('detail-badge').className='badge '+p.status;
  $('detail-source').textContent=cloudSource(p);$('detail-score').textContent=p.metrics?.cloud_review&&p.score!=null?'Kimi 发布适用分 '+p.score.toFixed(1)+' / 100':'旧分数仅供参考，等待联网审核';const reasons=p.metrics?.cloud_review?p.reasons:['尚未经过 Kimi 审核。以下是旧本地判断，不能作为新模型的效果依据。',...(p.reasons||[])];$('detail-reasons').replaceChildren(...reasons.map(r=>el('li','',r)));updateFaces(p);}
function openDetail(id){detailId=id;updateDetail();$('detail').showModal();}
async function refresh(){const data=await(await request('/api/state')).json();state=data;
  if(!initialized){$('mode').value=data.options.mode;$('threshold').value=data.options.threshold;$('threshold-value').textContent=Number(data.options.threshold).toFixed(2);$('cloud-region').value=data.cloud.region;$('cloud-model').value=data.cloud.model;$('cloud-effort').value=data.cloud.effort;$('cloud-instructions').value=data.cloud.instructions;$('cloud-save-message').textContent=data.cloud.connection_note||'';initialized=true;}
  $('message').textContent=data.job.message;$('progress-count').textContent=data.job.done+' / '+data.job.total;$('progress').max=Math.max(1,data.job.total);$('progress').value=data.job.done;$('device').textContent=data.job.device;
  for(const id of selected)if(!data.photos.some(p=>p.id===id))selected.delete(id);
  const next=JSON.stringify([data.photos,data.cloud.signature,data.options.mode]);if(next!==fingerprint){fingerprint=next;render();}else controls();
}
async function refreshProgress(){const data=await(await request('/api/progress')).json();state.job=data.job;
  $('message').textContent=data.job.message;$('progress-count').textContent=data.job.done+' / '+data.job.total;$('progress').max=Math.max(1,data.job.total);$('progress').value=data.job.done;$('device').textContent=data.job.device;controls();
}
$('files').onclick=()=>$('file-input').click();
$('file-input').onchange=async event=>{if(busy)return;busy=true;controls();notice('');const errors=[];const files=Array.from(event.target.files);try{for(let i=0;i<files.length;i++){$('message').textContent='正在导入 '+(i+1)+' / '+files.length;try{const r=await request('/api/upload?name='+encodeURIComponent(files[i].name),files[i],true);errors.push(...(await r.json()).errors);}catch(e){errors.push(files[i].name+'：'+e.message);}}await refresh();if(errors.length)notice(errors.join('\n'));}finally{busy=false;event.target.value='';controls();}};
$('threshold').oninput=()=>$('threshold-value').textContent=Number($('threshold').value).toFixed(2);
async function saveCloud(){if(busy)return false;busy=true;notice('');$('cloud-save-message').textContent='正在验证 Kimi 密钥并读取模型列表，不发送照片……';controls();try{const body={region:$('cloud-region').value,model:$('cloud-model').value,effort:$('cloud-effort').value,instructions:$('cloud-instructions').value};if($('cloud-key').value.trim())body.api_key=$('cloud-key').value.trim();const data=await(await request('/api/cloud/config',body)).json();$('cloud-key').value='';cloudDirty=false;$('cloud-save-message').textContent=data.message;await refresh();$('cloud-model').value=state.cloud.model;return true;}catch(e){$('cloud-save-message').textContent=e.message;notice(e.message);return false;}finally{busy=false;controls();}}
async function runCloud(ids){if(busy)return;if(cloudDirty||$('cloud-key').value.trim()){if(!await saveCloud())return;}if(!state.cloud?.configured){notice('请先在左侧 Kimi 设置中填写 API 密钥，并检查连接。');$('cloud-key').focus();return;}await action('/api/cloud/start',{ids,threshold:Number($('threshold').value),mode:$('mode').value});}
$('cloud-save').onclick=saveCloud;$('cloud-forget').onclick=()=>action('/api/cloud/forget');
for(const id of ['cloud-region','cloud-model','cloud-effort','cloud-instructions'])$(id).addEventListener('input',()=>{cloudDirty=true;$('cloud-save-message').textContent='设置尚未保存，开始审核时会先检查连接。';controls();});
$('start').onclick=()=>runCloud(null);$('start-selected').onclick=()=>runCloud([...selected]);$('stop').onclick=()=>action('/api/stop');
$('reset').onclick=()=>{if(confirm('新建批次？会删除服务器保存的照片副本、预览和本批次审核结果；你电脑里的原图不受影响。重新上传后再次联网审核可能产生费用。')){selected.clear();action('/api/reset');}};
$('merge').onclick=()=>action('/api/merge',{ids:[...selected]});$('split').onclick=()=>action('/api/split',{ids:[...selected]});$('clear-selection').onclick=()=>{selected.clear();render();};$('sort').onchange=render;
$('close-detail').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>{detailId=null;faceFingerprint='';if($('face-detail').open)$('face-detail').close();});$('close-face').onclick=()=>$('face-detail').close();
document.querySelectorAll('[data-mark]').forEach(button=>button.onclick=()=>action('/api/mark',{id:detailId,status:button.dataset.mark==='auto'?null:button.dataset.mark}));
$('export').onclick=async()=>{if(busy)return;busy=true;controls();notice('');try{const blob=await(await request('/api/export',{})).blob();const url=URL.createObjectURL(blob);const link=el('a');link.href=url;link.download='你拍的照片怎么样-首选原图.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){notice(e.message);}finally{busy=false;controls();}};
async function poll(){try{if(!busy){if(state.job.state==='running'){await refreshProgress();if(state.job.state!=='running')await refresh();}else await refresh();}}catch(e){notice('无法连接审核服务：'+e.message+'。请稍后重试。');}finally{setTimeout(poll,state.job.state==='running'?1200:4000);}}poll();
