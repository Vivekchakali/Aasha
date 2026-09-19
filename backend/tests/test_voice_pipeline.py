import pytest
from services.voice_parser import parse_voice_transcript
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine

def test_user_reported_bug_1024_seetha_kumar():
    """
    Direct verification of the user's reported bug:
    '1024 Seetha Kumar age 27 one child'
    Must extract:
      - Household ID: H1024
      - Member Name: Seetha Kumar
      - Age: 27
      - Children: 1
    Must NOT fabricate:
      - Gender (Not mentioned)
      - Pregnancy status (Not mentioned)
      - Blood pressure (Not mentioned)
      - Immunization status (Not mentioned)
    """
    text = "1024 Seetha Kumar age 27 one child"
    result = parse_voice_transcript(text)
    extracted = result['extracted_fields']
    not_mentioned = [f['label'] for f in result['not_mentioned_fields']]

    # 1. Verification of extracted fields
    assert extracted['household_id'] == "H1024"
    assert extracted['member_name'] == "Seetha Kumar"
    assert extracted['age'] == 27
    assert extracted['children_count'] == 1

    # 2. Verification of strict non-fabrication
    assert 'gender' not in extracted
    assert 'pregnant' not in extracted
    assert 'blood_pressure' not in extracted
    assert 'immunization_status' not in extracted

    # 3. Verification of presence in NOT MENTIONED section
    assert 'Gender' in not_mentioned
    assert 'Pregnancy Status' in not_mentioned
    assert 'Blood Pressure' in not_mentioned
    assert 'Immunization Status' in not_mentioned

def test_multi_field_sentence_english():
    """
    Test: 'Household 1024, Seetha Kumar, age 27, one child, follow-up after 14 days.'
    """
    text = "Household 1024, Seetha Kumar, age 27, one child, follow-up after 14 days."
    res = parse_voice_transcript(text)
    ext = res['extracted_fields']

    assert ext['household_id'] == "H1024"
    assert ext['member_name'] == "Seetha Kumar"
    assert ext['age'] == 27
    assert ext['children_count'] == 1
    assert ext['follow_up_required'] is True
    assert ext['follow_up_days'] == 14
    assert ext['follow_up_interval'] == "14 days"

def test_maternal_visit_sentence_english():
    """
    Test: 'Sita Kumar is 27 years old, pregnant for 5 months, blood pressure 120 over 80.'
    """
    text = "Sita Kumar is 27 years old, pregnant for 5 months, blood pressure 120 over 80."
    res = parse_voice_transcript(text)
    ext = res['extracted_fields']

    assert ext['member_name'] == "Sita Kumar"
    assert ext['age'] == 27
    assert ext['pregnant'] is True
    assert ext['pregnancy_month'] == 5
    assert ext['maternal_age'] == 27
    assert ext['gestational_age'] == 22
    assert "120/80" in ext['blood_pressure']

    # Non-fabrication check
    assert 'children_count' not in ext
    assert 'immunization_status' not in ext

def test_child_immunization_english():
    """
    Test: 'Anjali is 4 years old and vaccination is complete.'
    """
    text = "Anjali is 4 years old and vaccination is complete."
    res = parse_voice_transcript(text)
    ext = res['extracted_fields']

    assert "Anjali" in ext['member_name']
    assert ext['age'] == 4
    assert ext['immunization_status'] == "Complete"
    assert ext['children_count'] == 1

