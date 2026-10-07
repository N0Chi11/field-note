"""Image measurements and actual local neural inference; no API keys."""
from pathlib import Path
import hashlib
import math
import time
import urllib.request
import os
import numpy as np
from PIL import Image, ImageOps

PIPELINE = 'liuguang-clip-openai-b32-aesthetic-laion-mp-7'


def register_heif():
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        pass


def open_photo(path):
    with Image.open(path) as im:
        im.load()
        return ImageOps.exif_transpose(im).convert('RGB')


def exposure_and_detail(image, faces=None):
    sample = image.copy()
    sample.thumbnail((1000, 1000))
    gray = np.asarray(sample.convert('L'), dtype=np.float32)
    if faces:
        largest = max(faces, key=lambda f: f['area'])
        x0, y0, x1, y1 = largest['box']
        w, h = sample.size
        pad_x, pad_y = (x1-x0)*.18, (y1-y0)*.18
        region = gray[max(0,int((y0-pad_y)*h)):min(h,max(1,int((y1+pad_y)*h))),
                      max(0,int((x0-pad_x)*w)):min(w,max(1,int((x1+pad_x)*w)))]
        if not region.size:
            region = gray
    else:
        # A central scene crop is a better fallback than a highly textured border.
        h, w = gray.shape
        region = gray[int(h*.15):max(int(h*.85),1), int(w*.15):max(int(w*.85),1)]
    mean = float(np.mean(region))
    dark = float(np.mean(region <= 5))
    bright = float(np.mean(region >= 250))
    exposure = 'dark' if (mean < 95 and dark > .08) or (mean < 35 and dark > .18) else \
               'bright' if (mean > 170 and bright > .08) or (mean > 225 and bright > .25) else 'normal'

    # Focus is measured on the subject face(s), where possible. A textured wall
    # must not make an out-of-focus face appear perfectly sharp.
    focus_regions = []
    if faces:
        w, h = sample.size
        for face in sorted(faces, key=lambda f: f['area'], reverse=True)[:3]:
            x0, y0, x1, y1 = face['box']
            px, py = (x1-x0)*.12, (y1-y0)*.12
            roi = gray[max(0,int((y0-py)*h)):min(h,max(1,int((y1+py)*h))),
                       max(0,int((x0-px)*w)):min(w,max(1,int((x1+px)*w)))]
            if roi.shape[0] >= 5 and roi.shape[1] >= 5:
                focus_regions.append(roi)
    else:
        h, w = gray.shape
        roi = gray[int(h*.2):max(int(h*.8),1), int(w*.2):max(int(w*.8),1)]
        if roi.shape[0] >= 5 and roi.shape[1] >= 5:
            focus_regions.append(roi)

    details = []
    for roi in focus_regions:
        # Limit pixels so large originals do not add memory pressure.
        if roi.shape[0] > 360 or roi.shape[1] > 360:
            pil_roi = Image.fromarray(np.uint8(np.clip(roi, 0, 255)))
            pil_roi.thumbnail((360, 360))
            roi = np.asarray(pil_roi, dtype=np.float32)
        lap = roi[:-2,1:-1] + roi[2:,1:-1] + roi[1:-1,:-2] + roi[1:-1,2:] - 4*roi[1:-1,1:-1]
        details.append(float(np.var(lap)))
    detail = float(np.mean(details)) if details else 0.0
    sharpness = max(0, min(100, 100*(1-math.exp(-math.sqrt(max(0, detail))/30))))
    focus_label = 'soft' if sharpness < 35 else 'check' if sharpness < 55 else 'clear'

    hard = None
    # A dark background or minor softness is never sufficient to reject a photo.
    if not faces and float(gray.std()) < 2 and (float(gray.mean()) < 3 or float(gray.mean()) > 252):
        hard = '画面近乎全黑或全白，几乎没有可辨认的内容'
    return dict(exposure=exposure, exposure_mean=round(mean,1), exposure_dark_fraction=round(dark,4),
                exposure_clipped_fraction=round(bright,4), exposure_score=90 if exposure=='normal' else 60,
                sharpness_score=round(sharpness,1), focus_label=focus_label,
                focus_scope='face' if faces else 'scene', detail=round(detail,1),
                composition_notes=[], hard_issue=hard)


