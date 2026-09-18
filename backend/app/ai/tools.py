"""Model-facing resume tools and approval proposal construction."""

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from langchain_core.tools import BaseTool, StructuredTool

from app.domain.tools import TOOL_CATALOG

TOOL_BY_NAME = {tool.name: tool for tool in TOOL_CATALOG}
RESUME_TOOL_NAMES = tuple(name for name in TOOL_BY_NAME if "." not in name)

def resume_tools(names: list[str], resume: dict[str, Any]) -> list[BaseTool]:
    """Build executable LangChain tools bound to one authorized resume snapshot."""

    result: list[BaseTool] = []
    for name in names:
        definition = TOOL_BY_NAME.get(name)
        if not definition:
            continue

        def invoke(_name: str = name, **arguments: Any) -> dict[str, Any]:
            return execute_resume_tool(_name, arguments, resume)

        async def ainvoke(_name: str = name, **arguments: Any) -> dict[str, Any]:
            return execute_resume_tool(_name, arguments, resume)

        result.append(
            StructuredTool(
                name=name,
                description=definition.description,
                args_schema=definition.input_schema,
                func=invoke,
                coroutine=ainvoke,
                metadata={"approval": definition.approval, "status": definition.status},
            )
        )
    return result


def profile_tools(
    names: list[str], profile: dict[str, Any], profile_version: int
) -> list[BaseTool]:
    """Build profile-backed tools used before a resume has been created."""

    result: list[BaseTool] = []
    for name in names:
        definition = TOOL_BY_NAME.get(name)
        if not definition:
            continue

        def invoke(_name: str = name, **arguments: Any) -> dict[str, Any]:
            return execute_profile_tool(_name, arguments, profile, profile_version)

        async def ainvoke(_name: str = name, **arguments: Any) -> dict[str, Any]:
            return execute_profile_tool(_name, arguments, profile, profile_version)

        result.append(
            StructuredTool(
                name=name,
                description=definition.description,
                args_schema=definition.input_schema,
                func=invoke,
                coroutine=ainvoke,
                metadata={"approval": definition.approval, "status": definition.status},
            )
        )
    return result


def execute_profile_tool(
    name: str,
    arguments: dict[str, Any],
    profile: dict[str, Any],
    profile_version: int,
) -> dict[str, Any]:
    """Return client actions backed by the current candidate-profile snapshot."""

    if name == "analyzeStudentStrengths":
        return {"success": True, "operation": "analyze_student_strengths", "requestId": str(uuid4()), "createdAt": datetime.now(UTC).isoformat(), "profileVersion": profile_version}
    if name != "prepareTailoredResume":
        return {"success": False, "retryable": False, "error": "Unknown profile tool"}

    summary = profile.get("summary")
    collections = ("experiences", "education", "projects", "skills")
    has_material = bool(isinstance(summary, str) and summary.strip()) or any(
        isinstance(profile.get(key), list) and bool(profile[key]) for key in collections
    )
    if not has_material:
        return {
            "success": False,
            "error": "个人资料库还是空的，请先在个人资料库中补充经历，或加载虚构示例资料。",
        }

    target_role = str(arguments.get("targetRole") or "").strip()
    if not target_role:
        return {"success": False, "retryable": True, "error": "Target role is required"}
    language = arguments.get("language") if arguments.get("language") in {"zh", "en"} else "zh"
    return {
        "success": True,
        "requiresTemplateSelection": True,
        "operation": "generate_tailored_resume",
        "title": f"生成「{target_role}」专项简历",
        "reason": str(arguments.get("reason") or "根据候选人档案生成专项简历"),
        "targetRole": target_role,
        "jobDescription": str(arguments.get("jobDescription") or ""),
        "language": language,
        "profileVersion": profile_version,
    }


def _section(resume: dict[str, Any], section_id: str | None):
    return next(
        (value for value in resume.get("sections", []) if value.get("id") == section_id), None
    )


