"""Layout suitability, not a claim that pagination has been render-validated."""
import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def template_policies() -> dict[str, dict[str, str]]:
    return json.loads(Path(__file__).with_suffix('.json').read_text(encoding='utf-8'))


def template_page_guidance(template: str) -> str:
    policy = template_policies().get(template)
    mode = policy['mode'] if policy else 'pagination_pending'
    rules = {
        'flow': '模板适合自然续页：优先一页；相关经历较多时允许两页或必要的更多页，勿为页数丢失关键事实。',
        'prefer_one_page': '模板强调单页构图：尽量一页，优先精简重复表述；关键内容确有需要时可超页，不强行截断。',
        'pagination_pending': '模板的双栏/侧栏续页尚未适配（未知模板同样保守处理）：以一页篇幅组织内容；关键事实放不下时保留，不承诺分页效果。',
    }
    return (rules[mode] + ' 总结用2—3句，每段经历优先2—3条精炼成果；这是篇幅建议，不是硬性条数。'
            '按岗位相关性安排重点，不编造、重复填充或擅自删掉关键经历。不要调整字号、插入分页符或声称已验证页数。')