def _box_iou(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0, x1-x0) * max(0, y1-y0)
    area_a = max(0, a[2]-a[0]) * max(0, a[3]-a[1])
    area_b = max(0, b[2]-b[0]) * max(0, b[3]-b[1])
    return intersection / max(area_a + area_b - intersection, 1e-8)


def face_crop_bounds(size, box, padding=1.8):
    width,height = size
    x0,y0,x1,y1 = box
    if x1 <= x0 or y1 <= y0:
        raise ValueError('人脸区域无效')
    side = max((x1-x0)*width,(y1-y0)*height)*padding
    cx,cy = (x0+x1)*width/2,(y0+y1)*height/2
    return (max(0,int(cx-side/2)), max(0,int(cy-side/2)),
            min(width,int(cx+side/2)), min(height,int(cy+side/2)))


def reusable_visual(metrics):
    """Quality revisions can reuse the same 512-d B/32 visual features."""
    metrics = metrics or {}
    compatible = metrics.get('visual_model') == 'clip-openai-b32' or str(metrics.get('pipeline', '')).startswith('liuguang-clip-openai-b32-aesthetic-laion-')
    vector = metrics.get('embedding')
    score = metrics.get('aesthetic')
    if compatible and isinstance(vector, list) and len(vector) == 512 and isinstance(score, (int, float)) and math.isfinite(score):
        return dict(embedding=vector, aesthetic=score, visual_model='clip-openai-b32')
    return None


def eye_measurements(landmarks, size, source_size, matrix=None):
    width, height = size
    points = np.asarray([[p.x*width, p.y*height, p.z*width] for p in landmarks], dtype=np.float64)
    ratios, eye_widths = [], []
    # The left and right eyelid contours are from MediaPipe's face mesh topology.
    for ids in [(362,385,387,263,373,380), (33,160,158,133,153,144)]:
        eye = points[list(ids)]
        distance = lambda a,b: float(np.linalg.norm(eye[a]-eye[b]))
        ratios.append((distance(1,5)+distance(2,4))/(2*max(distance(0,3),1e-8)))
        original_delta = (eye[0,:2]-eye[3,:2])*np.asarray([source_size[0]/width,source_size[1]/height])
        eye_widths.append(float(np.linalg.norm(original_delta)))
    pitch, yaw = 0.0, 0.0
    if matrix is not None:
        rotation = np.asarray(matrix)[:3,:3]
        pitch = float(np.degrees(np.arctan2(rotation[2,1], rotation[2,2])))
        yaw = float(np.degrees(np.arctan2(-rotation[2,0], np.hypot(rotation[2,1],rotation[2,2]))))
    return dict(ear=ratios, eye_width_pixels=eye_widths, head_pitch=pitch, head_yaw=yaw)


def classify_eyes(evidence, categories):
    """Combine eyelid geometry, expression coefficients, pose and source pixels.

    Blendshapes are expression coefficients, not calibrated blink probabilities.
    Downward gaze and narrow eyelids remain separate, visible review signals.
    """
    uncertain = dict(eye_state='uncertain', eye_reason='侧脸或遮挡，眼部关键点未定位', visible_eyes=0)
    if not evidence:
        return uncertain
    ears = evidence['ear']
    widths = evidence['eye_width_pixels']
    blinks = [categories.get('eyeBlinkLeft'), categories.get('eyeBlinkRight')]
    if any(v is None or not math.isfinite(v) for v in ears+widths+blinks):
        return dict(uncertain, eye_reason='眼部关键点或表情信号不完整')
    profile = abs(evidence['head_yaw']) > 55 or min(widths)/max(max(widths),1e-8) < .4
    visible = [int(np.argmax(widths))] if profile else [0,1]
    selected_ears = [ears[i] for i in visible]
    selected_blinks = [blinks[i] for i in visible]
    if min(widths[i] for i in visible) < 8:
        return dict(uncertain, eye_reason='原图中的眼睛像素不足，无法可靠判断')
    if max(selected_ears) > .65:
        return dict(uncertain, eye_reason='眼部关键点受侧脸或遮挡影响')
    low, high = min(selected_ears), max(selected_ears)
    blink_low, blink_high = min(selected_blinks), max(selected_blinks)
    blink_mean = float(np.mean(selected_blinks))
    pitch = evidence['head_pitch']
    if (high <= .12 and blink_mean >= .25) or (high <= .16 and blink_low >= .35 and pitch < 18):
        return dict(eye_state='closed', eye_reason='可见眼睑闭合，检测到闭眼风险' + ('（侧脸）' if profile else ''), visible_eyes=len(visible))
    if pitch >= 18 and high <= .22 and blink_mean >= .22:
        return dict(eye_state='downcast', eye_reason='低头或向下看，闭眼判断受角度影响', visible_eyes=len(visible))
    if (low >= .18 and blink_high <= .65) or (low >= .17 and blink_mean < .35 and blink_high < .5):
        return dict(eye_state='open', eye_reason='侧脸可见眼睛睁开，另一眼被遮挡' if profile else '可见眼睛睁开', visible_eyes=len(visible))
    if high <= .22 and blink_high >= .25:
        return dict(eye_state='narrow', eye_reason='眼睑较窄，可能眯眼或半闭眼', visible_eyes=len(visible))
    return dict(uncertain, eye_reason='眼睑形状与表情信号不一致，需查看眼部', visible_eyes=len(visible))


