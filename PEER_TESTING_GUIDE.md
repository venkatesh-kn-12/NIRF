# MCA NIRF Assist Portal — Peer Testing & Verification Guide

Welcome! You have been invited to test and verify the **MCA NIRF Assist Portal** for the Department of Master of Computer Applications (MCA) at **Dayananda Sagar Academy of Technology & Management (DSATM)**.

This portal computes official accreditation scores strictly following the **NIRF Engineering 2025 Methodology** (Ministry of Education, Government of India).

---

## 1. How to Connect to the Portal

1. **Open the shared URL** in Google Chrome, Microsoft Edge, or Firefox:
   * **Tunnel / Forwarded Link**: `https://<forwarded-link>.devtunnels.ms` (or `http://localhost:3000` if on local machine).
2. If prompted by Microsoft Dev Tunnels with a security screen asking *"You are connecting to a developer tunnel. Do you want to continue?"*, click **"Continue"**.
3. You will see the **MCA NIRF Assist Sign In** page.

---

## 2. Test Accounts & Roles

The system uses strict **Role-Based Access Control (RBAC)**. To thoroughly test the complete workflow, you should test with these **3 distinct roles**:

```
+---------------------------------------------------------------------------------------------------------+
|                                        TEST CREDENTIALS TABLE                                           |
+----------------------+-----------------------------+--------------------+-------------------------------+
| Role                 | Institutional Email         | Password           | What This Role Is Used For    |
+----------------------+-----------------------------+--------------------+-------------------------------+
| DEPARTMENT_ADMIN     | admin.mca@dsatm.edu         | Admin@2026!        | Setup, settings, users, &     |
|                      |                             |                    | executing NIRF calculation    |
+----------------------+-----------------------------+--------------------+-------------------------------+
| FACULTY_CONTRIBUTOR  | contributor.mca@dsatm.edu   | Faculty@2026!      | Entering raw records &        |
|                      |                             |                    | uploading evidence PDFs       |
+----------------------+-----------------------------+--------------------+-------------------------------+
| REVIEWER             | reviewer.mca@dsatm.edu      | Reviewer@2026!     | Reviewing side-by-side proofs |
|                      |                             |                    | & approving verification cases|
+----------------------+-----------------------------+--------------------+-------------------------------+
```

*(Note: If the database was recently cleared, the Admin account can be created at `/setup-admin`, and subsequent users can be added in `/settings` under the "Users" tab).*

---

## 3. The 5-Phase End-to-End Testing Walkthrough

Follow these 5 phases in order to verify that all routes, security controls, evidence workflows, and mathematical formulas are functioning properly.

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 1: Sign in as Admin & Verify Routing & Settings (/settings)      │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 2: Sign in as Contributor & Enter Department Data (/students,    │
   │          /faculty, /uploads)                                           │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 3: Sign in as Reviewer & Inspect Verification Queue              │
   │          (/verification - Compare claimed data with PDF proof & approve)│
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 4: Sign in as Admin & Execute NIRF Calculation (/metrics)        │
   │          (Inspect Scorecard: TLR, RP, GO, OI, PR & math traces)         │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ PHASE 5: Export Official Reports (/reports)                            │
   │          (Download Excel DCF Workbook, PDF Summary, and CSV Audit Log) │
   └────────────────────────────────────────────────────────────────────────┘
