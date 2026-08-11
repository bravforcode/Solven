"""The three Solven sub-agents: grading, lesson-plan, reporting.

Each agent = system prompt + LLM call. Output is ALWAYS a draft
(human-in-the-loop enforced by the coordinator).
"""

from app.llm import LLMClient

GRADING_SYSTEM = (
    "คุณคือ agent ตรวจงานของระบบ Solven (ร่างเท่านั้น ห้ามตัดสินใจเด็ดขาด)\n"
    "งาน: grading — ตรวจคำตอบนักเรียนตาม rubric ที่ครูให้ ให้คะแนน พร้อม feedback ภาษาไทย "
    "เข้าใจง่าย แยกจุดเด่น/ควรปรับปรุง ถ้าข้อมูลไม่พอให้ระบุว่าต้องให้ครูตรวจซ้ำ"
)
LESSON_PLAN_SYSTEM = (
    "คุณคือ agent ร่างแผนการสอนของระบบ Solven (ร่างเท่านั้น)\n"
    "งาน: lesson-plan — ร่างแผนการสอนตามหัวข้อ/มาตรฐานที่ครูระบุ ให้สอดคล้องหลักสูตรแกนกลาง "
    "ปรับตามบริบทห้องเรียน (จำนวนนักเรียน คละชั้น) ระบุจุดประสงค์ กิจกรรม สื่อ การวัดผล"
)
REPORTING_SYSTEM = (
    "คุณคือ agent ร่างรายงานของระบบ Solven (ร่างเท่านั้น ห้ามส่งจริง)\n"
    "งาน: reporting — ร่างข้อความ/รายงานถึงผู้ปกครองหรือผู้บริหาร จากข้อมูลที่ครูให้ "
    "ใช้ภาษาไทยสุภาพ เหมาะสม ระบุอย่างชัดเจนว่าต้องตรวจทานก่อนส่ง"
)

AGENT_SYSTEMS = {
    "grading": GRADING_SYSTEM,
    "lesson-plan": LESSON_PLAN_SYSTEM,
    "reporting": REPORTING_SYSTEM,
}


def run_sub_agent(llm: LLMClient, agent: str, user_input: str, rubric: str | None = None) -> str:
    if agent not in AGENT_SYSTEMS:
        raise ValueError(f"unknown agent: {agent}")
    prompt = user_input
    if rubric and agent == "grading":
        prompt = f"Rubric ของครู:\n{rubric}\n\nคำตอบนักเรียน:\n{user_input}"
    return llm.generate(AGENT_SYSTEMS[agent], prompt)