def summarize_eyes(faces):
    counts = {name:sum(f.get('eye_state') == name for f in faces) for name in ['open','closed','narrow','downcast','uncertain']}
    counts['detected'] = len(faces)
    if counts['closed']:
        state = 'closed'
    elif counts['narrow']:
        state = 'narrow'
    elif counts['open']:
        state = 'partial' if counts['downcast'] or counts['uncertain'] else 'open'
    elif counts['downcast']:
        state = 'downcast'
    else:
        state = 'uncertain'
    return state, counts


def composition_notes(faces):
    """Only factual spatial cues produce composition notes; aesthetic is separate."""
    if not faces:
        return []
    largest = max(faces, key=lambda f:f['area'])
    x0,y0,x1,y1 = largest['box']
    edges = [name for name,condition in [('左',x0 < .015),('右',x1 > .985),('上',y0 < .015),('下',y1 > .985)] if condition]
    notes = []
    if edges:
        notes.append('人脸贴近'+'、'.join(edges)+'侧边缘，请检查裁切')
    if x1-x0 < .025 and len(faces) <= 2:
        notes.append(f'人物较远，最大人脸宽度约占画面 {(x1-x0)*100:.1f}%')
    return notes


def download(url, path, progress):
    path = Path(path)
    if path.exists() and path.stat().st_size > 1000:
        return path
    partial = path.with_suffix(path.suffix + '.partial')
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Liuguang/0.1'})
        with urllib.request.urlopen(req, timeout=60) as response, partial.open('wb') as output:
            total = int(response.headers.get('Content-Length', 0))
            size = 0
            last = 0
            while True:
                chunk = response.read(1024*1024)
                if not chunk: break
                output.write(chunk)
                size += len(chunk)
                if time.monotonic() - last > 1:
                    progress(f'下载 {path.name}：{size//(1024*1024)} MB' + (f' / {total//(1024*1024)} MB' if total else ''))
                    last = time.monotonic()
        if size < 1000 or (total and size != total):
            raise RuntimeError('下载文件不完整')
        partial.replace(path)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return path