```

---

### PHASE 1: System Navigation & Access Control Check

**Goal:** Confirm navigation works and security rules are enforced.

1. **Sign in as `DEPARTMENT_ADMIN`**:
   * Navigate to `/login` and sign in with `admin.mca@dsatm.edu` / `Admin@2026!`.
2. **Verify Navigation**:
   * Click each item in the left sidebar to confirm routing:
     * **Dashboard** (`/dashboard`): Check KPI summary cards and radar chart.
     * **Students** (`/students`): Student intake and demographics roster.
     * **Faculty** (`/faculty`): Faculty cadre and qualification roster.
     * **Uploads** (`/uploads`): Evidence document repository and AI extraction studio.
     * **Verification Queue** (`/verification`): Case review desk.
     * **Metrics & Calculations** (`/metrics`): Deterministic formula engine.
     * **Reports & DCF Export** (`/reports`): Official export downloads.
     * **Settings** (`/settings`): Department settings, user management, and integrations.
     * **Audit Trail** (`/audit`): Immutable event logs.
3. **Verify Settings Tabs (`/settings`)**:
   * **Users Tab**: Check live user counts (`Total Users`, `Active Accounts`, `Pending Invites`). Try searching and filtering by role.
   * **Methodology Tab**: Verify official read-only parameter weights:
     * TLR = 30%, RP = 30%, GO = 20%, OI = 10%, PR = 10%.
   * **Department Tab**: Check institutional settings (Department: MCA, Intake: 120 seats/yr, Home State: Karnataka).
   * **Integrations Tab**: Click **"Test connection heartbeat"** and confirm MongoDB latency is reported.
4. **Test Security (Sign in as Contributor)**:
   * Log out, then log in as `contributor.mca@dsatm.edu`.
   * Try visiting `http://<link>/settings`.
   * **Expected Result**: System blocks access with **403 Forbidden** (proving security).

---

### PHASE 2: Data Entry & Evidence Upload (As Contributor)

**Goal:** Input student and faculty records and attach proof documents.

Log in as **`FACULTY_CONTRIBUTOR`** (`contributor.mca@dsatm.edu`).

#### Task 2.1: Add Student Records (`/students`)
1. Click **Students** in the sidebar.
2. Click **"Add Student"** and enter sample students:

| Student Name | PRN / USN | Batch | Domicile State | Domicile Type | Gender | Category |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Rahul Sharma** | `1DT24MC001` | 2024–26 | Karnataka | `HOME_STATE` | `MALE` | `OBC` |
| **Priya Nair** | `1DT24MC002` | 2024–26 | Kerala | `OTHER_STATE` | `FEMALE` | `OPEN` |
| **Aarav Patel** | `1DT24MC003` | 2024–26 | Gujarat | `OTHER_STATE` | `MALE` | `OPEN` |
| **Fatima Zahra** | `1DT24MC004` | 2024–26 | International | `INTERNATIONAL` | `FEMALE` | `OPEN` |

3. Click **"Save Student"**. The records appear with status `PENDING_VERIFICATION`.

---

#### Task 2.2: Add Faculty Records (`/faculty`)
1. Click **Faculty** in the sidebar.
2. Click **"Add Faculty"** and enter sample faculty:

| Faculty Name | Email | Designation | Highest Qual. | PhD Status | Exp. Years | Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Rajesh Kumar** | `r.kumar@dsatm.edu` | Professor & HOD | Ph.D. in CS | `AWARDED` | 18 | `PERMANENT` |
| **Dr. Sunita Rao** | `s.rao@dsatm.edu` | Associate Prof | Ph.D. in MCA | `AWARDED` | 11 | `PERMANENT` |
| **Prof. Alok Verma** | `a.verma@dsatm.edu` | Assistant Prof | M.Tech in CS | `PURSUING` | 6 | `PERMANENT` |
| **Dr. Meenakshi S.** | `m.sundaram@dsatm.edu`| Assistant Prof | Ph.D. in IT | `AWARDED` | 7 | `PERMANENT` |

3. Click **"Save Faculty"**. The records will be queued for review.

---

#### Task 2.3: Upload Evidence Documents (`/uploads`)
1. Click **Uploads** in the sidebar.
2. Under **"Upload & Run AI Ingestion"**:
   * Select a PDF file from your computer (any sample PDF or document).
   * Pick **Document Taxonomy**:
     * `Faculty`: Faculty List & Service Registers (TLR 1.2)
     * `Student`: Student Intake & Enrolment Register (SS / TLR)
     * `FinanceRecord`: Financial Audited Balance Statements (FRU)
     * `Publication`: Scopus / WoS Extracts (RP 2.1)
     * `PlacementRecord`: Placement & Higher Studies (GPHE)
     * `OutreachRecord`: Regional & Gender Diversity (OI)
   * Click **"Upload & Run AI Ingestion"**.
3. The file is uploaded, an SHA-256 checksum is computed, and an automated verification case is opened in the queue!

