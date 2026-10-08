import re
from typing import Optional
from pydantic import BaseModel

class ParsedSalarySMS(BaseModel):
    is_salary: bool
    amount: Optional[float] = None
    bank: Optional[str] = None
    account_last4: Optional[str] = None
    confidence: float = 0.0
    raw_text: str

SALARY_KEYWORDS = ['salary', 'sal', 'payroll', 'wages', 'corp', 'credited by', 'neft-', 'ach credit', 'direct dep', 'monthly payout']
CREDIT_KEYWORDS = ['credited', 'deposited', 'received', 'added to your a/c']

def parse_bank_sms(text: str, sender: str = '') -> ParsedSalarySMS:
    clean_text = text.replace('\n', ' ').strip()
    is_credit = any(re.search(rf'\b{kw}\b', clean_text, re.IGNORECASE) for kw in CREDIT_KEYWORDS)
    if not is_credit:
        return ParsedSalarySMS(is_salary=False, raw_text=clean_text)

    amount_match = re.search(r'(?:rs\.?|inr|credited\s+(?:with|by)?)\s*[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)', clean_text, re.IGNORECASE)
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else None

    acc_match = re.search(r'(?:a\/c|ac|account|ending|card)\s*(?:no\.?)?\s*[:\s]*[xX\*]*([0-9]{4})', clean_text, re.IGNORECASE)
    account_last4 = acc_match.group(1) if acc_match else None

    has_salary_keyword = any(k in clean_text.lower() for k in SALARY_KEYWORDS)
    confidence = 0.95 if has_salary_keyword else (0.65 if (amount and amount >= 25000) else 0.0)
    is_salary = is_credit and (has_salary_keyword or (amount is not None and amount >= 30000))

    return ParsedSalarySMS(
        is_salary=is_salary,
        amount=amount,
        bank=sender.upper() if sender else 'BANK',
        account_last4=account_last4,
        confidence=confidence,
        raw_text=clean_text
    )