class LocalModels:
    def __init__(self, root, progress):
        import mediapipe as mp
        self.mp, self.root, self.progress = mp, Path(root), progress
        self.clip = None
        self.device_name = '本机眼部模型 · 已有视觉评分可复用'
        task_path = download('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                             self.root/'face_landmarker.task', progress)
        options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(task_path)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=30, output_face_blendshapes=True, output_facial_transformation_matrixes=True,
            min_face_detection_confidence=.5, min_face_presence_confidence=.5)
        self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
        crop_options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(task_path)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=1, output_face_blendshapes=True, output_facial_transformation_matrixes=True,
            min_face_detection_confidence=.5, min_face_presence_confidence=.5)
        self.crop_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(crop_options)
        self.face_detector = mp.solutions.face_detection.FaceDetection(model_selection=1,min_detection_confidence=.5)
        progress('眼部模型就绪；正在按原图检查人脸')

    def _ensure_visual(self):
        if self.clip is not None:
            return
        import torch
        import open_clip
        from torch import nn
        self.torch = torch
        mps = getattr(getattr(torch, 'backends', None), 'mps', None)
        self.device = 'cuda' if torch.cuda.is_available() else 'mps' if mps is not None and mps.is_available() and mps.is_built() else 'cpu'
        torch.set_num_threads(2)
        self.progress('加载视觉模型，为新照片计算分组和观感分数')
        self.clip, _, self.preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained='openai', cache_dir=str(self.root), device=self.device)
        self.clip.eval().to(self.device)
        head_path = download('https://github.com/LAION-AI/aesthetic-predictor/raw/refs/heads/main/sa_0_4_vit_b_32_linear.pth',
                             self.root/'aesthetic-vit-b32.pth', self.progress)
        self.head = nn.Linear(512, 1)
        self.head.load_state_dict(torch.load(head_path, map_location='cpu', weights_only=True))
        self.head.eval().to(self.device)
        self.device_name = torch.cuda.get_device_name(0) if self.device=='cuda' else 'Apple Metal（MPS）' if self.device=='mps' else 'CPU（未启用显卡加速）'
        self.progress(f'模型就绪 · {self.device_name}')

    def measure(self, image, taken_at=None, previous=None):
        visual = reusable_visual(previous)
        if visual is None:
            self._ensure_visual()
            torch = self.torch
            with torch.inference_mode():
                vector = self.clip.encode_image(self.preprocess(image).unsqueeze(0).to(self.device)).float()
                vector /= vector.norm(dim=-1, keepdim=True).clamp_min(1e-8)
                visual = dict(aesthetic=float(self.head(vector).item()),embedding=vector[0].cpu().numpy().tolist(),visual_model='clip-openai-b32')
        faces = self.detect_faces(image)
        metrics = exposure_and_detail(image, faces)
        eye_status, counts = summarize_eyes(faces)
        metrics.update(visual, faces=faces, eye_status=eye_status, eye_counts=counts,
                       closed_eyes=counts['closed'], composition_notes=composition_notes(faces),
                       reused_visual=previous is not None and reusable_visual(previous) is not None,
                       taken_at=taken_at, pipeline=PIPELINE)
        return metrics

    def inspect_face_crop(self, image, candidate_box, padding=1.8):
        left,top,right,bottom = face_crop_bounds(image.size,candidate_box,padding)
        crop = image.crop((left,top,right,bottom))
        if crop.width < 18 or crop.height < 18:
            return None
        source_size = crop.size
        crop.thumbnail((384,384),Image.Resampling.LANCZOS)
        if min(crop.size) < 192:
            scale = min(2.0,192/max(1,min(crop.size)))
            crop = crop.resize((int(crop.width*scale),int(crop.height*scale)),Image.Resampling.LANCZOS)
        result = self.crop_landmarker.detect(self.mp.Image(
            image_format=self.mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.asarray(crop))))
        if not result.face_landmarks or not result.face_blendshapes:
            return None
        landmarks = result.face_landmarks[0]
        local = [min(p.x for p in landmarks),min(p.y for p in landmarks),
                 max(p.x for p in landmarks),max(p.y for p in landmarks)]
        box = [max(0,(left+local[0]*(right-left))/image.width),
               max(0,(top+local[1]*(bottom-top))/image.height),
               min(1,(left+local[2]*(right-left))/image.width),
               min(1,(top+local[3]*(bottom-top))/image.height)]
        # A crop may contain a neighbor. Only accept the proposed person's mesh.
        if _box_iou(box,candidate_box) < .2:
            return None
        categories = {c.category_name:float(c.score) for c in result.face_blendshapes[0]}
        matrix = result.facial_transformation_matrixes[0] if result.facial_transformation_matrixes else None
        return dict(box=box, categories=categories,
                    evidence=eye_measurements(landmarks,crop.size,source_size,matrix))

    def detect_faces(self, image):
        sample = image.copy()
        sample.thumbnail((1600,1600))
        pixels = np.ascontiguousarray(np.asarray(sample))
        result = self.landmarker.detect(self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=pixels))
        candidates = []
        for index, landmarks in enumerate(result.face_landmarks):
            x0, x1 = max(0,min(p.x for p in landmarks)), min(1,max(p.x for p in landmarks))
            y0, y1 = max(0,min(p.y for p in landmarks)), min(1,max(p.y for p in landmarks))
            if min((x1-x0)*sample.width,(y1-y0)*sample.height) < 18:
                continue
            categories = {c.category_name:float(c.score) for c in result.face_blendshapes[index]} if index < len(result.face_blendshapes) else {}
            matrix = result.facial_transformation_matrixes[index] if index < len(result.facial_transformation_matrixes) else None
            candidates.append(dict(box=[x0,y0,x1,y1], categories=categories,
                                   evidence=eye_measurements(landmarks,sample.size,image.size,matrix)))

        # The legacy detector is stronger on small or downward-facing faces.
        # Its boxes are used to crop and enlarge eyes before asking the landmarker.
        detected = self.face_detector.process(pixels)
        if detected.detections:
            for detection in detected.detections:
                box = detection.location_data.relative_bounding_box
                x0, y0 = max(0.0, box.xmin), max(0.0, box.ymin)
                x1, y1 = min(1.0, box.xmin+box.width), min(1.0, box.ymin+box.height)
                if min((x1-x0)*sample.width, (y1-y0)*sample.height) < 18:
                    continue
                prior = next((f for f in candidates if _box_iou(f['box'], [x0,y0,x1,y1]) > .2), None)
                if prior:
                    prior['box'] = [min(prior['box'][0],x0),min(prior['box'][1],y0),
                                    max(prior['box'][2],x1),max(prior['box'][3],y1)]
                else:
                    candidates.append(dict(box=[x0,y0,x1,y1], categories={}, evidence=None))

        faces = []
        for candidate in candidates[:30]:
            # Crop original pixels before resizing, using a square in pixel space.
            crop_padding = 1.8
            inspected = self.inspect_face_crop(image,candidate['box'],crop_padding)
            if inspected is None:
                for crop_padding in [2.2,1.5]:
                    inspected = self.inspect_face_crop(image,candidate['box'],crop_padding)
                    if inspected is not None:
                        break
            box = inspected['box'] if inspected else candidate['box']
            categories = inspected['categories'] if inspected else {}
            evidence = inspected['evidence'] if inspected else None
            left_blink, right_blink = categories.get('eyeBlinkLeft'), categories.get('eyeBlinkRight')
            judgment = classify_eyes(evidence,categories)
            checks = [dict(padding=crop_padding, **judgment)]
            if evidence and abs(evidence['head_yaw']) > 50:
                second_padding = 2.2 if crop_padding != 2.2 else 1.5
                secondary = self.inspect_face_crop(image,candidate['box'],second_padding)
                second = classify_eyes(secondary['evidence'],secondary['categories']) if secondary else classify_eyes(None,{})
                checks.append(dict(padding=second_padding, **second))
                if {judgment['eye_state'],second['eye_state']} == {'open','closed'}:
                    judgment = dict(eye_state='narrow', eye_reason='侧脸眼部在不同裁剪中判断不一致，可能眯眼或半闭眼', visible_eyes=judgment['visible_eyes'])
                elif judgment['eye_state']=='closed' and second['eye_state']!='closed' and max(evidence['ear']) > .12:
                    judgment = dict(eye_state='narrow', eye_reason='侧脸眼睑较窄，闭眼信号未得到重复确认', visible_eyes=judgment['visible_eyes'])
            faces.append(dict(box=box, area=(box[2]-box[0])*(box[3]-box[1]),
                              blink=min(left_blink,right_blink) if left_blink is not None and right_blink is not None else None,
                              blink_left=left_blink, blink_right=right_blink,
                              eye_evidence=evidence, eye_checks=checks, closed=judgment['eye_state']=='closed', **judgment))

        # Crop analysis can occasionally rediscover the same person from two detectors.
        deduped = []
        for face in sorted(faces, key=lambda f:(f['eye_state']!='uncertain',f['area']), reverse=True):
            if not any(_box_iou(face['box'], old['box']) > .45 for old in deduped):
                deduped.append(face)
        return sorted(deduped,key=lambda f:f['area'],reverse=True)
