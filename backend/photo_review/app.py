from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
from datetime import datetime
from http.cookies import SimpleCookie
import copy, hashlib, io, json, logging, os, secrets, shutil, socket, sqlite3
import subprocess, sys, tempfile, threading, time, traceback, uuid, webbrowser, zipfile
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from contextlib import contextmanager
from jose import JWTError, jwt
from PIL import Image
from engine import PIPELINE, LocalModels, open_photo, register_heif, reusable_visual, face_crop_bounds
from selection import select, assign_group
from selection import describe, rank_score, group_candidates, automatic_rejection
from cloud_review import DEFAULT_CONFIG, CLOUD_PIPELINE, CLOUD_PROMPT_VERSION, MODEL_LABELS, model_label, CloudReviewError, KimiReviewer, PhotoPreparer, validate_config, review_signature, check_key, apply_review

ROOT = Path(__file__).resolve().parent
FORMATS = {'.jpg','.jpeg','.png','.webp','.heic','.heif','.tif','.tiff'}
# Per-user pools are isolated, but the service-wide provider concurrency stays
# bounded so several administrators cannot overwhelm the ECS or API quota.
CLOUD_REVIEW_SLOTS = threading.BoundedSemaphore(2)


def get_data_root():
    configured = os.environ.get('LIUGUANG_DATA_DIR')
    if configured:
        return Path(configured).expanduser().resolve()
    if sys.platform == 'win32':
        base = Path(os.environ.get('LOCALAPPDATA', Path.home()/'AppData'/'Local'))
    elif sys.platform == 'darwin':
        base = Path.home()/'Library'/'Application Support'
    else:
        base = Path(os.environ.get('XDG_DATA_HOME', Path.home()/'.local'/'share'))
    return base/'Liuguang'


def choose_folder():
    if sys.platform == 'win32':
        script = '''Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = '选择照片文件夹'
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($d.SelectedPath) }
$d.Dispose()'''
        encoded = __import__('base64').b64encode(script.encode('utf-16-le')).decode('ascii')
        result = subprocess.run(['powershell.exe','-NoProfile','-STA','-EncodedCommand',encoded],
                                capture_output=True, timeout=300)
        if result.returncode: raise RuntimeError('打开目录选择窗口失败，请改用选择照片按钮。')
        return result.stdout.decode('utf-8').strip().lstrip('\ufeff')
    if sys.platform == 'darwin':
        script = 'POSIX path of (choose folder with prompt "选择照片文件夹")'
        result = subprocess.run(['osascript','-e',script],capture_output=True,text=True,timeout=300)
        if result.returncode:
            if result.returncode == 1 and 'User canceled' in result.stderr:
                return ''
            raise RuntimeError('打开目录选择窗口失败，请改用选择照片按钮。')
        return result.stdout.strip()
    if sys.platform.startswith('linux'):
        if shutil.which('zenity'):
            command = ['zenity','--file-selection','--directory','--title=选择照片文件夹']
        elif shutil.which('kdialog'):
            command = ['kdialog','--getexistingdirectory',str(Path.home()),'选择照片文件夹']
        else:
            raise RuntimeError('未找到系统目录选择器；请安装 zenity 或 kdialog，或改用选择照片按钮。')
        result = subprocess.run(command,capture_output=True,text=True,timeout=300)
        if result.returncode:
            if result.returncode == 1:
                return ''
            raise RuntimeError('打开目录选择窗口失败，请改用选择照片按钮。')
        return result.stdout.strip()
    raise RuntimeError('当前系统暂不支持目录选择，请改用选择照片按钮。')


