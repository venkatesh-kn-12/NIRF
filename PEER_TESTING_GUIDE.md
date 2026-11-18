# MCA NIRF Assist Portal — Peer Testing & Verification Guide

Welcome! You have been invited to test and verify the **MCA NIRF Assist Portal** for the Department of Master of Computer Applications (MCA) at **Dayananda Sagar Academy of Technology & Management (DSATM)**.

This portal computes official accreditation scores strictly following the **NIRF Engineering 2025 Methodology** (Ministry of Education, Government of India).

---

## ⚡ Direct Testing Mode (Verification on Hold)

> **Note for Department Testers**: To allow rapid internal verification of formulas, routing, and data entry, **the reviewer verification approval bottleneck has been placed on hold**.
>
> Any student, faculty, or financial expenditure entered by **Faculty** or **Admin** is **immediately active and directly computed** in the NIRF calculation engine at `/metrics` without waiting for manual sign-off.

---

## 1. How to Connect to the Portal

1. **Open the shared URL** in Google Chrome, Microsoft Edge, or Firefox:
   * **Tunnel Link**: `https://<forwarded-link>.devtunnels.ms` or `https://<tunnel>.trycloudflare.com` (or `http://localhost:3000` locally).
2. If prompted by Microsoft Dev Tunnels with a security screen asking *"You are connecting to a developer tunnel. Do you want to continue?"*, click **"Continue"**.
3. You will see the **MCA NIRF Assist Sign In** page fully styled with Tailwind CSS.

---

## 2. Test Accounts & Roles

The system uses **Role-Based Access Control (RBAC)**. You can test with either role:

| Role | Institutional Email | Password | What This Role Can Do |
| :--- | :--- | :--- | :--- |
| **DEPARTMENT_ADMIN** | `admin.mca@dsatm.edu` | `Admin@2026!` | Full access: Settings, Intake Capacity, Users, Data Entry, & Running NIRF Calculations |
| **FACULTY_CONTRIBUTOR** | `contributor.mca@dsatm.edu` | `Faculty@2026!` | Data Entry: Students, Faculty, Expenditures, & Running NIRF Calculations |

*(Note: If testing on a freshly reset database, set up the initial Admin at `/setup-admin`, and manage accounts in `/settings` under the "Users" tab).*

---

## 3. Core Focus: Teaching, Learning & Resources (TLR — 100 Marks)