---

### PHASE 3: The Verification Desk (As Reviewer)

**Goal:** Review claimed numbers against proof documents and approve records so they enter the active calculation pool.

1. **Log in as `REVIEWER`** (`reviewer.mca@dsatm.edu` / `Reviewer@2026!`).
2. Navigate to **Verification** (`/verification`).
3. You will see the queue of pending cases (`Student`, `Faculty`, `FinanceRecord`, etc.).
4. Click **"Review Case"** on a case:
   * **Left Side**: Review the claimed data (Student name, USN, Faculty Experience, Financial Rupees).
   * **Right Side**: Built-in PDF viewer displaying the uploaded document.
5. **Approve the Record**:
   * Enter a review note: *"Verified against institutional registry."*
   * Click **"Approve & Verify"**.
   * The status switches to `APPROVED` and is locked with a cryptographic audit signature!
6. *(Optional Test)*: On another case, test clicking **"Request Correction"** or **"Reject"** with a reason to confirm the rejection flow works.

---

### PHASE 4: Execute Deterministic NIRF Calculation (As Admin)

**Goal:** Trigger the mathematical formula engine and inspect calculated scores.

1. **Log in as `DEPARTMENT_ADMIN`** (`admin.mca@dsatm.edu` / `Admin@2026!`).
2. Navigate to **Metrics** (`/metrics`).
3. Click the blue button: **"Execute NIRF 2025 Calculation Run"**.
4. The calculation engine executes across all approved records and displays the scorecard:

```
========================================================================================
NIRF 2025 DETERMINISTIC SCORECARD (MCA DEPARTMENT)
========================================================================================
Parameter                                 Marks (out of 100)    Weight    Weighted Score
----------------------------------------------------------------------------------------
TLR: Teaching, Learning & Resources             89.12           0.30          26.74
RP:  Research & Professional Practice           79.50           0.30          23.85
GO:  Graduation Outcomes                        78.50           0.20          15.70
OI:  Outreach & Inclusivity                     70.00           0.10           7.00
PR:  Peer Perception (Official Survey)          68.50           0.10           6.85
----------------------------------------------------------------------------------------
TOTAL NIRF COMPOSITE SCORE:                                                   73.14 / 100
========================================================================================
```

5. **Inspect the Detailed Mathematical Traces**:
   * Click on **TLR** to expand its sub-metrics:
     * **SS**: Student Strength $= f(NT, NE) \times 15 + f(NP) \times 5$
     * **FSR**: Faculty-Student Ratio $= 30 \times [15 \times (F / N)]$
     * **FQE**: Faculty Qualification \& Experience $= \text{FQ}(10) + \text{FE}(10)$
     * **FRU**: Financial Resources $= 7.5 \times f(BC) + 22.5 \times f(BO)$
   * Click on **RP**, **GO**, **OI**, and **PR** to inspect their respective sub-metric breakdowns.
   * If any data was omitted, observe that the sub-metric correctly shows `PENDING_INPUT` or `NOT_COMPUTABLE` without fabricating fake numbers.

---

### PHASE 5: Report Generation & Official Export

**Goal:** Export institutional accreditation deliverables.

1. Navigate to **Reports** (`/reports`).
2. Test downloading all three formats:
   * **NIRF Data Capture Format (DCF) Excel Workbook (`.xlsx`)**: Generates the multi-sheet official spreadsheet.
   * **Executive Summary PDF (`.pdf`)**: Generates a printable dossier with the institution header, radar chart, and approval signatures.
   * **Complete Audit Trail (`.csv`)**: Exports timestamped logs of every action taken during this testing session.

---

## 4. Complete Metric Input Reference Sheet

Use this cheat sheet to verify the mathematical inputs for all 5 parameters:

