import json
import re
from pathlib import Path

from app.ai.prompts import (
    build_generate_resume_prompt,
    build_optimization_system_prompt,
    build_resume_system_prompt,
    build_tailored_resume_prompt,
)
from app.domain.template_pagination import template_page_guidance, template_policies


def test_every_active_template_has_an_explicit_policy_and_source():
    root = Path(__file__).resolve().parents[2]
    catalog = (root / 'frontend/src/lib/template-catalog.ts').read_text()
    ids = set(re.findall(r"id: '([^']+)'", catalog))
    policies = template_policies()
    assert set(policies) == ids
    for policy in policies.values():
        assert policy['mode'] in {'flow', 'prefer_one_page', 'pagination_pending'}
        assert policy['reason'] and (root / policy['source']).is_file()
    assert policies['ats']['mode'] == 'flow'
    assert policies['folio-growth']['mode'] == 'pagination_pending'
    assert policies['folio-cloud']['mode'] == 'prefer_one_page'


def test_generation_and_editing_receive_only_the_selected_template_policy():
    for template in ('ats', 'folio-cloud', 'folio-growth'):
        rule = template_page_guidance(template)
        resume = json.dumps({'template': template, 'sections': []})
        for prompt in (
            build_generate_resume_prompt(template),
            build_tailored_resume_prompt(template),
            build_optimization_system_prompt(resume),
            build_resume_system_prompt(resume, can_edit_resume=True),
        ):
            assert prompt.count(rule) == 1
            assert '不承诺' in prompt or '不强行截断' in prompt or '允许两页' in prompt
    assert '未知模板' in template_page_guidance('future-template')
    assert '输出语言：英语' in build_tailored_resume_prompt('ats', 'en')


def test_optimization_uses_json_contract_not_unavailable_tool():
    prompt = build_optimization_system_prompt('{"template":"ats","sections":[]}')
    assert '"operation": "optimize_resume"' in prompt
    assert 'sectionId' in prompt and 'newValue' in prompt
    assert '调用 optimizeResume' not in prompt
    assert prompt.count('"sections"') == 1
