# ASHA OneCapture

> *"One Visit. One Entry. Multiple Records."*

**Track:** KALACHAKRA 2K26 — Healthcare & Biotech Track  
**Problem Statement:** PS-H02 — ONE WORKER, FIVE SYSTEMS  
**Status:** Deployable Prototype (Complete Full-Stack Application)

---

## 1. Executive Summary & Problem Context

In community healthcare systems across India, **Accredited Social Health Activists (ASHAs)** serve as the frontline healthcare link for rural and semi-urban populations. During a single household visit, an ASHA worker routinely gathers multi-domain clinical and demographic information:
- Household census & sanitation baseline
- Individual member profiles and family relationships
- Maternal health, gestational progress, and prenatal care
- Infant & child immunization adherence
- Clinical vital signs (BP, temperature, weight, hemoglobin), symptom reporting, and danger signs
- Scheduled follow-up needs

### The "Five Systems" Challenge
Historically, this encounter information must be transcribed separately across multiple disparate registers, physical books, and health programme portals (e.g., Maternal & Child Tracking, Universal Immunisation, Census Registers, Follow-up Diaries). This creates:
1. **Severe Repetitive Data Entry**: Identical baseline parameters (Household ID, village, visit date, patient demographics) are manually written 4 to 5 times per visit.
2. **Duplicated & Fragmented Documentation**: Discrepancies between registers arise from manual transcription fatigue.
3. **High Administrative Burden**: Community workers spend disproportionate time on repetitive clerical logging rather than hands-on patient education and compassionate care.

---

## 2. The Solution: ASHA OneCapture

**ASHA OneCapture** solves the multi-system burden by inverting the workflow:

```
                    ONE HOUSEHOLD VISIT
                             ↓
              HOUSEHOLD MEMBER DATA REUSE
          (Pre-fills demographic info automatically)
                             ↓
                    ONE ENCOUNTER ENTRY
        (Multilingual Voice: English, Telugu, Hindi)
                             ↓
                     DATA NORMALIZATION
                   (Ages, Dates, Booleans)
                             ↓
                  RULE-BASED MAPPING ENGINE
                (Deterministic, Transparent)
                             ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
   MATERNAL HEALTH       IMMUNISATION     HOUSEHOLD REGISTER
     RECORD SCHEMA      RECORD SCHEMA        CENSUS SCHEMA
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ↓
                   FOLLOW-UP ACTION RECORD
```

**Core Principle:** *Capture once. Validate. Map deterministically. Generate multiple structured outputs.*

---

## 3. Key Upgrades & Architectural Features

### A. Household Member Management
- **Individual Member Entity (`HouseholdMember`)**:
  - Member ID (`M1024-01`, `M1024-02`), Full Name, Age, Gender, Relationship to Head, Phone Number.
  - Conditional pregnancy status with pregnancy month (1–9) and gestational age.
  - Child status with vaccination record (`Complete`, `Partial`, `Pending`).
  - Health notes and clinical observations.
- **Full CRUD Support**:
  - Add Member, Edit Member, Delete Member, and View Members per Household.
  - Dedicated **"Households & Members"** registry view in UI.

