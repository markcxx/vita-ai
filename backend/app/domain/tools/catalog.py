from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class ToolDefinition(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    input_schema: dict[str, Any]
    approval: Literal["never", "required"]
    status: Literal["contract-ready", "planned"]


LEGACY_TOOL_CATALOG = (
    ToolDefinition(
        name="resume.get",
        description="读取一份属于当前用户的简历及其模块。",
        input_schema={
            "type": "object",
            "properties": {"resumeId": {"type": "string"}},
            "required": ["resumeId"],
            "additionalProperties": False,
        },
        approval="never",
        status="contract-ready",
    ),
    ToolDefinition(
        name="resume.create",
        description="创建一份空白简历或基于已确认内容创建简历。",
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "minLength": 1, "maxLength": 200},
                "template": {"type": "string"},
                "language": {"type": "string", "enum": ["zh", "en"]},
            },
            "required": ["title", "template", "language"],
            "additionalProperties": False,
        },
        approval="required",
        status="contract-ready",
    ),
    ToolDefinition(
        name="resume.propose_patch",
        description="验证简历修改并生成用户可审阅的差异，不直接持久化。",
        input_schema={
            "type": "object",
            "properties": {
                "resumeId": {"type": "string"},
                "expectedVersion": {"type": "integer", "minimum": 0},
                "operations": {"type": "array", "minItems": 1, "items": {"type": "object"}},
            },
            "required": ["resumeId", "expectedVersion", "operations"],
            "additionalProperties": False,
        },
        approval="never",
        status="contract-ready",
    ),
    ToolDefinition(
        name="resume.commit_patch",
        description="提交已经由用户批准的简历修改。",
        input_schema={
            "type": "object",
            "properties": {
                "operationId": {"type": "string"},
                "idempotencyKey": {"type": "string"},
            },
            "required": ["operationId", "idempotencyKey"],
            "additionalProperties": False,
        },
        approval="required",
        status="planned",
    ),
    ToolDefinition(
        name="resume.update_appearance",
        description="切换模板或修改字体、颜色、间距等主题配置。",
        input_schema={
            "type": "object",
            "properties": {
                "resumeId": {"type": "string"},
                "template": {"type": "string"},
                "theme": {"type": "object"},
            },
            "required": ["resumeId"],
            "additionalProperties": False,
        },
        approval="required",
        status="contract-ready",
    ),
)


def _resume_tool(name: str, description: str, properties: dict[str, Any], required: list[str]):
    return ToolDefinition(
        name=name,
        description=description,
        input_schema={
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        },
        approval="never"
        if name in {"selectResumeTool", "analyzeJdMatch", "analyzeStudentStrengths"}
        else "required",
        status="contract-ready",
    )


_reason = {"reason": {"type": "string", "minLength": 1}}
_section = {"sectionId": {"type": "string"}}
_changes = {"changes": {"type": "array", "minItems": 1, "items": {"type": "object"}}}
_optimization_changes = {
    "changes": {
        "type": "array",
        "minItems": 1,
        "description": "最有价值的具体表达改进；列表模块的每条修改必须提供准确的 itemId。",
        "items": {
            "type": "object",
            "properties": {
                "sectionId": {
                    "type": "string",
                    "description": "当前简历中真实存在的模块 ID",
                },
                "itemId": {
                    "type": "string",
                    "description": "工作、项目、教育等列表模块中真实存在的条目 ID",
                },
                "field": {
                    "type": "string",
                    "description": "目标对象中真实存在且当前非空的字段名，如 text、description、highlights",
                },
                "value": {
                    "description": "字段的新值；直接传原生 JSON 值，禁止使用 newValue 或序列化字符串",
                },
                "issue": {
                    "type": "string",
                    "minLength": 1,
                    "description": "当前表达存在的具体问题",
                },
                "reason": {
                    "type": "string",
                    "minLength": 1,
                    "description": "新内容如何解决该问题",
                },
            },
            "required": ["sectionId", "field", "value", "issue", "reason"],
            "additionalProperties": False,
        },
    }
}

