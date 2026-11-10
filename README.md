# MCA NIRF Assist Portal

Institutional Accreditation Intelligence and Metric Compilation Engine for Master of Computer Applications (MCA), Department of Computer Applications, DSATM.

Built strictly in adherence to the official **NIRF Engineering 2025 Methodology**.

---

## 1. NIRF Engineering 2025 Metric Specifications

### Overall Parameter Weights & Max Marks

$$\text{Overall Score} = (\text{TLR} \times 0.30) + (\text{RP} \times 0.30) + (\text{GO} \times 0.20) + (\text{OI} \times 0.10) + (\text{PR} \times 0.10)$$

---

### TLR — Teaching, Learning & Resources (Weight: 30%, Max Marks: 100)
$$\text{TLR} = \text{SS}(20) + \text{FSR}(30) + \text{FQE}(20) + \text{FRU}(30)$$

1. **SS (Student Strength including Doctoral Students)** — Max 20 marks
   $$\text{SS} = f(N_T, N_E) \times 15 + f(N_P) \times 5$$
   - $N_T$: Sanctioned intake
   - $N_E$: Enrolled students
   - $N_P$: Primary doctoral students

2. **FSR (Faculty-Student Ratio with Emphasis on Permanent Faculty)** — Max 30 marks
   $$\text{FSR} = 30 \times \left[15 \times \left(\frac{F}{N}\right)\right]$$
   - $N = N_T + N_P$ (total enrolled students including doctoral)
   - If $\frac{F}{N} < 1:50$, $\text{FSR} = 0$ (regulatory minimum cutoff)

3. **FQE (Combined Metric for Faculty with Ph.D. and Experience)** — Max 20 marks
   $$\text{FQE} = \text{FQ} + \text{FE}$$
   - $\text{FQ} = 10 \times \left(\frac{\text{FRA}}{95}\right)$ if $\text{FRA} < 95\%$; otherwise $\text{FQ} = 10$
   - $\text{FE} = 3\min(3F_1, 1) + 3\min(3F_2, 1) + 4\min(3F_3, 1)$ ($F_1$: $\le 8$ yrs, $F_2$: 8–15 yrs, $F_3$: $>15$ yrs)

4. **FRU (Financial Resources and their Utilisation)** — Max 30 marks
   $$\text{FRU} = 7.5 \times f(B_C) + 22.5 \times f(B_O)$$
   - $B_C$: Average annual capital expenditure per student over previous 3 years
   - $B_O$: Average annual operational/recurring expenditure per student over previous 3 years

---

### RP — Research and Professional Practice (Weight: 30%, Max Marks: 100)
$$\text{RP} = \text{PU}(35) + \text{QP}(40) + \text{IPR}(15) + \text{FPPP}(10)$$

1. **PU (Combined Metric for Publications)** — Max 35 marks
   $$\text{PU} = 35 \times f\left(\frac{P}{\text{FRQ}}\right) - 5 \times f(P_{\text{ret}})$$
   - Verified through external indexed bibliometric databases (Scopus / Web of Science).

2. **QP (Combined Metric for Quality of Publications)** — Max 40 marks
   $$\text{QP} = \left\{20 \times f\left(\frac{\text{CC}}{\text{FRQ}}\right) + 20 \times f\left(\frac{\text{TOP25P}}{P}\right)\right\} - 5 \times f(C_{\text{ret}})$$
   - Requires verified citation counts and Top 25% journal percentiles.

3. **IPR (IPR and Patents: Published and Granted)** — Max 15 marks
   $$\text{IPR} = \text{IPG} + \text{IPP}$$
   - $\text{IPG} = 10 \times f(P_G)$ (Patents granted over previous 3 years)
   - $\text{IPP} = 5 \times f(P_P)$ (Patents published over previous 3 years)

