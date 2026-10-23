from decimal import Decimal
from typing import Union
from .calculations import to_decimal, round_currency

ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
]

TENS = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
]

def _convert_two_digits(n: int) -> str:
    """Converts a number 0..99 into words."""
    if n < 20:
        return ONES[n]
    tens = TENS[n // 10]
    ones = ONES[n % 10]
    if tens and ones:
        return f"{tens} {ones}"
    return tens or ones

def _convert_three_digits(n: int) -> str:
    """Converts a number 0..999 into words."""
    hundred = n // 100
    rem = n % 100
    parts = []
    if hundred > 0:
        parts.append(f"{ONES[hundred]} Hundred")
    if rem > 0:
        parts.append(_convert_two_digits(rem))
    return " ".join(parts)

def number_to_words_indian(num: int) -> str:
    """Converts an integer into Indian numbering format words (Crores, Lakhs, Thousands, Hundreds)."""
    if num == 0:
        return "Zero"
    
    parts = []
    
    # Crores: num // 10,000,000
    crores = num // 10000000
    num %= 10000000
    if crores > 0:
        parts.append(f"{number_to_words_indian(crores)} Crore")
        
    # Lakhs: num // 100,000
    lakhs = num // 100000
    num %= 100000
    if lakhs > 0:
        parts.append(f"{_convert_two_digits(lakhs)} Lakh")
        
    # Thousands: num // 1,000
    thousands = num // 1000
    num %= 1000
    if thousands > 0:
        parts.append(f"{_convert_two_digits(thousands)} Thousand")
        
    # Hundreds & below: num
    if num > 0:
        parts.append(_convert_three_digits(num))
        
    return " ".join(parts).strip()

def amount_to_words_inr(amount: Union[Decimal, float, int, str]) -> str:
    """
    Converts a currency amount into full Indian Rupee words.
    Examples:
    65641.00 -> 'Rupees Sixty Five Thousand Six Hundred Forty One Only'
    65641.45 -> 'Rupees Sixty Five Thousand Six Hundred Forty One and Paise Forty Five Only'
    0.50     -> 'Paise Fifty Only'
    0.00     -> 'Rupees Zero Only'
    """
    d = round_currency(to_decimal(amount))
    if d < Decimal("0.00"):
        sign_str = "Negative "
        d = abs(d)
    else:
        sign_str = ""
        
    int_part = int(d)
    paise_part = int((d - Decimal(int_part)) * 100)
    
    if int_part == 0 and paise_part == 0:
        return f"{sign_str}Rupees Zero Only"
        
    words_parts = []
    
    if int_part > 0:
        words_parts.append(f"Rupees {number_to_words_indian(int_part)}")
        
    if paise_part > 0:
        paise_words = _convert_two_digits(paise_part)
        if int_part > 0:
            words_parts.append(f"and Paise {paise_words}")
        else:
            words_parts.append(f"Paise {paise_words}")
            
    result = " ".join(words_parts) + " Only"
    return f"{sign_str}{result}"
