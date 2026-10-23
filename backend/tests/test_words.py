import pytest
from backend.app.words import amount_to_words_inr

def test_amount_to_words_zeros():
    assert amount_to_words_inr(0) == "Rupees Zero Only"
    assert amount_to_words_inr("0.00") == "Rupees Zero Only"

def test_amount_to_words_template_amount():
    # Exactly matching template amount
    assert amount_to_words_inr(65641) == "Rupees Sixty Five Thousand Six Hundred Forty One Only"
    assert amount_to_words_inr("65641.00") == "Rupees Sixty Five Thousand Six Hundred Forty One Only"

def test_amount_to_words_with_paise():
    assert amount_to_words_inr("65641.45") == "Rupees Sixty Five Thousand Six Hundred Forty One and Paise Forty Five Only"
    assert amount_to_words_inr("0.50") == "Paise Fifty Only"

def test_amount_to_words_large_crores():
    # 1,23,45,678
    words = amount_to_words_inr("12345678.90")
    assert words == "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Paise Ninety Only"

def test_amount_to_words_lakhs():
    assert amount_to_words_inr("500000.00") == "Rupees Five Lakh Only"
    assert amount_to_words_inr("141907.00") == "Rupees One Lakh Forty One Thousand Nine Hundred Seven Only"