class Workspace:
    def __init__(self, root=ROOT, model_factory=LocalModels, data_root=None):
        self.root, self.model_factory = Path(root), model_factory
        self.data = Path(data_root) if data_root else self.root/'data'
        for name in ['previews','uploads','exports','models']:
            (self.data/name).mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.import_lock = threading.Lock()
        self.face_preview_lock = threading.Lock()
        self.preparer_lock = threading.Lock()
        self.cancel = threading.Event()
        self.models = None
        self.db_path = self.data/'liuguang.sqlite'
        with self.db() as db:
            db.execute('CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, payload TEXT NOT NULL)')
            self.photos = {row[0]:json.loads(row[1]) for row in db.execute('SELECT id,payload FROM photos')}
            saved_options=db.execute('SELECT payload FROM settings WHERE key=?',('options',)).fetchone()
            saved_cloud=db.execute('SELECT payload FROM settings WHERE key=?',('cloud',)).fetchone()
        migrated = False
        for photo in self.photos.values():
            old_key = photo.get('cache_key', '')
            metrics_pipeline = (photo.get('metrics') or {}).get('pipeline')
            if not old_key.startswith(PIPELINE+':') or (photo.get('metrics') and metrics_pipeline != PIPELINE):
                photo['previous_metrics'] = reusable_visual(photo.get('metrics') or photo.get('previous_metrics'))
                digest = old_key.rsplit(':', 1)[-1] if ':' in old_key else photo['id']
                photo['cache_key'] = PIPELINE+':'+digest
                photo.update(metrics=None, status='pending', group=None, score=None, rank=None,
                             auto_status=None, reasons=['新版画质审核待处理'])
                migrated = True
        if migrated:
            self.persist_all()
        self.job = dict(state='idle', message='选择一批照片开始选片', done=0, total=0, device='模型未加载')
        if any(p['status']=='pending' for p in self.photos.values()):
            self.job['message'] = '还有未完成的照片，点击开始选片可继续'
        self.options = json.loads(saved_options[0]) if saved_options else dict(threshold=.92, mode='event')
        self.cloud = validate_config(json.loads(saved_cloud[0]) if saved_cloud else DEFAULT_CONFIG)
        self.environment_cloud_key = os.environ.get('MOONSHOT_API_KEY','').strip()
        self.cloud_key = self.environment_cloud_key
        self.cloud_key_source = 'server' if self.environment_cloud_key else ''
        self.cloud_models = []
        self.cloud_connection_note = ('已从服务器环境变量加载 Kimi 密钥；点击“保存并检查连接”验证。' if self.cloud_key else '')
        if self.cloud['model']=='auto':
            self.cloud['model']='kimi-k2.6'
        self.preparer = None
        self.job['message'] = 'Kimi 已就绪，选择照片开始联网审核；旧本地结果仅供参考' if self.cloud_key else '填写 Kimi 密钥，选择照片开始联网审核；旧本地结果仅供参考'
        self.job['device'] = 'Kimi · 等待配置密钥' if not self.cloud_key else model_label(self.cloud['model'])+' · 密钥已配置'
        if any((p.get('metrics') or {}).get('cloud_review') for p in self.photos.values()):
            self.update_cloud_groups()
            self.persist_all()

    @contextmanager
    def db(self):
        connection=sqlite3.connect(self.db_path,timeout=30)
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def save(self, p):
        with self.db() as db:
            db.execute('INSERT OR REPLACE INTO photos VALUES (?,?)',(p['id'],json.dumps(p,ensure_ascii=False)))

    def persist_all(self):
        with self.db() as db:
            db.executemany('INSERT OR REPLACE INTO photos VALUES (?,?)',
                           [(p['id'],json.dumps(p,ensure_ascii=False)) for p in self.photos.values()])

    def snapshot(self):
        with self.lock:
            pictures = copy.deepcopy(list(self.photos.values()))
            for p in pictures:
                p.pop('path',None)
                p.pop('cache_key',None)
                p.pop('previous_metrics',None)
                p.pop('grouping',None)
                p.pop('group_manual',None)
                if p.get('metrics'):
                    p['metrics'].pop('embedding',None)
                    p['metrics'].pop('perceptual_hash',None)
            return dict(photos=pictures, job=dict(self.job), options=dict(self.options),
                        cloud=dict(self.cloud,configured=bool(self.cloud_key),signature=review_signature(self.cloud),
                                   key_source=self.cloud_key_source,
                                   available_models=list(self.cloud_models),connection_note=self.cloud_connection_note))

    def configure_cloud(self, body):
        with self.lock:
            self.ensure_idle()
            config = validate_config(body)
            supplied = body.get('api_key')
            api_key = supplied.strip() if isinstance(supplied,str) and supplied.strip() else self.cloud_key
            key_source = 'session' if isinstance(supplied,str) and supplied.strip() else self.cloud_key_source
        # This checks account access only. It sends no photos and creates no completion.
        models=check_key(config,api_key)
        if config['model']=='auto':
            config['model']=next((name for name in MODEL_LABELS if name in models),'kimi-k2.6')
        listed=config['model'] in models
        label=model_label(config['model'])
        note=(f'密钥已验证，审核模型：{label}。模型列表不能确认余额和照片调用权限，首次审核时以实际请求结果为准。' if listed else
              f'密钥已验证，暂选 {label}。平台模型列表未列出它，仍可提交一张照片确认能否调用；软件不会自动提交照片或切换模型。')
        with self.lock:
            self.ensure_idle()
            with self.db() as db:
                db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',('cloud',json.dumps(config,ensure_ascii=False)))
            self.cloud,self.cloud_key,self.cloud_key_source = config,api_key,key_source
            self.cloud_models,self.cloud_connection_note=models,note
            self.job['device'] = label+' · 密钥已验证，等待照片审核'
        storage_note = ('密钥由服务器环境变量提供，不会发送给浏览器或写入代码仓库。' if key_source=='server'
                        else '此密钥仅在本次服务运行期间保存在服务端内存中，不会写入文件或代码仓库。')
        return dict(ok=True,message=note+' '+storage_note)

    def forget_cloud_key(self):
        with self.lock:
            self.ensure_idle()
            self.cloud_key=self.environment_cloud_key
            self.cloud_key_source='server' if self.environment_cloud_key else ''
            self.cloud_models=[]
            self.cloud_connection_note=''
            self.job['device']=model_label(self.cloud['model'])+' · 服务器密钥已配置' if self.cloud_key else 'Kimi · 等待配置密钥'

    def start_cloud(self, ids, threshold, mode):
        if not .80<=threshold<=.99 or mode not in {'event','stage'}:
            raise ValueError('选片参数不正确')
        with self.import_lock,self.lock:
            self.ensure_idle()
            if not self.cloud_key:
                raise ValueError('请先在 Kimi 设置中填写密钥并检查连接')
            if self.cloud['model']=='auto':
                raise ValueError('请先检查连接，软件会选择实际审核模型')
            if ids is not None and (not isinstance(ids,list) or any(not isinstance(pid,str) for pid in ids)):
                raise ValueError('照片选择不正确')
            targets = list(self.photos) if ids is None else list(dict.fromkeys(ids))
            if not targets:
                raise ValueError('请先导入或勾选照片')
            if any(pid not in self.photos for pid in targets):
                raise ValueError('所选照片已不存在')
            self.options = dict(threshold=threshold,mode=mode)
            with self.db() as db:
                db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',('options',json.dumps(self.options)))
            config,key = dict(self.cloud),self.cloud_key
            self.cancel.clear()
            self.job.update(state='running',message='准备 Kimi 联网审核',done=0,total=len(targets),
                            device=model_label(config['model'])+' · 联网摄影审核',submitted=0,reused=0,prompt_tokens=0,completion_tokens=0)
            threading.Thread(target=self.work_cloud,args=(targets,config,key,mode),daemon=True).start()

    def update_cloud_groups(self):
        # Recompute automatic groups across the entire batch. Grouping a photo
        # only once when its review completes made earlier singleton groups
        # invisible to later burst frames. Human-edited groups remain fixed.
        manual_groups = {p.get('group') for p in self.photos.values()
                         if p.get('group_manual') and p.get('group') is not None}
        candidates = []
        for p in self.photos.values():
            if p.get('group_manual'):
                continue
            features = p.get('grouping') or p.get('metrics') or {}
            if features.get('embedding'):
                candidates.append(p)
            p['group'] = None
        number = max(manual_groups or {0}) + 1
        for group in group_candidates(candidates,self.options['threshold']):
            for p in group:
                p['group']=number
            number+=1
        signature=review_signature(self.cloud)
        for number in {p.get('group') for p in self.photos.values() if p.get('group')}:
            group = [p for p in self.photos.values() if p.get('group')==number]
            reviewed = [p for p in group if ((p.get('metrics') or {}).get('cloud_review') or {}).get('signature')==signature
                        and p['metrics']['cloud_review'].get('mode')==self.options['mode']]
            if not reviewed:
                continue
            if len(reviewed)==len(group):
                assign_group(group,number,self.options['mode'])
            else:
                for p in reviewed:
                    rejection=automatic_rejection(p['metrics'])
                    p.update(score=rank_score(p['metrics'],self.options['mode']),auto_status='reject' if rejection else 'pending',
                             status=p.get('manual') or ('reject' if rejection else 'pending'))
                    p['rank']=None
                    p['reasons']=([rejection] if rejection else
                                  [f"Kimi 已审核；本组还有 {len(group)-len(reviewed)} 张尚未联网审核，暂未确定首选"])+describe(p['metrics'])
                    if p.get('manual'):
                        p['reasons'].insert(0,'已采用你的手动选择，覆盖自动结果')

    def _review_cloud_photo(self, pid, reviewer, mode):
        with self.lock:
            photo=copy.deepcopy(self.photos[pid])
        current=(photo.get('metrics') or {}).get('cloud_review') or {}
        if current.get('signature')==reviewer.signature and current.get('mode')==mode:
            grouping=photo.get('grouping') or {}
            if grouping.get('visual_model')!='scene-layout-v2':
                metrics=photo.get('metrics') or {}
                if metrics.get('visual_model')=='scene-layout-v2' and metrics.get('embedding'):
                    grouping={key:metrics[key] for key in ('embedding','visual_model','perceptual_hash','taken_at')
                              if key in metrics}
                else:
                    with open_photo(photo['path']) as image:
                        grouping=PhotoPreparer.grouping_features(image,photo.get('taken_at'))
            return dict(pid=pid,reused=True,grouping=grouping)
        digest=photo['cache_key'].rsplit(':',1)[-1]
        cache_key=f'{CLOUD_PIPELINE}:{CLOUD_PROMPT_VERSION}:{reviewer.signature}:{mode}:{digest}'
        with self.db() as db:
            cached=db.execute('SELECT payload FROM cache WHERE key=?',(cache_key,)).fetchone()
        with self.lock:
            self.photos[pid]['cloud_status']='running'
            self.photos[pid].pop('cloud_error',None)
        self.message(f"Kimi 并行审核中 · {photo['name']}")
        try:
            with CLOUD_REVIEW_SLOTS, open_photo(photo['path']) as image:
                with self.preparer_lock:
                    metrics=self.preparer.prepare(image,photo.get('metrics'),photo.get('taken_at'))
                metrics['pipeline']=PIPELINE
                if cached:
                    saved=json.loads(cached[0])
                    # Rebuild legacy grouping descriptors even when reusing an
                    # old review cache, without paying for another model call.
                    metrics=saved['metrics']
                    if metrics.get('visual_model')!='scene-layout-v2':
                        metrics.update(PhotoPreparer.grouping_features(image,photo.get('taken_at')))
                    review=saved['review']
                else:
                    with self.lock:
                        self.job['submitted']+=1
                    review=reviewer.measure(image,metrics,mode)
                    with self.lock:
                        self.job['prompt_tokens']+=review['usage'].get('prompt_tokens',0)
                        self.job['completion_tokens']+=review['usage'].get('completion_tokens',0)
                    with self.db() as db:
                        db.execute('INSERT OR REPLACE INTO cache VALUES (?,?)',
                                   (cache_key,json.dumps(dict(metrics=metrics,review=review),ensure_ascii=False)))
                metrics['pipeline']=PIPELINE
                result=apply_review(metrics,review)
                grouping=PhotoPreparer.grouping_features(image,photo.get('taken_at'))
                return dict(pid=pid,metrics=result,grouping=grouping,reused=bool(cached))
        except CloudReviewError:
            raise
        except (OSError,ValueError):
            return dict(pid=pid,error='无法读取本张原图，请检查文件是否可用')

    def work_cloud(self, targets, config, api_key, mode):
        completed=0
        failure=None
        try:
            reviewer=KimiReviewer(config,api_key)
            if self.preparer is None:
                with self.preparer_lock:
                    if self.preparer is None:
                        self.preparer=PhotoPreparer(self.data/'models',self.message)
            try:
                configured=int(os.environ.get('PHOTO_REVIEW_CONCURRENCY','2'))
            except ValueError:
                configured=2
            concurrency=max(1,min(2,configured))
            next_index=0
            futures={}
            with ThreadPoolExecutor(max_workers=concurrency,thread_name_prefix='photo-review') as pool:
                def fill_queue():
                    nonlocal next_index
                    while (next_index<len(targets) and len(futures)<concurrency
                           and not self.cancel.is_set() and failure is None):
                        pid=targets[next_index]
                        next_index+=1
                        futures[pool.submit(self._review_cloud_photo,pid,reviewer,mode)]=pid

                fill_queue()
                while futures:
                    finished,_=wait(futures,timeout=.25,return_when=FIRST_COMPLETED)
                    for future in finished:
                        pid=futures.pop(future)
                        try:
                            result=future.result()
                        except CloudReviewError as exc:
                            failure=str(exc)
                            result=dict(pid=pid,error=failure)
                        except Exception:
                            failure='本地准备或保存审核结果失败，请稍后重试'
                            result=dict(pid=pid,error=failure)
                        with self.lock:
                            photo=self.photos[pid]
                            if result.get('grouping') is not None:
                                photo['grouping']=result['grouping']
                            if result.get('metrics') is not None:
                                photo.update(metrics=result['metrics'],cloud_status='done')
                                photo.pop('previous_metrics',None)
                                photo.pop('cloud_error',None)
                            elif result.get('error'):
                                photo.update(cloud_status='error',cloud_error=result['error'])
                            if result.get('reused'):
                                self.job['reused']+=1
                            self.save(photo)
                            completed+=1
                            self.job['done']=completed
                            self.update_cloud_groups()
                            self.persist_all()
                    fill_queue()
            with self.lock:
                self.update_cloud_groups()
                self.persist_all()
                failed=sum(self.photos[pid].get('cloud_status')=='error' for pid in targets)
                stopped=self.cancel.is_set()
                if failure:
                    self.job.update(state='error',message=failure+'。已完成结果保留；继续时会复用相同设置下的结果。')
                else:
                    self.job.update(state='stopped' if stopped else 'done',message=(
                        '已停止提交后续照片；已返回的 Kimi 结果保留，可继续' if stopped else
                        f"Kimi 审核完成：{len(targets)-failed} 张完成，{failed} 张未完成；本轮新调用 {self.job['submitted']} 次，复用 {self.job['reused']} 张结果"))
        except Exception as exc:
            # Do not log keys, request images, provider payloads or raw response bodies.
            message=str(exc) if isinstance(exc,CloudReviewError) else '本地准备或保存审核结果失败，请稍后重试'
            with self.lock:
                self.update_cloud_groups()
                self.persist_all()
                self.job.update(state='error',message=message+'。已完成结果保留；继续时会复用相同设置下的结果。')

    def face_preview(self, pid, index):
        with self.lock:
            photo = copy.deepcopy(self.photos[pid])
        faces = (photo.get('metrics') or {}).get('faces', [])
        if index < 0 or index >= len(faces):
            raise KeyError('人脸不存在')
        box = faces[index]['box']
        signature = hashlib.sha256(json.dumps(box).encode()).hexdigest()[:12]
        target = self.data/'previews'/f'{pid}-face-{index}-{signature}.jpg'
        # Serialize original decoding so many thumbnails cannot exhaust RAM.
        with self.face_preview_lock:
            if not target.exists():
                with open_photo(photo['path']) as image:
                    crop = image.crop(face_crop_bounds(image.size,box,1.4))
                    crop.thumbnail((600,600))
                    crop.save(target,quality=94)
            return target.read_bytes()

    def ensure_idle(self):
        if self.job['state']=='running': raise RuntimeError('选片正在进行，请先停止任务。')

    def import_paths(self, paths):
        count, errors = 0, []
        with self.import_lock:
            with self.lock: self.ensure_idle()
            for path in paths:
                path = Path(path).resolve()
                if path.suffix.lower() not in FORMATS or not path.is_file(): continue
                with self.lock:
                    if len(self.photos) >= 1000: raise RuntimeError('首版单批次最多 1000 张，请先导出再新建批次。')
                    if any(p['path']==str(path) for p in self.photos.values()): continue
                try:
                    digest = hashlib.sha256()
                    with path.open('rb') as f:
                        for chunk in iter(lambda:f.read(1024*1024),b''): digest.update(chunk)
                    cache_key = PIPELINE+':'+digest.hexdigest()
                    taken_at = None
                    with Image.open(path) as original:
                        exif = original.getexif()
                        value = exif.get(36867) or exif.get(306)
                        subsecond = exif.get(37521)
                        try:
                            exif_ifd = exif.get_ifd(34665)
                            value = exif_ifd.get(36867) or value
                            subsecond = exif_ifd.get(37521) or subsecond
                        except (AttributeError, KeyError, TypeError):
                            pass
                        if value:
                            try:
                                taken_at=datetime.strptime(str(value),'%Y:%m:%d %H:%M:%S').timestamp()
                                digits=''.join(ch for ch in str(subsecond or '') if ch.isdigit())[:6]
                                if digits:
                                    taken_at+=int(digits)/10**len(digits)
                            except ValueError: pass
                    picture = open_photo(path)
                    grouping = PhotoPreparer.grouping_features(picture,taken_at)
                    pid = uuid.uuid4().hex
                    picture.thumbnail((1600,1600))
                    picture.save(self.data/'previews'/f'{pid}.jpg',quality=88)
                    p = dict(id=pid, path=str(path), name=path.name, cache_key=cache_key, taken_at=taken_at,
                             grouping=grouping,
                             status='pending', manual=None, metrics=None, group=None, score=None,
                             reasons=['尚未审核'])
                    with self.lock:
                        self.photos[pid]=p
                        self.save(p)
                    count += 1
                except Exception as exc:
                    errors.append(f'{path.name}：{exc}')
            return dict(imported=count, errors=errors)

    def start(self, threshold, mode):
        if not .80 <= threshold <= .99 or mode not in {'event','stage'}:
            raise ValueError('选片参数不正确')
        with self.import_lock, self.lock:
            self.ensure_idle()
            if not self.photos: raise ValueError('请先导入照片')
            self.options=dict(threshold=threshold,mode=mode)
            with self.db() as db:
                db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',('options',json.dumps(self.options)))
            self.cancel.clear()
            self.job.update(state='running',message='准备本地模型',done=0,total=len(self.photos))
            threading.Thread(target=self.work,daemon=True).start()

    def message(self, text):
        with self.lock: self.job['message']=text

    def work(self):
        try:
            with self.lock:
                pending = [p for p in self.photos.values() if not p.get('metrics')]
            if pending and self.models is None:
                self.models=self.model_factory(self.data/'models',self.message)
            if self.models:
                with self.lock: self.job['device']=self.models.device_name
            with self.lock: ids=list(self.photos)
            for done,pid in enumerate(ids,1):
                if self.cancel.is_set(): break
                with self.lock: p=copy.deepcopy(self.photos[pid])
                if not p.get('metrics'):
                    self.message(f"正在分析 {done}/{len(ids)} · {p['name']}")
                    with self.db() as db:
                        cached=db.execute('SELECT payload FROM cache WHERE key=?',(p['cache_key'],)).fetchone()
                    if cached:
                        metrics=json.loads(cached[0])
                    else:
                        try:
                            with open_photo(p['path']) as image:
                                if isinstance(self.models, LocalModels):
                                    metrics=self.models.measure(image,p.get('taken_at'),p.get('previous_metrics'))
                                else:
                                    metrics=self.models.measure(image,p.get('taken_at'))
                        except Exception as exc:
                            # Individual file errors are explicit; model failures stop instead of inventing decisions.
                            if not Path(p['path']).is_file() or isinstance(exc,(OSError,ValueError)):
                                with self.lock:
                                    self.photos[pid].update(status='error', reasons=[f'本张分析失败：{exc}'])
                                    self.save(self.photos[pid])
                                    self.job['done']=done
                                continue
                            raise
                        with self.db() as db:
                            db.execute('INSERT OR REPLACE INTO cache VALUES (?,?)',(p['cache_key'],json.dumps(metrics)))
                    with self.lock:
                        self.photos[pid]['metrics']=metrics
                        self.photos[pid].pop('previous_metrics',None)
                        self.photos[pid]['status']='pending'
                        self.job['device']=self.models.device_name if self.models else self.job['device']
                        self.save(self.photos[pid])
                with self.lock: self.job['done']=done
            with self.lock:
                select(list(self.photos.values()),**self.options)
                self.persist_all()
                self.job.update(state='stopped' if self.cancel.is_set() else 'done',
                                message='已停止，已完成结果保留，可继续' if self.cancel.is_set() else '选片完成：查看每组首选和备选')
        except Exception as exc:
            logging.exception('Review failed')
            with self.lock:
                select(list(self.photos.values()),**self.options)
                self.persist_all()
                self.job.update(state='error',message=f'任务暂停：{exc}。已完成结果保留，可重试。')

    def mark(self, pid, status):
        if status not in {'keep','reserve','reject',None}: raise ValueError('选择无效')
        with self.lock:
            self.ensure_idle()
            p=self.photos[pid]
            p['manual']=status
            p['status']=status or p.get('auto_status','pending')
            if p.get('group'):
                assign_group([q for q in self.photos.values() if q.get('group')==p['group']],p['group'],self.options['mode'])
                self.persist_all()
            else: self.save(p)

    def regroup(self, ids, split):
        with self.lock:
            self.ensure_idle()
            if not ids: raise ValueError('先勾选照片')
            chosen=[self.photos[pid] for pid in dict.fromkeys(ids)]
            if any(not p.get('metrics') for p in chosen): raise ValueError('请先完成照片分析')
            number=max([p.get('group') or 0 for p in self.photos.values()])+1
            affected={p.get('group') for p in chosen if p.get('group') is not None}
            for p in self.photos.values():
                if p.get('group') in affected:
                    p['group_manual']=True
            if split:
                for p in chosen:
                    p['group_manual']=True
                    assign_group([p],number,self.options['mode']); number+=1
            else:
                for p in chosen:
                    p['group_manual']=True
                assign_group(chosen,number,self.options['mode'])
            for old in affected:
                remainder=[p for p in self.photos.values() if p.get('group')==old]
                if remainder: assign_group(remainder,old,self.options['mode'])
            self.persist_all()

    def reset(self):
        with self.import_lock, self.lock:
            self.ensure_idle()
            with self.db() as db:
                db.execute('DELETE FROM photos')
                db.execute('DELETE FROM cache')
            self.photos.clear()
            # Remove only files owned by this workspace; imported source paths
            # outside these directories are never followed or deleted.
            for directory_name in ('uploads','previews','exports'):
                directory=self.data/directory_name
                if directory.is_symlink():
                    directory.unlink(missing_ok=True)
                    continue
                if not directory.is_dir():
                    continue
                for item in directory.iterdir():
                    if item.is_symlink() or item.is_file():
                        item.unlink(missing_ok=True)
                    elif item.is_dir():
                        shutil.rmtree(item)
            self.job.update(state='idle',done=0,total=0,message='新批次已准备好，选择照片开始')

    def export(self):
        with self.lock:
            picked=copy.deepcopy([p for p in self.photos.values() if p['status']=='keep'])
        if not picked: raise ValueError('还没有推荐保留的照片')
        path=self.data/'exports'/f'{uuid.uuid4().hex}.zip'
        manifest=[]
        with zipfile.ZipFile(path,'w',zipfile.ZIP_STORED,allowZip64=True) as archive:
            used=set()
            for p in picked:
                item=dict(filename=p['name'],group=p.get('group'),score=p.get('score'),reasons=p['reasons'])
                original=Path(p['path'])
                if original.is_file():
                    name=p['name']
                    if name.casefold() in used: name=f"{original.stem}-{p['id'][:8]}{original.suffix}"
                    used.add(name.casefold())
                    archive.write(original,'photos/'+name)
                    item['exported_as']=name
                else: item['error']='原文件不存在，未导出'
                manifest.append(item)
            archive.writestr('selection.json',json.dumps(manifest,ensure_ascii=False,indent=2).encode('utf-8'))
        return path