The primary focus is testing the 4 mathematical components of **TLR (Teaching, Learning & Resources)**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            TLR METRICS BREAKDOWN (MAX 100 MARKS)                             │
├───────┬────────────────────────────────────────┬───────┬────────────────────────────────────┤
│ Code  │ Component Name                         │ Marks │ Main Required Data Inputs          │
├───────┼────────────────────────────────────────┼───────┼────────────────────────────────────┤
│ SS    │ Student Strength & Doctoral Enrolment  │  20   │ Sanctioned intake, enrolled PG &   │
│       │                                        │       │ Ph.D. students                     │
├───────┼────────────────────────────────────────┼───────┼────────────────────────────────────┤
│ FSR   │ Faculty-Student Ratio                  │  30   │ Full-time regular faculty count,   │
│       │                                        │       │ total students (N = NT + NP)       │
├───────┼────────────────────────────────────────┼───────┼────────────────────────────────────┤
│ FQE   │ Faculty Qualification & Experience     │  20   │ Ph.D. faculty count, cadre         │
│       │                                        │       │ experience distribution (F1,F2,F3) │
├───────┼────────────────────────────────────────┼───────┼────────────────────────────────────┤
│ FRU   │ Financial Resources & Utilisation      │  30   │ 3-year Capital (BC) & Operational  │
│       │                                        │       │ (BO) expenditure per student       │
└───────┴────────────────────────────────────────┴───────┴────────────────────────────────────┘
```

---

## 4. Step-by-Step TLR Testing Walkthrough

Follow these 4 simple steps to enter data across all components and verify calculations:

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ STEP 1: Add Students (/students)                                       │
   │         • Enter MCA students & optional Ph.D. students                 │
   │         • Tests SS (Student Strength) & denominator for FSR, FRU       │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ STEP 2: Add Faculty (/faculty)                                         │
   │         • Enter Permanent / Contract faculty with Ph.D. status & years │
   │         • Tests FSR (Faculty-Student Ratio) & FQE (Experience)         │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ STEP 3: Add Financial Resources (/finance)                             │
   │         • Enter 3-year Capital (Labs/Library) & Operational (Salaries) │
   │         • Tests FRU (Financial Resources and Utilisation)              │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ STEP 4: Run Metric Calculation (/metrics)                              │
   │         • Click "Run Calculation"                                      │
   │         • Inspect the score card, formula steps & mathematical traces  │
   └────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Student Data Repository (`/students`)
* **Goal**: Provide data for **SS (20 Marks)** and student denominators.
* **How to Test**:
  1. Click **Student Data Repository** in the left sidebar.
  2. Click **+ Add Student**.
  3. Fill out the student form:
     * **Programme**: Select `MCA` (or `Ph.D. / Doctoral` to test doctoral enrolment).
     * **Name**: e.g., `Aakash Verma`
     * **Student ID / PRN**: e.g., `1DS23MC001`
     * **Batch**: `2023-2025`, **Admission Year**: `2023`, **Semester**: `3`
     * **Domicile**: `Home State` (or `Other State` / `International` to test OI-RD).
     * **Gender**: Select Male or Female.
  4. Click **Save Student Record**.
  5. The student record will immediately display with an **Active** badge.

---

### Step 2: Faculty Data Repository (`/faculty`)
* **Goal**: Provide data for **FSR (30 Marks)** and **FQE (20 Marks)**.
* **How to Test**:
  1. Click **Faculty Data Repository** in the left sidebar.
  2. Click **+ Add Faculty**.
  3. Fill out the faculty form:
     * **Name**: e.g., `Dr. Ramesh Kumar`
     * **Faculty ID**: `FAC001`
     * **Designation**: `Associate Professor`
     * **Employment Type**: `PERMANENT` (Only permanent & contract count toward regular faculty).
     * **Highest Qualification**: `Ph.D.`
     * **Ph.D. Status**: `AWARDED`
     * **Experience (Years)**: Enter years of experience:
       * $\le 8$ years: Counts towards $F_1$
       * $8 - 15$ years: Counts towards $F_2$
       * $> 15$ years: Counts towards $F_3$
  4. Click **Save Faculty Record**.
  5. The record is created and active immediately.

---

### Step 3: Financial Resources & Utilisation (`/finance`)
* **Goal**: Provide data for **FRU (30 Marks)**.
* **How to Test**:
  1. Click **Financial Resources (FRU)** in the left sidebar (`/finance`).
  2. Click **+ Add Expenditure**.
  3. Enter 3 consecutive years of audited expenditures:
     * **Record 1 (Capital)**:
       * Year: `2024-25`
       * Category: `Capital Exp.`
       * Head: `Laboratory Equipment & Software Licenses`
       * Amount: `₹ 2,400,000`
       * Purpose: `New AI/Cloud Computing Lab setup`
     * **Record 2 (Operational)**:
       * Year: `2024-25`
       * Category: `Operational Exp.`
       * Head: `Faculty & Academic Staff Salaries`
       * Amount: `₹ 7,500,000`
       * Purpose: `Annual faculty and support staff salaries`
     * *(Optional)*: Add records for `2023-24` and `2022-23` to test 3-year rolling averages.
  4. Click **Save Record**.
  5. Check the top summary KPI cards updating Capital, Operational, and reporting years in real time.

---

### Step 4: Metrics & Calculations (`/metrics`)
* **Goal**: Compute official NIRF Engineering 2025 scores and inspect the exact mathematical trace.
* **How to Test**:
  1. Navigate to **Metrics & Calculations** (`/metrics`) in the sidebar.
  2. Click the blue **"Run Calculation"** button in the top right.
  3. The computation runs in seconds.
  4. Expand the **Teaching, Learning & Resources (TLR)** accordion card:
     * **SS Card (Max 20)**: Click to see formula trace:
       $$\text{SS} = 15 \times \min(1.0, \text{NE} / \text{NT}) + 5 \times \min(1.0, \text{NP} / 10)$$
     * **FSR Card (Max 30)**: Click to see ratio and multiplier:
       $$\text{FSR} = 30 \times [15 \times (F / N)] \quad (\text{capped at 30})$$
     * **FQE Card (Max 20)**: Click to see qualification ($FQ$) and experience balance ($FE$):
       $$\text{FQE} = FQ + FE$$
     * **FRU Card (Max 30)**: Click to see linear normalisation:
       $$\text{FRU} = 7.5 \times f(BC) + 22.5 \times f(BO)$$
       Where $f(BC) = \min(1.0, BC / 20000)$ and $f(BO) = \min(1.0, BO / 60000)$.
  5. Verify that each step shows the exact calculation numbers and values derived from the data you entered!

---

## 5. Other Useful Pages to Verify
* **Department Dashboard (`/dashboard`)**: Displays the radar chart of NIRF parameters and quick status metrics.
* **Department Settings (`/settings`)**:
  * **Department Tab**: Modify **Sanctioned Intake** (e.g. change 120 to 180 and observe how SS and FSR recalculate).
  * **Users Tab**: Create and invite new department users with password requirements.
* **Audit Trail (`/audit`)**: Lists all creation, update, deletion, and calculation events with user email, timestamp, and IP address.
* **Reports (`/reports`)**: Download the official Excel Data Capture Format (DCF) workbook.