def test_telugu_speech_extraction():
    """
    Comprehensive tests for Telugu phrases (te-IN)
    """
    # 1. Name & Age
    res1 = parse_voice_transcript("సీత కుమార్ వయసు 27 సంవత్సరాలు")
    assert res1['language'] == 'te'
    assert res1['extracted_fields']['member_name'] == "Seetha Kumar"
    assert res1['extracted_fields']['age'] == 27

    # 2. Pregnancy & Month
    res2 = parse_voice_transcript("సీత కుమార్ ఐదు నెలల గర్భిణి")
    assert res2['extracted_fields']['pregnant'] is True
    assert res2['extracted_fields']['pregnancy_month'] == 5

    # 3. Blood Pressure
    res3 = parse_voice_transcript("రక్తపోటు 120 బై 80")
    assert "120/80" in res3['extracted_fields']['blood_pressure']

    # 4. Children
    res4 = parse_voice_transcript("ఒక బిడ్డ ఉంది")
    assert res4['extracted_fields']['children_count'] == 1

    # 5. Follow-up
    res5 = parse_voice_transcript("14 రోజుల తర్వాత ఫాలో అప్ అవసరం")
    assert res5['extracted_fields']['follow_up_required'] is True
    assert res5['extracted_fields']['follow_up_days'] == 14

    # 6. Combined Full Visit
    res6 = parse_voice_transcript("కుటుంబం 1024, సీత కుమార్, వయసు 27 సంవత్సరాలు, ఒక బిడ్డ ఉంది, 14 రోజుల తర్వాత ఫాలో అప్ అవసరం.")
    assert res6['extracted_fields']['household_id'] == "H1024"
    assert res6['extracted_fields']['member_name'] == "Seetha Kumar"
    assert res6['extracted_fields']['age'] == 27
    assert res6['extracted_fields']['children_count'] == 1
    assert res6['extracted_fields']['follow_up_required'] is True
    assert res6['extracted_fields']['follow_up_days'] == 14

def test_hindi_speech_extraction():
    """
    Comprehensive tests for Hindi phrases (hi-IN)
    """
    # 1. Name & Age
    res1 = parse_voice_transcript("सीता कुमार की उम्र 27 साल है")
    assert res1['language'] == 'hi'
    assert res1['extracted_fields']['member_name'] == "Seetha Kumar"
    assert res1['extracted_fields']['age'] == 27

    # 2. Pregnancy & Month
    res2 = parse_voice_transcript("सीता कुमार पांच महीने की गर्भवती हैं")
    assert res2['extracted_fields']['pregnant'] is True
    assert res2['extracted_fields']['pregnancy_month'] == 5

    # 3. Blood Pressure
    res3 = parse_voice_transcript("ब्लड प्रेशर 120 बटा 80 है")
    assert "120/80" in res3['extracted_fields']['blood_pressure']

    # 4. Children
    res4 = parse_voice_transcript("एक बच्चा है")
    assert res4['extracted_fields']['children_count'] == 1

    # 5. Follow-up
    res5 = parse_voice_transcript("14 दिन बाद फॉलो अप चाहिए")
    assert res5['extracted_fields']['follow_up_required'] is True
    assert res5['extracted_fields']['follow_up_days'] == 14

    # 6. Combined Full Visit
    res6 = parse_voice_transcript("परिवार 1024, सीता कुमार, उम्र 27 साल, एक बच्चा है, 14 दिन बाद फॉलो अप चाहिए.")
    assert res6['extracted_fields']['household_id'] == "H1024"
    assert res6['extracted_fields']['member_name'] == "Seetha Kumar"
    assert res6['extracted_fields']['age'] == 27
    assert res6['extracted_fields']['children_count'] == 1
    assert res6['extracted_fields']['follow_up_required'] is True
    assert res6['extracted_fields']['follow_up_days'] == 14

def test_number_words_and_indic_digits():
    """
    Verify numeric words and Indic numerals across languages
    """
    # Indic Telugu numerals (౨౭ -> 27)
    res_te = parse_voice_transcript("వయసు ౨౭ సంవత్సరాలు")
    assert res_te['extracted_fields']['age'] == 27

    # Indic Devanagari numerals (२७ -> 27)
    res_hi = parse_voice_transcript("उम्र २७ साल")
    assert res_hi['extracted_fields']['age'] == 27

    # Spoken English compound words
    res_en = parse_voice_transcript("age twenty-seven years old")
    assert res_en['extracted_fields']['age'] == 27

    # Spoken Hindi words
    res_hi_words = parse_voice_transcript("सीता कुमार उम्र सत्ताईस साल")
    assert res_hi_words['extracted_fields']['member_name'] == "Seetha Kumar"

