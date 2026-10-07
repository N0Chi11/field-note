"""Relative culling policies. Scores support a choice; they are not a usability veto."""
from datetime import datetime
import math
import numpy as np


def visual_similarity(a, b):
    va, vb = np.asarray(a['embedding']), np.asarray(b['embedding'])
    return float(np.dot(va, vb) / max(np.linalg.norm(va) * np.linalg.norm(vb), 1e-12))


def compatible(a, b, threshold):
    ta, tb = a.get('taken_at'), b.get('taken_at')
    if ta and tb and abs(float(ta) - float(tb)) > 300:
        return False
    if len(a['embedding'])!=len(b['embedding']) or a.get('visual_model')!=b.get('visual_model'):
        return False
    return visual_similarity(a, b) >= threshold


def group_candidates(photos, threshold=.92):
    """Complete-link groups prevent a chain of weak matches collapsing an event."""
    groups = []
    for p in photos:
        if not p.get('metrics') or not p['metrics'].get('embedding'):
            continue
        matching = [g for g in groups if all(compatible(p['metrics'], q['metrics'], threshold) for q in g)]
        if matching:
            best = max(matching, key=lambda g: min(visual_similarity(p['metrics'], q['metrics']) for q in g))
            best.append(p)
        else:
            groups.append([p])
    return groups


def rank_score(metrics, mode='event'):
    if metrics.get('cloud_review'):
        return round(float(metrics['cloud_review']['quality_score']),2)
    aesthetic = max(0, min(100, float(metrics.get('aesthetic', 0)) * 10))
    sharp = max(0, min(100, float(metrics.get('sharpness_score', 50))))
    exposure = float(metrics.get('exposure_score', 70))
    eye_penalty = (3 if mode == 'stage' else 18) if metrics.get('closed_eyes', 0) else 0
    return round(.70 * aesthetic + .20 * sharp + .10 * exposure - eye_penalty, 2)


def describe(metrics):
    review=metrics.get('cloud_review')
    if review:
        confidence={'high':'证据较充分','medium':'证据一般','low':'证据不足'}
        reasons=['Kimi（'+review['model']+'）：'+review['summary'],'主体：'+review['subject']]
        for key,label in [('focus','对焦'),('exposure','曝光'),('composition','构图')]:
            item=review[key]
            reasons.append(f"{label}：{item['evidence']}（{confidence[item['confidence']]}）")
        for face in sorted(review['faces'],key=lambda f:f['index']):
            role={'primary':'主体','secondary':'重要人物','background':'背景人物'}[face['role']]
            state={'open':'睁眼','closed':'闭眼风险','narrow':'眯眼/半闭眼','downcast':'低头/向下看','occluded':'眼部遮挡','uncertain':'眼部未判清'}[face['eye_state']]
            reasons.append(f"人脸 {face['index']+1} · {role} · {state}：{face['evidence']}（{confidence[face['confidence']]}）")
        if review.get('additional_people'):
            reasons.append('未编号人物：'+review['additional_people'])
        reasons.append(f"Kimi 发布适用分 {review['quality_score']:.0f}/100；构图观感 {review['composition_score']:.1f}/10，均为模型判断")
        return reasons
    reasons = []
    faces = metrics.get('faces', [])
    counts = metrics.get('eye_counts')
    if not counts:
        counts = {state:sum(f.get('eye_state') == state for f in faces)
                  for state in ['open','closed','narrow','downcast']}
        counts['closed'] = max(counts['closed'], int(metrics.get('closed_eyes', 0)))
        counts['uncertain'] = sum(f.get('eye_state') not in ['open','closed','narrow','downcast'] for f in faces)
    eye_labels = [('closed','闭眼风险'),('narrow','眯眼或半闭眼'),('downcast','低头或向下看'),
                  ('open','可见眼睛睁开'),('uncertain','眼部未判清，详情中注明原因')]
    eye_parts = [f'{counts[state]} 人{label}' for state,label in eye_labels if counts.get(state)]
    reasons.append('；'.join(eye_parts) if eye_parts else '未找到可评估人脸，眼部未评估')
    exposure = metrics.get('exposure', 'normal')
    clipped = metrics.get('exposure_clipped_fraction', 0)
    dark = metrics.get('exposure_dark_fraction', 0)
    reasons.append({'dark': f'主体偏暗，欠曝风险（暗部约 {dark*100:.0f}%）',
                    'bright': f'主体亮部偏多，过曝风险（高光约 {clipped*100:.0f}%）',
                    'normal': '主体区域未发现明显过曝或欠曝'}[exposure])
    sharpness = float(metrics.get('sharpness_score', 50))
    scope = '人脸区域' if metrics.get('focus_scope') == 'face' else '画面中心区域'
    if metrics.get('focus_label') == 'soft' or sharpness < 35:
        reasons.append(f'{scope}细节偏软，可能未对焦或有运动模糊')
    elif metrics.get('focus_label') == 'check' or sharpness < 55:
        reasons.append(f'{scope}清晰度一般，建议放大复核')
    else:
        reasons.append(f'{scope}细节较清楚；清晰度分数 {sharpness:.0f}/100')
    reasons.extend(metrics.get('composition_notes', []))
    reasons.append(f"整体观感分数 {metrics.get('aesthetic', 0):.2f}/10，用于同组比较")
    return reasons