### B. Member Data Reuse in Encounters
- **Separation of Concerns**:
  - **Persistent Data** (belongs to Household/Member): Household ID, village, head of family, member ID, name, age, gender, relation.
  - **Visit Encounter Data** (today's clinical visit): Blood pressure, weight, hemoglobin (Hb), temperature, symptoms, danger signs, visit date, follow-up needed.
- **Instant Pre-fill**:
  - When the ASHA worker selects an existing Household and Member, demographic fields are pre-filled automatically.
  - If the member is pregnant or a child, the corresponding sections activate automatically.
  - The worker only enters today's new clinical vitals, eliminating repetitive data entry.

### C. Multilingual Speech-to-Text Support
- **Supported Languages**:
  1. **English (India)** — `en-IN`
  2. **తెలుగు (Telugu)** — `te-IN`
  3. **हिंदी (Hindi)** — `hi-IN`
- **Dynamic Recognition**:
  - Uses browser Web Speech API dynamically configured to the selected language.
  - Built-in demonstration speech presets for all 3 languages:
    - *Telugu:* `"సీత కుమార్ ఐదు నెలల గర్భిణి. రక్తపోటు నూట ఇరవై ఎనభై. రెండు వారాల తర్వాత ఫాలో అప్."`
    - *Hindi:* `"सीता कुमार पाँच महीने की गर्भवती हैं. रक्तचाप एक सौ बीस अस्सी. दो सप्ताह बाद फॉलो अप."`
    - *English:* `"Sita Kumar 5 months pregnant. Blood pressure 120/80. Follow-up required after two weeks."`
- **Safety Rule & Human Confirmation**:
  - Rule-based extraction (Name, Pregnant, Month, Vitals, Follow-up).
  - Explicit confirmation modal with `[Confirm & Apply to Visit]` and `[Refine / Edit Text]` buttons.
  - Unconfirmed or missing facts are explicitly flagged. No silent hallucination of medical data.

### D. Multilingual UI (`translations.js`)
- Centralized dictionary for English (`en`), Telugu (`te`), and Hindi (`hi`).
- Instant language switcher in the top navigation header (`EN` | `తెలుగు` | `हिंदी`).
- Preserves technical IDs, database codes, and programme formats untranslated.

### E. Enhanced Mapping Engine with Member Tracing
- Connects: `Household` $\to$ `HouseholdMember` $\to$ `Encounter` $\to$ `Normalized Data` $\to$ Multiple Programme Outputs.
- Traces individual member name and member ID directly into:
  - **Maternal Health Record**: Beneficiary name, member ID, gestational weeks, pregnancy month, prenatal BP, weight, Hb.
  - **Child Immunisation Record**: Child name, age, vaccination adherence, overdue status.
  - **Household Register**: Active member roster, demographic vital signs.
  - **Follow-up Record**: Targeted member name, due date, clinical rationale.
- Dynamic visual flow diagram traces field mappings in real time.

### F. Validation & Medical Safety
- Pregnancy validation checks:
  - Gender must be Female (or Other; rejected for Male).
  - Plausible maternal age range (12–55 years).
  - Plausible pregnancy month range (1–9).
- Clean validation banners and inline alerts.

### G. Production-Ready Multilingual SMS Architecture
- **Dual Provider Abstraction**:
  - `MockSMSProvider`: Deterministic, offline-first simulation returning mock message IDs (`MOCK-SM...`) without outbound network calls or API costs.
  - `TwilioSMSProvider`: Real production SMS dispatch via Twilio REST API with error handling, credential validation, and status callback webhooks.
- **Rule-Based Multilingual Templates**:
  - Deterministic reminder templates for **Vaccination**, **Iron & Folic Acid (IFA) Tablets**, **Medication / Health Follow-up**, and **General Follow-up**.
  - Localized in **English**, **తెలుగు (Telugu)**, and **हिंदी (Hindi)**.
  - **Clean Beneficiary Message Body**: Beneficiary-facing message text contains *strictly reminder content* with zero mock tags or debug prefixes. Mock execution is signaled cleanly via UI badges and database attributes.
- **2-Step Explicit Confirmation Workflow**:
  - Follow-up Created $\to$ Real-Time 13-Point Eligibility Check $\to$ Generated SMS Draft $\to$ Preview & Edit Modal $\to$ Explicit Confirmation Dialog $\to$ Dispatch.
- **24-Hour Cooldown & 3-Attempt Retry Logic**:
  - Enforces duplicate prevention cooldown (`SMS_COOLDOWN_HOURS=24`).
  - Allows manual retry for failed dispatches with automatic backoff cap (`SMS_MAX_RETRIES=3`).
- **Automatic Lifecycle Cancellation**:
  - Marking a follow-up as `completed` or completing the underlying clinical action immediately cancels all pending/generated SMS drafts.
- **Privacy & Phone Number Masking**:
  - All phone numbers stored in normalized E.164 format (`+919876543210`) and masked across all user-facing screens and logs (`+91******3210`).

### H. Global Data Retrieval & Smart Search
- **Category-Based Health Registry Queries**:
  - `MATERNAL`: High-risk pregnancies, gestational age, ANC checkups.
  - `CHILD`: Infants and children under 2, immunization tracking.
  - `IRON_TABLETS`: Beneficiaries requiring IFA tablet distribution.
  - `FOLLOW_UPS`: Pending and overdue follow-up action items.
  - `SMS_LOG`: Centralized SMS communication history with delivery statuses, provider modes, and retry triggers.
  - `PEOPLE`: Master demographic census index with masked contacts.
- **Multi-Parameter Filtering & Natural Language Search**:
  - Filter by village area, risk tier, vaccination adherence, SMS status, and date intervals.
  - Safe, deterministic natural language intent parser translating search queries into structured filters.
- **Audited CSV Export**:
  - One-click CSV export for offline field visits with automated HIPAA/privacy audit logging.

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| **Backend** | Python 3.13, Flask 3.0, SQLAlchemy 2.0, Werkzeug |
| **Messaging** | Twilio REST API (`twilio==9.11.1`), Mock SMS Provider |
| **Database** | SQLite3 (`asha_onecapture.db`) |
| **Voice** | Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |
| **Testing** | Pytest 9.0 (56 automated tests covering all modules with 100% pass rate) |

---

## 5. API Endpoints

### Health & Auth
- `GET /api/health` — System health and version status.
- `POST /api/auth/login` — Authentication (`asha`/`asha123`, `admin`/`admin123`).

### Households & Members
- `GET /api/households` — List all households with member roster.
- `POST /api/households` — Create a new household.
- `GET /api/households/<id>` — Get single household with members.
- `GET /api/households/<id>/members` — Get all members of a household.
- `POST /api/households/<id>/members` — Add a new member.
- `PUT /api/households/members/<id>` — Update existing member.
- `DELETE /api/households/members/<id>` — Delete member record.

### Encounters & Processing
- `GET /api/encounters` — List historical encounters.
- `POST /api/encounters` — Submit draft encounter.
- `GET /api/encounters/<id>` — Retrieve encounter details & impact calculation.
- `POST /api/encounters/<id>/process` — Execute deterministic mapping engine.
- `GET /api/encounters/<id>/outputs` — Retrieve generated programme records.
- `GET /api/encounters/<id>/mappings` — Retrieve field mapping trace and flow graph.

### SMS Architecture & Notifications
- `GET /api/sms` — List SMS messages with pagination, filters (status, type, provider).
- `GET /api/sms/<id>` — Retrieve detailed SMS record with masked phone.
- `POST /api/sms/generate` — Generate reviewed SMS draft from follow-up or member.
- `POST /api/sms/<id>/send` — Explicitly send or simulate reviewed SMS.
- `POST /api/sms/<id>/cancel` — Cancel pending SMS reminder.
- `POST /api/sms/<id>/retry` — Retry failed SMS reminder (up to 3 attempts).
- `POST /api/sms/twilio/status` — Twilio delivery status webhook callback.
- `GET /api/sms/stats` — Real-time SMS statistics (total, sent, delivered, failed, pending, provider mode).
- `POST /api/followups/<id>/send-sms` — Direct SMS trigger for follow-up item.

### Global Data Retrieval & Search
- `GET /api/retrieval` — Smart query engine supporting categories (`MATERNAL`, `CHILD`, `IRON_TABLETS`, `FOLLOW_UPS`, `SMS_LOG`, `PEOPLE`), search queries, and CSV export.
- `GET /api/retrieval/filters` — Available filter facets and village areas.

### Multilingual Voice
- `POST /api/voice/parse` — Parse multilingual speech transcript (Telugu, Hindi, English).

### Sync & Demo
- `POST /api/sync` — Batch sync offline queued encounters.
- `POST /api/demo/reset` — Reset database to pristine seed state.
- `POST /api/demo/load-scenario` — Inject Scenarios 1, 2, or 3.

---

## 6. SMS Configuration (Mock vs. Twilio)

The SMS engine seamlessly switches between offline **Mock** mode and live **Twilio** mode via environment variables:

```bash
# Set provider: 'mock' (default) or 'twilio'
SMS_PROVIDER=mock

# Twilio Credentials (Required when SMS_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Webhook Callback (Publicly accessible URL e.g. via ngrok)
TWILIO_STATUS_CALLBACK_URL=https://your-domain.ngrok-free.app/api/sms/twilio/status

# Safeguard Controls
SMS_COOLDOWN_HOURS=24
SMS_MAX_RETRIES=3
```

> [!NOTE]
> **Twilio Trial Account Limitation**: On Twilio trial accounts, outgoing SMS can only be sent to **Verified Caller IDs** registered in the Twilio Console. For development and testing without phone number verification, set `SMS_PROVIDER=mock`.

---

## 7. How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Start Flask Backend
```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```
Backend runs on `http://127.0.0.1:5000`.  
Health check: `http://127.0.0.1:5000/api/health`.

### Step 2: Start Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### Step 3: Run Automated Test Suite
```bash
cd backend
python -m pytest tests/ -v
```
All **56 automated unit and integration tests** across 7 test modules will execute and pass.

---

## 8. Presentation & Feature Walkthrough

1. **Open `http://localhost:5173`**:
   - Notice the multilingual switcher (`EN` | `తెలుగు` | `हिंदी`).
2. **Dashboard Overview**:
   - The **Action Required** panel displays live counts: Overdue Follow-ups, Pending Vaccinations, Pending IFA Tablets, SMS Pending, SMS Sent Today, and SMS Failed.
3. **Follow-ups & SMS Dispatch Workflow**:
   - Navigate to **Follow-ups & SMS**.
   - Observe the active SMS Provider badge (`Mock Mode` or `Twilio Live`).
   - Click **"Generate SMS"** on a pending vaccination or IFA follow-up.
   - Real-time 13-point eligibility check validates phone format, opt-in status, cooldown, and uncompleted health actions.
   - Review and customize the drafted message in the **SMS Preview & Edit Modal**.
   - Click **"Send SMS"** $\to$ Confirm in the explicit dialog $\to$ Message is dispatched.
4. **Global Data Retrieval & Smart Search**:
   - Navigate to **Data Retrieval**.
   - Switch between **Maternal**, **Child / Immunization**, **Iron Tablets**, **Follow-ups**, and **SMS Activity Log**.
   - Type queries like *"children needing vaccination"* or *"pregnant women in Shanti Nagar"*.
   - Filter SMS records by status (`All`, `Pending`, `Sent`, `Delivered`, `Failed`, `Cancelled`).
   - For failed SMS messages, click the **Retry** action button directly from the table.
   - Click **Export CSV** to download audited report data.

---

## 9. Synthetic Data & Safety Disclaimer

> **Disclaimer:** ASHA OneCapture is a demonstration prototype for KALACHAKRA 2K26. All patient names, phone numbers (`+91 98765 43210` series), household IDs, clinical observations, and vital signs are entirely synthetic. This prototype is not connected to production government servers (e.g. RCH, ANMOL, U-WIN). It does not provide clinical diagnosis and requires human confirmation for all voice-extracted and SMS actions.