def _item(section: dict[str, Any], item_id: str | None):
    collection = "categories" if section.get("type") == "skills" else "items"
    return next(
        (
            value
            for value in section.get("content", {}).get(collection, [])
            if isinstance(value, dict) and value.get("id") == item_id
        ),
        None,
    )


def _is_empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _proposal(operation: str, title: str, reason: str, **values: Any) -> dict[str, Any]:
    return {
        "success": True,
        "requiresApproval": True,
        "operation": operation,
        "title": title,
        "reason": reason,
        **values,
    }


def execute_resume_tool(
    name: str, arguments: dict[str, Any], resume: dict[str, Any]
) -> dict[str, Any]:
    """Validate model arguments and return a client-reviewable proposal."""
    if name == "selectResumeTool":
        selected = arguments.get("toolName")
        if selected not in RESUME_TOOL_NAMES or selected == "selectResumeTool":
            return {"success": False, "retryable": True, "error": "Unknown resume tool"}
        return {"success": True, "selectedTool": selected}
    if name == "analyzeJdMatch":
        return {
            "success": True,
            "analysisRequested": True,
            "jobDescription": arguments.get("jobDescription", ""),
        }

    reason = str(arguments.get("reason") or "根据用户请求调整简历")
    section = _section(resume, arguments.get("sectionId") or arguments.get("scopeSectionId"))
    if name == "optimizeResume":
        changes = []
        scope_section_id = arguments.get("scopeSectionId")
        for change in arguments.get("changes", []):
            if not isinstance(change, dict):
                continue
            if scope_section_id and change.get("sectionId") != scope_section_id:
                continue
            current_section = _section(resume, change.get("sectionId"))
            if not current_section:
                continue
            content = current_section.get("content", {})
            if not isinstance(content, dict):
                continue

            item_id = change.get("itemId")
            collection_name = (
                "categories" if current_section.get("type") == "skills" else "items"
            )
            collection = content.get(collection_name)
            target: dict[str, Any] | None = content
            if isinstance(collection, list):
                target = _item(current_section, item_id) if item_id else None
                if target is None and len(collection) == 1 and isinstance(collection[0], dict):
                    target = collection[0]
                    item_id = target.get("id")

            field = change.get("field")
            value = change.get("value")
            if (
                not isinstance(target, dict)
                or not isinstance(field, str)
                or field not in target
                or field in {"id", "__proto__", "prototype", "constructor"}
                or _is_empty(target.get(field))
                or value is None
                or target.get(field) == value
            ):
                continue
            changes.append(
                {
                    **change,
                    "sectionTitle": current_section.get("title"),
                    "sectionType": current_section.get("type"),
                    "itemId": item_id,
                    "oldValue": target.get(field),
                    "newValue": value,
                }
            )
        if not changes:
            return {
                "success": False,
                "retryable": True,
                "error": "模型没有生成可应用的具体修改，请重试并确保每项修改指向真实模块、条目和非空字段。",
            }
        return _proposal("optimize_resume", "优化简历表达", reason, changes=changes)
    if name in {"updateResumeFields", "fillMissingFields", "rewriteText"}:
        if not section:
            return {"success": False, "retryable": True, "error": "Section not found"}
        item_id = arguments.get("itemId")
        target = _item(section, item_id) if item_id else section.get("content", {})
        if target is None:
            return {"success": False, "retryable": True, "error": "Resume item not found"}
        raw_changes = arguments.get("changes", [])
        if name == "rewriteText":
            raw_changes = [
                {"field": arguments.get("field"), "value": arguments.get("improvedText")}
            ]
        changes = [
            {
                "field": value.get("field"),
                "oldValue": target.get(value.get("field")),
                "newValue": value.get("value"),
            }
            for value in raw_changes
            if isinstance(value, dict) and value.get("field") and value.get("value") is not None
        ]
        operation = {
            "updateResumeFields": "update_fields",
            "fillMissingFields": "fill_missing_fields",
            "rewriteText": "rewrite_text",
        }[name]
        return _proposal(
            operation,
            f"修改「{section.get('title')}」",
            reason,
            sectionId=section["id"],
            sectionTitle=section.get("title"),
            sectionType=section.get("type"),
            itemId=item_id,
            changes=changes,
        )
    if name == "addResumeItem":
        if not section or not isinstance(arguments.get("item"), dict):
            return {"success": False, "retryable": True, "error": "Invalid item or section"}
        new_item = {"id": str(uuid4()), **arguments["item"]}
        return _proposal(
            "add_resume_item",
            f"向「{section.get('title')}」添加条目",
            reason,
            sectionId=section["id"],
            sectionType=section.get("type"),
            changes=[{"field": "item", "oldValue": None, "newValue": new_item}],
        )
    if name == "removeResumeItem":
        if not section or not _item(section, arguments.get("itemId")):
            return {"success": False, "retryable": True, "error": "Resume item not found"}
        return _proposal(
            "remove_resume_item",
            f"删除「{section.get('title')}」中的条目",
            reason,
            sectionId=section["id"],
            itemId=arguments["itemId"],
        )
    if name == "addSection":
        value = {
            "type": arguments.get("type"),
            "title": arguments.get("title"),
            "content": arguments.get("content") or {},
        }
        return _proposal("add_section", f"添加「{value['title']}」模块", reason, newSection=value)
    if name in {"removeSection", "renameSection", "setSectionVisibility"}:
        if not section:
            return {"success": False, "retryable": True, "error": "Section not found"}
        operation = {
            "removeSection": "remove_section",
            "renameSection": "rename_section",
            "setSectionVisibility": "set_section_visibility",
        }[name]
        new_value = arguments.get("title") if name == "renameSection" else arguments.get("visible")
        return _proposal(
            operation,
            f"调整「{section.get('title')}」",
            reason,
            sectionId=section["id"],
            newValue=new_value,
        )
    if name == "reorderSections":
        return _proposal(
            "reorder_sections",
            "调整简历模块顺序",
            reason,
            sectionIds=arguments.get("sectionIds", []),
        )
    if name == "renameResume":
        return _proposal(
            "rename_resume",
            "修改简历名称",
            reason,
            oldValue=resume.get("title"),
            newValue=arguments.get("title"),
        )
    if name == "suggestSkills":
        skills_section = next(
            (value for value in resume.get("sections", []) if value.get("type") == "skills"), None
        )
        if not skills_section:
            return {"success": False, "retryable": True, "error": "Skills section not found"}
        content = deepcopy(skills_section.get("content", {}))
        categories = content.setdefault("categories", [])
        category = next(
            (value for value in categories if value.get("name") == arguments.get("category")), None
        )
        if category:
            category["skills"] = list(
                dict.fromkeys([*category.get("skills", []), *arguments.get("skills", [])])
            )
        else:
            categories.append(
                {
                    "id": str(uuid4()),
                    "name": arguments.get("category"),
                    "skills": arguments.get("skills", []),
                }
            )
        return _proposal(
            "suggest_skills",
            "更新专业技能",
            reason,
            sectionId=skills_section["id"],
            updatedContent=content,
        )
    if name == "translateResume":
        return _proposal(
            "translate_resume",
            "翻译整份简历",
            reason,
            targetLanguage=arguments.get("targetLanguage"),
            changes=[],
        )
    if name == "switchTemplate":
        return _proposal(
            "switch_template",
            "切换简历模板",
            reason,
            oldValue=resume.get("template"),
            newValue=arguments.get("template"),
            template=arguments.get("template"),
        )
    if name in {"applyThemePreset", "updateThemeSettings"}:
        theme = deepcopy(resume.get("themeConfig") or {})
        theme.update(
            {
                key: value
                for key, value in arguments.items()
                if key != "reason" and value is not None
            }
        )
        operation = "apply_theme_preset" if name == "applyThemePreset" else "update_theme_settings"
        return _proposal(
            operation, "调整简历主题", reason, preset=arguments.get("preset"), themeConfig=theme
        )
    return {"success": False, "retryable": True, "error": f"Unsupported tool: {name}"}
