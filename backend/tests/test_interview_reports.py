from app.api.routes.interviews import (
    normalize_dimension_scores,
    normalize_improvement_plan,
    normalize_round_evaluations,
)


def test_normalizes_model_dimension_mapping_to_frontend_array() -> None:
    assert normalize_dimension_scores({"技术能力": 82, "沟通能力": {"score": 76}}) == [
        {"dimension": "技术能力", "score": 82, "maxScore": 100},
        {"dimension": "沟通能力", "score": 76, "maxScore": 100},
    ]


def test_normalizes_model_improvement_periods_to_cards() -> None:
    assert normalize_improvement_plan(
        {"shortTerm": "补充基础知识", "mediumTerm": "完成真实项目"}
    ) == [
        {
            "priority": "high",
            "area": "shortTerm",
            "description": "补充基础知识",
            "resources": [],
        },
        {
            "priority": "medium",
            "area": "mediumTerm",
            "description": "完成真实项目",
            "resources": [],
        },
    ]


def test_normalizes_round_summary_and_missing_question_arrays() -> None:
    assert normalize_round_evaluations(
        [{"roundId": "round-1", "score": "88", "summary": "良好"}]
    ) == [
        {
            "roundId": "round-1",
            "interviewerType": "",
            "interviewerName": "",
            "score": 88,
            "feedback": "良好",
            "questions": [],
        }
    ]