# Authoritative schemas exposed to both the model adapter and the frontend.
TOOL_CATALOG = LEGACY_TOOL_CATALOG + (
    _resume_tool(
        "analyzeStudentStrengths",
        "学生个人优势特点分析：用户要求结合个人资料分析优势、特点或生成个人优势报告时调用。只读取当前用户的个人资料库，界面自动生成可视化报告并在弹窗展示。",
        {}, [],
    ),
    _resume_tool(
        "prepareTailoredResume",
        "根据候选人档案准备一份新简历。用户要求创建、编写或生成简历时调用；职位描述可选，界面会负责模板选择。",
        {
            "targetRole": {"type": "string", "minLength": 1},
            "jobDescription": {"type": "string"},
            "language": {"type": "string", "enum": ["zh", "en"], "default": "zh"},
            **_reason,
        },
        ["targetRole", "reason"],
    ),
    _resume_tool(
        "selectResumeTool",
        "只选择一个最符合当前用户意图的简历工具。",
        {
            "toolName": {
                "type": "string",
                "enum": [
                    "analyzeStudentStrengths",
                    "optimizeResume",
                    "updateResumeFields",
                    "fillMissingFields",
                    "rewriteText",
                    "addResumeItem",
                    "removeResumeItem",
                    "addSection",
                    "removeSection",
                    "renameSection",
                    "reorderSections",
                    "setSectionVisibility",
                    "renameResume",
                    "suggestSkills",
                    "analyzeJdMatch",
                    "translateResume",
                    "switchTemplate",
                    "applyThemePreset",
                    "updateThemeSettings",
                ],
            },
        },
        ["toolName"],
    ),
    _resume_tool(
        "optimizeResume",
        "审阅指定范围并生成一组有事实依据的表达优化提案。",
        {
            "scopeSectionId": {"type": "string"},
            **_optimization_changes,
            **_reason,
        },
        ["changes", "reason"],
    ),
    _resume_tool(
        "updateResumeFields",
        "修改现有模块或条目的非空字段。",
        {
            **_section,
            "itemId": {"type": "string"},
            **_changes,
            **_reason,
        },
        ["sectionId", "changes", "reason"],
    ),
    _resume_tool(
        "fillMissingFields",
        "只填写现有模块或条目中当前为空的字段。",
        {
            **_section,
            "itemId": {"type": "string"},
            **_changes,
            **_reason,
        },
        ["sectionId", "changes", "reason"],
    ),
    _resume_tool(
        "rewriteText",
        "在不改变事实的前提下改写一个现有文本字段。",
        {
            **_section,
            "itemId": {"type": "string"},
            "field": {"type": "string"},
            "improvedText": {"type": "string"},
            **_reason,
        },
        ["sectionId", "field", "improvedText", "reason"],
    ),
    _resume_tool(
        "addResumeItem",
        "向现有列表模块添加一条新经历、项目、教育等条目。",
        {
            **_section,
            "item": {"type": "object"},
            **_reason,
        },
        ["sectionId", "item", "reason"],
    ),
    _resume_tool(
        "removeResumeItem",
        "删除现有列表模块中的一条记录。",
        {
            **_section,
            "itemId": {"type": "string"},
            **_reason,
        },
        ["sectionId", "itemId", "reason"],
    ),
    _resume_tool(
        "addSection",
        "添加当前简历中不存在的新模块。",
        {
            "type": {"type": "string"},
            "title": {"type": "string"},
            "content": {"type": "object"},
            **_reason,
        },
        ["type", "title", "reason"],
    ),
    _resume_tool(
        "removeSection",
        "删除一个现有模块（个人信息模块除外）。",
        {**_section, **_reason},
        ["sectionId", "reason"],
    ),
    _resume_tool(
        "renameSection",
        "修改一个现有模块的显示名称。",
        {**_section, "title": {"type": "string"}, **_reason},
        ["sectionId", "title", "reason"],
    ),
    _resume_tool(
        "reorderSections",
        "调整全部简历模块的显示顺序。",
        {
            "sectionIds": {"type": "array", "items": {"type": "string"}},
            **_reason,
        },
        ["sectionIds", "reason"],
    ),
    _resume_tool(
        "setSectionVisibility",
        "显示或隐藏一个现有模块。",
        {
            **_section,
            "visible": {"type": "boolean"},
            **_reason,
        },
        ["sectionId", "visible", "reason"],
    ),
    _resume_tool(
        "renameResume",
        "修改简历文档名称。",
        {"title": {"type": "string"}, **_reason},
        ["title", "reason"],
    ),
    _resume_tool(
        "suggestSkills",
        "只添加能由当前简历或候选人档案证明的技能。",
        {
            "skills": {"type": "array", "items": {"type": "string"}},
            "category": {"type": "string"},
            **_reason,
        },
        ["skills", "category", "reason"],
    ),
    _resume_tool(
        "analyzeJdMatch",
        "分析简历与职位描述的匹配情况，缺失要求只能报告为能力缺口。",
        {
            "jobDescription": {"type": "string"},
        },
        ["jobDescription"],
    ),
    _resume_tool(
        "translateResume",
        "翻译整份简历并保留 ID、URL、邮箱、数字和 JSON 结构。",
        {
            "targetLanguage": {"type": "string", "enum": ["zh", "en"]},
        },
        ["targetLanguage"],
    ),
    _resume_tool(
        "switchTemplate",
        "切换简历模板并保留全部内容。",
        {
            "template": {"type": "string"},
            **_reason,
        },
        ["template", "reason"],
    ),
    _resume_tool(
        "applyThemePreset",
        "应用内置主题预设。",
        {
            "preset": {"type": "string"},
            **_reason,
        },
        ["preset", "reason"],
    ),
    _resume_tool(
        "updateThemeSettings",
        "调整颜色、字体、间距、页边距和头像样式。",
        {
            "primaryColor": {"type": "string"},
            "accentColor": {"type": "string"},
            "fontFamily": {"type": "string"},
            "fontSize": {"type": "string"},
            "lineSpacing": {"type": "number"},
            "sectionSpacing": {"type": "number"},
            "margin": {"type": "object"},
            "avatarStyle": {"type": "string"},
            **_reason,
        },
        ["reason"],
    ),
)