def assign_group(group, number, mode='event'):
    for p in group:
        p['score'] = rank_score(p['metrics'], mode)
        p['group'] = number
    def issues(p):
        review=p['metrics'].get('cloud_review')
        if review:
            rejected=automatic_rejection(p['metrics'])
            eye=any(eye_rejection_issue(f) for f in review.get('faces',[]))
            return (not rejected,not eye,p['score'])
        return (not bool(p['metrics'].get('hard_issue')),True,p['score'])
    def hard_issue(p):
        return automatic_rejection(p['metrics'])
    ranked = sorted(group, key=issues, reverse=True)
    usable = [p for p in ranked if not hard_issue(p) and p.get('manual')!='reject']
    leader = usable[0] if usable else None
    for index, p in enumerate(ranked):
        p['rank'] = index + 1
        hard = hard_issue(p)
        if hard:
            p['auto_status'] = 'reject'
            p['reasons'] = [hard] + describe(p['metrics'])
        elif p is leader:
            p['auto_status'] = 'keep'
            p['reasons'] = [f"本组 {len(group)} 张中的综合首选" if len(group) > 1 else '独立内容，保留为可用候选'] + describe(p['metrics'])
        else:
            p['auto_status'] = 'reserve'
            p['reasons'] = [f"同组备选，第 {index+1} 名" + (f"；首选为 {leader['name']}" if leader else '；本组照片已被你手动排除')] + describe(p['metrics'])
        p['status'] = p.get('manual') or p['auto_status']
        if p.get('manual'):
            p['reasons'].insert(0, '已采用你的手动选择')
    return ranked


def automatic_rejection(metrics):
    """Strict, auditable veto for clearly evidenced issues; photos stay on disk."""
    review=metrics.get('cloud_review')
    if not review:
        return metrics.get('hard_issue')
    issues=[]
    for face in review.get('faces',[]):
        eye_issue=eye_rejection_issue(face)
        if eye_issue:
            role='主体' if face['role']=='primary' else '重要人物'
            issues.append(f"{role}（人脸 {face.get('index',0)+1}）：{eye_issue}（{face.get('evidence','')}）")
    checks=[
        ('focus',{'soft','blurred'},'主体失焦或明显发虚'),
        ('exposure',{'overexposed','underexposed','mixed'},'主体严重过曝、欠曝或曝光不均'),
        ('composition',{'problematic'},'严重构图问题'),
    ]
    for key,states,label in checks:
        item=review.get(key,{})
        if item.get('state') in states and item.get('severity')=='major' and item.get('confidence')=='high':
            issues.append(f"{label}：{item.get('evidence','')}")
    return '严重问题，自动不推荐：'+'；'.join(issues) if issues else None


def eye_rejection_issue(face):
    if face.get('role') not in {'primary','secondary'} or face.get('confidence') not in {'high','medium'}:
        return None
    state=face.get('eye_state')
    evidence=str(face.get('evidence','')).replace(' ','')
    contradictory=('未闭合','并未闭合','没有闭合','眼裂仍开','眼睛睁开','眼睑张开','未完全闭合')
    if state=='closed':
        physical_closure=('上下眼睑闭合','上下眼睑合拢','上下眼睑贴合','上下眼睑接触',
                          '眼睑完全闭合','眼睑紧闭','眼睑合拢','双眼闭合','双眼紧闭',
                          '双眼合拢','眼睛完全闭合','眼睛闭上','眼裂完全闭合','眼裂闭合')
        if any(marker in evidence for marker in physical_closure) and not any(token in evidence for token in contradictory):
            return '明确闭眼'
    if state=='narrow':
        clear_half_close=('明显半闭','半闭','半闭眼','眯眼','眯起双眼','双眼眯起','眼裂收窄','眼睑明显收窄')
        angle_only=('侧脸','侧面','侧视','侧身','眼角度','角度导致')
        if any(marker in evidence for marker in clear_half_close) and not any(token in evidence for token in contradictory+angle_only):
            return '明显半闭 / 眯眼'
    return None


def select(photos, threshold=.92, mode='event'):
    for number, group in enumerate(group_candidates(photos, threshold), 1):
        assign_group(group, number, mode)
    return photos