### 1. TLR (Teaching, Learning & Resources) — Max 100, Weight 0.30
* **SS (Student Strength - 20 Marks)**: Approved Intake: `120/yr` (240 total capacity). Enrolled: `240`. Target achieved $\implies$ 15/15 + PhD factor.
* **FSR (Faculty-Student Ratio - 30 Marks)**: Target is 1:15 ratio ($240 / 15 = 16$ faculty). 16 regular faculty $\implies$ **Full 30/30 marks**. Cutoff is $1:50$ (less than 5 faculty $\implies 0$).
* **FQE (Qualifications & Experience - 20 Marks)**: PhD holders $\ge 95\% \implies$ 10/10. Experience balanced across $\le 8\text{ yrs}$, $8\text{–}15\text{ yrs}$, and $> 15\text{ yrs} \implies$ 10/10.
* **FRU (Expenditures - 30 Marks)**: 3-year average annual Capital Expenditure ($BC$) and Operational Expenditure ($BO$) per student.

### 2. RP (Research and Professional Practice) — Max 100, Weight 0.30
* **PU (Publications - 35 Marks)**: Scopus/WoS peer-reviewed papers published in calendar years 2023, 2024, 2025.
* **QP (Quality of Publications - 40 Marks)**: Citations count ($CC$) and Top 25% percentile journal publications ($TOP25P$).
* **IPR (Patents - 15 Marks)**: Patents Granted ($10 \times f(PG)$) + Patents Published ($5 \times f(PP)$).
* **FPPP (Projects - 10 Marks)**: Sponsored Research grants ($7.5 \times f(RF)$) + Consultancy earnings ($2.5 \times f(CF)$).

### 3. GO (Graduation Outcomes) — Max 100, Weight 0.20
* **GPH (Placement & Higher Studies - 40 Marks)**: $40 \times (N_p/100 + N_{hs}/100)$ over 3 graduating cohorts. (e.g. 82% placed + 8% higher studies $= 90\% \implies \mathbf{36.00 / 40}$).
* **GUE (Examinations Pass Rate - 15 Marks)**: $15 \times \min(N_g / 80, 1)$. Full 15 marks if $\ge 80\%$ graduate in stipulated 2 years.
* **GMS (Median Salary - 25 Marks)**: Audited median annual package (e.g. ₹6,50,000 CTC).
* **GPHD (PhD Graduates - 20 Marks)**: Average doctoral graduates guided over 3 years.

### 4. OI (Outreach and Inclusivity) — Max 100, Weight 0.10
* **RD (Regional Diversity - 30 Marks)**: Other Indian states (25 marks) + International students (5 marks). Home State = Karnataka.
* **WD (Women Diversity - 30 Marks)**: Women students ($15 \text{ marks at } 50\%$) + Women faculty ($15 \text{ marks at } 20\%$).
* **ESCS (Fee Reimbursements - 20 Marks)**: Proportion of students receiving full tuition reimbursement/scholarships.
* **PCS (Physically Challenged - 20 Marks)**: Full 20 marks when all 4 facilities are verified (Lifts, Ramps, Accessible Toilets, Tactile Paths).

### 5. PR (Peer Perception) — Max 100, Weight 0.10
* **Official Survey Score**: Entered only when official MoE/NIRF survey results are issued. Invariant: Remains `NOT_COMPUTABLE` without official data (never fabricated).

---

## 5. Peer Testing Checklist

Use this checklist to confirm everything is working properly:

- [ ] **Sign in**: Successfully logged in at `/login`.
- [ ] **RBAC Security**: Contributor cannot open `/settings` (HTTP 403 shown).
- [ ] **Data Entry**: Successfully added student records in `/students`.
- [ ] **Data Entry**: Successfully added faculty records in `/faculty`.
- [ ] **Evidence Upload**: Uploaded a proof PDF in `/uploads`.
- [ ] **Verification**: Reviewed the case side-by-side and approved it in `/verification`.
- [ ] **Calculation**: Clicked "Execute NIRF 2025 Calculation Run" in `/metrics`.
- [ ] **Scorecard**: Inspected TLR, RP, GO, OI, and PR cards and expanded formula traces.
- [ ] **Export**: Successfully downloaded the official Excel DCF and PDF summary from `/reports`.
- [ ] **Audit Trail**: Verified your actions appear in `/audit` with timestamps and email tags.

Happy Testing! If you encounter any unexpected issues, check the terminal on the host laptop for live server logs.