def test_blood_pressure_variations():
    """
    Verify variations of spoken blood pressure
    """
    variations = [
        ("blood pressure 120/80", "120/80 mmHg"),
        ("blood pressure 120 over 80", "120/80 mmHg"),
        ("blood pressure 120 by 80", "120/80 mmHg"),
        ("రక్తపోటు 120 బై 80", "120/80 mmHg"),
        ("ब्लड प्रेशर 120 बटा 80", "120/80 mmHg")
    ]
    for text, expected in variations:
        res = parse_voice_transcript(text)
        assert res['extracted_fields']['blood_pressure'] == expected

def test_strict_non_fabrication():
    """
    Verify that absence of medical facts never results in assumed or hallucinated values
    """
    text = "Rajesh Kumar visited today for general consultation."
    res = parse_voice_transcript(text)
    ext = res['extracted_fields']
    not_mentioned = [f['label'] for f in res['not_mentioned_fields']]

    assert ext.get('member_name') == "Rajesh Kumar"
    # Never infer gender from name
    assert 'gender' not in ext
    assert 'Gender' in not_mentioned

    # Never infer pregnancy
    assert 'pregnant' not in ext
    assert 'Pregnancy Status' in not_mentioned

    # Never infer blood pressure
    assert 'blood_pressure' not in ext
    assert 'Blood Pressure' in not_mentioned

    # Never infer immunization
    assert 'immunization_status' not in ext
    assert 'Immunization Status' in not_mentioned

def test_voice_to_encounter_workflow_mapping():
    """
    End-to-end integration test:
    Voice Parser -> Confirmed Structured Data -> Normalization -> Mapping Engine -> Multi-Programme Output
    """
    spoken_text = "Household 1024. Seetha Kumar is 27 years old and five months pregnant. Blood pressure is 120 over 80. She needs follow-up after 14 days."
    voice_res = parse_voice_transcript(spoken_text)
    extracted = voice_res['extracted_fields']

    # Worker confirms extracted values and maps to encounter payload
    encounter_payload = {
        "household_id": extracted["household_id"],
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "member_name": extracted["member_name"],
        "age": extracted["age"],
        "gender": "Female", # worker provides during review
        "relationship_to_head": "Spouse",
        "pregnant": extracted["pregnant"],
        "pregnancy_month": extracted["pregnancy_month"],
        "gestational_age": extracted["gestational_age"],
        "blood_pressure": extracted["blood_pressure"],
        "follow_up_required": extracted["follow_up_required"],
        "follow_up_days": extracted["follow_up_days"]
    }

    normalized, errors = normalize_encounter(encounter_payload)
    assert not errors

    mapping_result = run_mapping_engine(normalized)
    progs = {p['code']: p['payload'] for p in mapping_result['generated_programmes']}

    # Verify multi-programme outputs generated deterministically
    assert "MATERNAL_HEALTH" in progs
    assert progs["MATERNAL_HEALTH"]["beneficiary_name"] == "Seetha Kumar"
    assert progs["MATERNAL_HEALTH"]["pregnancy_month"] == 5

    assert "HOUSEHOLD_REGISTER" in progs
    assert progs["HOUSEHOLD_REGISTER"]["household_id"] == "H1024"

    assert "FOLLOW_UP" in progs
    assert progs["FOLLOW_UP"]["follow_up_days"] == 14

def test_user_reported_nimika_extraction_and_mobile():
    """
    Test user reported phrase: 'nimika age 27 one child'
    Verifies that 'Nimika' is extracted as Member Name and stored,
    and mobile numbers in transcripts are also extracted.
    """
    res = parse_voice_transcript("nimika age 27 one child", "en")
    assert res['extracted_fields']['member_name'] == "Nimika"
    assert res['extracted_fields']['age'] == 27
    assert res['extracted_fields']['children_count'] == 1

    # Verify fields_detail has Member Name
    labels = [f['label'] for f in res['fields_detail']]
    assert "Member Name" in labels
    assert "Age" in labels
    assert "Children" in labels

    # Test with mobile number included
    res_mob = parse_voice_transcript("nimika age 27 mobile 9876543210 one child", "en")
    assert res_mob['extracted_fields']['member_name'] == "Nimika"
    assert res_mob['extracted_fields']['phone_number'] == "9876543210"
    mob_detail = next(f for f in res_mob['fields_detail'] if f['key'] == 'phone_number')
    assert "98XXXX3210" in mob_detail['display_value']