class PhotoReviewServer(ThreadingHTTPServer):
    """Keep each authenticated administrator's review workspace separate."""
    def __init__(self, address, handler, data_root, user_scoped):
        super().__init__(address,handler)
        self.data_root=Path(data_root).resolve()
        self.user_scoped=bool(user_scoped)
        self._workspaces={}
        self._workspaces_lock=threading.RLock()
        if not self.user_scoped:
            self._workspaces['local']=Workspace(data_root=self.data_root)

    def workspace_for(self, user_id):
        key=str(user_id)
        if not self.user_scoped:
            key='local'
        elif not key.isdigit():
            raise PermissionError('管理员身份无效，请重新登录')
        else:
            key=str(int(key))
        with self._workspaces_lock:
            if key not in self._workspaces:
                self._workspaces[key]=Workspace(data_root=self.data_root/'users'/key)
            return self._workspaces[key]

    def stop_workspaces(self):
        with self._workspaces_lock:
            for workspace in self._workspaces.values():
                workspace.cancel.set()


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def valid_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def requires_admin_session(self):
        return os.environ.get('PHOTO_REVIEW_REQUIRE_ADMIN_SESSION','0').lower() in {'1','true','yes'}
    def authenticated_user_id(self):
        if not self.requires_admin_session():
            return 'local'
        secret=os.environ.get('PHOTO_REVIEW_SESSION_SECRET','').strip()
        if len(secret)<32 or secret.startswith('REPLACE_WITH_'):
            return None
        cookies=SimpleCookie()
        try:
            cookies.load(self.headers.get('Cookie',''))
            session=cookies.get('photo_review_session')
            if session is None:
                return None
            payload=jwt.decode(session.value,secret,algorithms=['HS256'],audience='field-note-photo-review')
        except (JWTError,KeyError,TypeError,ValueError):
            return None
        user_id=str(payload.get('sub',''))
        if (payload.get('type')=='photo_review_session' and payload.get('role')=='admin'
                and user_id.isdigit()):
            return str(int(user_id))
        return None
    def valid_admin_session(self):
        return self.authenticated_user_id() is not None
    def authorize_session(self):
        if not self.valid_host() or not self.valid_admin_session():
            raise PermissionError('管理员会话已过期，请刷新页面后重新进入照片审核')
    def workspace(self):
        user_id=self.authenticated_user_id()
        if user_id is None:
            raise PermissionError('管理员会话已过期，请刷新页面后重新进入照片审核')
        return self.server.workspace_for(user_id)
    def authorize_image(self, token):
        self.authorize_session()
        if not self.requires_admin_session() and not secrets.compare_digest(token,self.server.token):
            raise PermissionError('会话无效')
    def authorize(self):
        self.authorize_session()
        if not secrets.compare_digest(self.headers.get('X-Liuguang-Token',''),self.server.token):
            raise PermissionError('本地会话已失效，请从启动窗口重新打开网页')
        origin=self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}:
            raise PermissionError('来源无效')
    def send_bytes(self, data, kind, status=200, extra=None):
        self.send_response(status)
        self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; frame-ancestors 'self'")
        for k,v in (extra or {}).items(): self.send_header(k,v)
        self.end_headers()
        self.wfile.write(data)
    def reply(self, obj, status=200):
        self.send_bytes(json.dumps(obj,ensure_ascii=False).encode(),'application/json; charset=utf-8',status)
    def body(self):
        length=int(self.headers.get('Content-Length',0))
        if length>1024*1024: raise ValueError('请求过大')
        return json.loads(self.rfile.read(length) or b'{}')
    def do_GET(self):
        try:
            self.authorize_session()
            url=urlparse(self.path)
            if url.path=='/':
                html=(ROOT/'web/index.html').read_text('utf-8').replace('__TOKEN__',self.server.token)
                html=html.replace('__BASE_PATH__',os.environ.get('PHOTO_REVIEW_BASE_PATH','').rstrip('/'))
                self.send_bytes(html.encode(),'text/html; charset=utf-8')
            elif url.path in {'/app.js','/style.css','/editorial.css'}:
                kind='text/javascript; charset=utf-8' if url.path.endswith('.js') else 'text/css; charset=utf-8'
                self.send_bytes((ROOT/'web'/url.path[1:]).read_bytes(),kind)
            elif url.path=='/api/state':
                self.authorize(); self.reply(self.workspace().snapshot())
            elif url.path.startswith('/preview/'):
                token=parse_qs(url.query).get('token',[''])[0]
                self.authorize_image(token)
                pid=url.path.split('/')[-1]
                ws=self.workspace()
                with ws.lock:
                    if pid not in ws.photos: raise KeyError('照片不存在')
                self.send_bytes((ws.data/'previews'/f'{pid}.jpg').read_bytes(),'image/jpeg')
            elif url.path.startswith('/face/'):
                token=parse_qs(url.query).get('token',[''])[0]
                self.authorize_image(token)
                parts=url.path.strip('/').split('/')
                if len(parts)!=3 or not parts[2].isdigit(): raise KeyError('人脸不存在')
                self.send_bytes(self.workspace().face_preview(parts[1],int(parts[2])),'image/jpeg')
            else: self.reply({'error':'页面不存在'},404)
        except PermissionError as exc: self.reply({'error':str(exc)},403)
        except (KeyError,FileNotFoundError) as exc: self.reply({'error':str(exc)},404)
        except Exception as exc: logging.exception('Request failed'); self.reply({'error':str(exc)},500)
    def do_POST(self):
        try:
            self.authorize()
            url=urlparse(self.path)
            ws=self.workspace()
            if url.path=='/api/folder':
                if self.requires_admin_session():
                    raise ValueError('服务器版请使用“选择照片”上传文件')
                with ws.lock: ws.ensure_idle()
                path=choose_folder()
                self.reply(ws.import_paths(sorted(Path(path).rglob('*'))) if path else {'imported':0,'errors':[]})
            elif url.path=='/api/cloud/config':
                self.reply(ws.configure_cloud(self.body()))
            elif url.path=='/api/cloud/forget':
                ws.forget_cloud_key(); self.reply({'ok':True})
            elif url.path=='/api/cloud/start':
                body=self.body()
                ws.start_cloud(body.get('ids'),float(body.get('threshold',.92)),body.get('mode','event'))
                self.reply({'ok':True})
            elif url.path=='/api/upload':
                name=Path(parse_qs(url.query).get('name',['photo.jpg'])[0].replace('\\','/')).name
                if Path(name).suffix.lower() not in FORMATS: raise ValueError('暂不支持该照片格式')
                length=int(self.headers.get('Content-Length',0))
                if not 0<length<=120*1024*1024: raise ValueError('单张照片应小于 120MB')
                with ws.lock: ws.ensure_idle()
                folder=ws.data/'uploads'/uuid.uuid4().hex
                folder.mkdir()
                target=folder/name
                with target.open('wb') as f:
                    remaining=length
                    while remaining:
                        chunk=self.rfile.read(min(1024*1024,remaining))
                        if not chunk: raise ValueError('照片传输中断')
                        f.write(chunk); remaining-=len(chunk)
                self.reply(ws.import_paths([target]))
            elif url.path=='/api/start':
                body=self.body(); ws.start(float(body.get('threshold',.92)),body.get('mode','event')); self.reply({'ok':True})
            elif url.path=='/api/stop': ws.cancel.set(); self.reply({'ok':True})
            elif url.path=='/api/mark':
                body=self.body(); ws.mark(body['id'],body.get('status')); self.reply({'ok':True})
            elif url.path in {'/api/merge','/api/split'}:
                ws.regroup(self.body().get('ids',[]),url.path.endswith('split')); self.reply({'ok':True})
            elif url.path=='/api/reset': ws.reset(); self.reply({'ok':True})
            elif url.path=='/api/export':
                path=ws.export()
                try:
                    self.send_response(200)
                    self.send_header('Content-Type','application/zip')
                    self.send_header('Content-Disposition', 'attachment; filename="photo-review-selected.zip"; filename*=UTF-8\'\''+quote('你拍的照片怎么样-首选原图.zip'))
                    self.send_header('Content-Length',str(path.stat().st_size))
                    self.end_headers()
                    with path.open('rb') as f:
                        for chunk in iter(lambda:f.read(1024*1024),b''): self.wfile.write(chunk)
                finally: path.unlink(missing_ok=True)
            else: self.reply({'error':'操作不存在'},404)
        except PermissionError as exc: self.reply({'error':str(exc)},403)
        except (ValueError,RuntimeError,KeyError) as exc: self.reply({'error':str(exc)},400)
        except Exception as exc: logging.exception('Operation failed'); self.reply({'error':str(exc)},500)


def main():
    register_heif()
    data_root=get_data_root()
    data_root.mkdir(parents=True,exist_ok=True)
    logging.basicConfig(filename=data_root/'app.log',level=logging.INFO,encoding='utf-8')
    host=os.environ.get('PHOTO_REVIEW_HOST','127.0.0.1')
    user_scoped=os.environ.get('PHOTO_REVIEW_REQUIRE_ADMIN_SESSION','0').lower() in {'1','true','yes'}
    server=PhotoReviewServer((host,int(os.environ.get('PHOTO_REVIEW_PORT','0'))),Handler,data_root,user_scoped)
    server.token=secrets.token_urlsafe(32)
    address=f'http://127.0.0.1:{server.server_port}'
    print(f'你拍的照片怎么样已启动：{address}\n保持本窗口打开；关闭窗口即退出软件。',flush=True)
    if os.environ.get('PHOTO_REVIEW_NO_BROWSER','0').lower() not in {'1','true','yes'}:
        webbrowser.open(address)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.stop_workspaces(); server.server_close()

if __name__=='__main__': main()