4. **FPPP (Footprint of Projects and Professional Practice)** — Max 10 marks
   $$\text{FPPP} = \text{FPR} + \text{FPC}$$
   - $\text{FPR} = 7.5 \times f(R_F)$ (Sponsored research funding per faculty)
   - $\text{FPC} = 2.5 \times f(C_F)$ (Consultancy amount per faculty)

---

### GO — Graduation Outcomes (Weight: 20%, Max Marks: 100)
$$\text{GO} = \text{GPH}(40) + \text{GUE}(15) + \text{GMS}(25) + \text{GPHD}(20)$$

1. **GPH (Combined Metric for Placement and Higher Studies)** — Max 40 marks
   $$\text{GPH} = 40 \times \left(\frac{N_p}{100} + \frac{N_{hs}}{100}\right)$$
   - $N_p$: Percentage of graduating students placed over previous 3 years
   - $N_{hs}$: Percentage selected for higher studies over previous 3 years

2. **GUE (Metric for University Examinations)** — Max 15 marks
   $$\text{GUE} = 15 \times \min\left(\frac{N_g}{80}, 1\right)$$
   - $N_g$: Percentage of students passing university exams in stipulated time

3. **GMS (Median Salary of Graduated Students)** — Max 25 marks
   $$\text{GMS} = 25 \times f(\text{MS})$$
   - $\text{MS}$: Median annual placement salary over previous 3 cohorts

4. **GPHD (Metric for Number of Ph.D. Students Graduated)** — Max 20 marks
   $$\text{GPHD} = 20 \times f(N_{phd})$$
   - $N_{phd}$: Average doctoral students graduated over previous 3 years

---

### OI — Outreach and Inclusivity (Weight: 10%, Max Marks: 100)
$$\text{OI} = \text{RD}(30) + \text{WD}(30) + \text{ESCS}(20) + \text{PCS}(20)$$

1. **RD (Percentage of Students from Other States & Countries)** — Max 30 marks
   $$\text{RD} = 25 \times (\text{fraction from other states}) + 5 \times (\text{fraction from other countries})$$

2. **WD (Percentage of Women)** — Max 30 marks
   $$\text{WD} = 15 \times \left(\frac{N_{WS}}{50}\right) + 15 \times \left(\frac{N_{WF}}{20}\right)$$
   - $N_{WS}$: Percentage of women students (target 50%)
   - $N_{WF}$: Percentage of women faculty (target 20%)

3. **ESCS (Economically and Socially Challenged Students)** — Max 20 marks
   $$\text{ESCS} = 20 \times f(N_{esc})$$
   - $N_{esc}$: Percentage of students receiving full tuition fee reimbursement

4. **PCS (Facilities for Physically Challenged Students)** — Max 20 marks
   $$\text{PCS} = 20 \text{ marks if full facilities provided; otherwise proportional to verified facilities}$$

---

### PR — Peer Perception (Weight: 10%, Max Marks: 100)
$$\text{PR} = 100 \text{ marks}$$
- Official NIRF Employer and Academic Peer Perception survey score only.
- If unavailable: strictly marked `NOT_COMPUTABLE`. Imputation or estimation is forbidden.

---

## 2. Institutional Compliance Guarantees

- **Zero Estimation Policy**: Incomplete or missing metrics evaluate to `null` rawScore and are marked `PENDING_INPUT`, `NOT_COMPUTABLE`, or `AWAITING_SOURCE`.
- **Approved Records Only**: Only records in `APPROVED` status with verified audit logs contribute to calculations.
- **Audit Logging**: Every mutation, approval, verification case, and metric calculation run produces an immutable `AuditLog` entry.

---

## 3. Project Running Instructions

### Prerequisites

- **Node.js**: v18.18+ or v20+
- **pnpm**: v9+ (or npm / yarn)
- **MongoDB**: Community Server v7.0+ or v9.0+ running locally on port `27017`

---

### Environment Setup

