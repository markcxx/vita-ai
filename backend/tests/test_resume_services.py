from app.services.resumes import build_tailored_sections


def test_tailored_sections_only_materialize_profile_records_selected_by_id() -> None:
    profile = {
        "personalInfo": {"fullName": "候选人"},
        "experiences": [
            {
                "id": "exp-1",
                "company": "真实公司",
                "position": "工程师",
                "current": True,
                "description": "原描述",
                "highlights": ["原亮点"],
            }
        ],
        "education": [],
        "projects": [],
        "skills": [{"id": "skill-1", "name": "后端", "skills": ["Python"]}],
        "certifications": [],
        "languages": [],
    }
    plan = {
        "summary": "面向后端岗位",
        "experiences": [
            {
                "sourceId": "exp-1",
                "description": "真实经历的专业化改写",
                "highlights": ["改写亮点"],
            },
            {"sourceId": "invented", "description": "虚构经历", "highlights": []},
        ],
        "education": [],
        "projects": [],
        "skillCategoryIds": ["skill-1", "invented"],
        "certificationIds": [],
        "languageIds": [],
    }

    sections = build_tailored_sections(profile, plan, "后端工程师")
    personal = next(item for item in sections if item["type"] == "personal_info")
    work = next(item for item in sections if item["type"] == "work_experience")
    skills = next(item for item in sections if item["type"] == "skills")

    assert personal["content"]["jobTitle"] == "后端工程师"
    assert len(work["content"]["items"]) == 1
    assert work["content"]["items"][0]["company"] == "真实公司"
    assert work["content"]["items"][0]["description"] == "真实经历的专业化改写"
    assert len(skills["content"]["categories"]) == 1
    assert skills["content"]["categories"][0]["skills"] == ["Python"]