Create or verify `.env.local` in the project root:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/mca_nirf
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/mca_nirf_test
SESSION_SECRET=mca_nirf_assist_super_secure_production_secret_key_2025_c18492
NODE_ENV=development
NEXT_PUBLIC_APP_NAME="MCA NIRF Assist"
```

---

### Starting MongoDB

#### Option A: Running as a Windows Background Daemon
```powershell
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "c:\Users\vamsh\OneDrive\Desktop\NIRF\.mongodb_data" --port 27017 --bind_ip 127.0.0.1
```

#### Option B: Windows Service
```powershell
net start MongoDB
```

---

### Installing Dependencies

```bash
pnpm install
```

---

### Running the Application

#### Development Mode
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build & Start
```bash
# Build the production bundle
pnpm run build

# Start the production server
pnpm run start
```

---

### Initial Setup & User Workflows

1. **One-Time Department Admin Setup**:
   - Navigate to [http://localhost:3000/setup-admin](http://localhost:3000/setup-admin) on first launch.
   - Register the primary **Department Administrator** account (name, institutional email, employee ID, strong password).
   - Once created, `/setup-admin` is permanently locked (returns HTTP 403).

2. **Login**:
   - Visit [http://localhost:3000/login](http://localhost:3000/login).
   - Sign in using your registered email or employee ID and password.

3. **Data Entry & Contribution**:
   - Navigate to **Student Data Repository** (`/students` or `/data/students`) to manage MCA student intake and enrollment records.
   - Navigate to **Faculty Data Repository** (`/faculty` or `/data/faculty`) to input faculty designations, Ph.D. status, and experience bands.
   - Navigate to **Upload & Extract Data** (`/uploads`) to attach PDF evidence documents (AICTE approvals, convocation registers, audited statements).

4. **Verification & Approval Queue**:
   - Reviewers and Department Admins navigate to `/verification`.
   - Review submitted records, inspect checksum-verified evidence references, check AI extractions, and either **Approve**, **Reject with Reason**, or **Request Correction**.
   - Records with open `HIGH` severity cases cannot be approved until resolved.

5. **NIRF Metric Calculation**:
   - Go to **Metrics & Calculations** (`/metrics`).
   - Trigger the deterministic calculation engine for the reporting academic year (e.g. `2024-25`).
   - View parameter scores across TLR, RP, GO, OI, and PR with full mathematical step-by-step traces.

6. **Reports & DCS Export**:
   - Go to **Reports & DCS Export** (`/reports`).
   - Generate any of the 7 official departmental reports (Department Summary, Parameter-wise, Faculty & Student, Research, Placement, Verification, Audit).
   - Export in **CSV**, **XLSX**, or printable **HTML/PDF** formats.

7. **Audit Trail**:
   - Access `/audit` to review immutable, cryptographically tracked user actions, filters by date, parameter, action type, and export CSV audit logs.

---

### Running Tests

#### 1. Unit Tests (Deterministic Formulas & Zod Model Validators)
No database connection required:
```bash
# Verify all 17 NIRF Engineering 2025 metric formulas
pnpm exec tsx tests/metric-formulas.test.ts

# Verify all 10 Mongoose/Zod data model validators
pnpm exec tsx tests/models-validators.test.ts
```

#### 2. Integration Tests (Auth, RBAC, API Endpoints & Verification)
Requires MongoDB running on port `27017`:
```bash
# Run full integration suite (auth-rbac, api-integration, models, student-faculty)
pnpm test
```

#### 3. End-to-End Acceptance Verification
Verifies the complete 21-step production pipeline using authentic data:
```bash
pnpm exec tsx tests/e2e-acceptance.ts
```

#### 4. UI Design Verification (Playwright Fidelity Suite)
Verifies all 12 application routes against Stitch reference designs:
```bash
# Set credentials (if authenticating as an existing admin)
$env:TEST_ADMIN_EMAIL = "admin@dsatm.edu.in"
$env:TEST_ADMIN_PASSWORD = "YourPassword123!"

# Execute UI design verification
pnpm run test:ui
```
Screenshots and visual diff images are saved in `test-results/ui-verification/`.


