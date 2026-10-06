# Hospital Accreditation Intelligence System

> **Final-Year Project Architecture, Closed-Loop Quality Engineering & Implementation**
> Built with **React + Vite**, **Node.js / Express**, **MongoDB**, **Python Flask (PM4Py, SimPy, scikit-learn)**, and **Gemini AI Explainer**.

---

## 🌟 Core System Philosophy

```
Hospital Data ➔ Compliance Check ➔ Evidence ➔ Risk Calculation ➔ Alerts ➔ CAPA ➔ Re-evaluation ➔ Improvement
```

- **Single Source of Truth**: MongoDB stores all hospital metrics, traces, standards, and persisted risk assessments.
- **Calculate Once & Persist**: Risk is computed upon data change or explicit trigger, never recomputed on every dashboard view.
- **Audit-Grade Explainability**: AI Copilot receives minimal stored context to explain existing evidence without hallucinating numbers.
- **Closed-Loop Quality Improvement**: Corrective & Preventive Action (CAPA) items track status (`OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`) and automatically trigger department re-evaluation to capture and verify `beforeMetrics` vs `afterMetrics`.

---

## 🏗️ Architecture & Component Layers

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts | Interactive views, Kanban board, what-if sliders, process graphs, reports. |
| **Backend Coordinator** | Node.js, Express, Mongoose, JWT, Axios | Authentication, validation, business rules, standard checks, orchestration. |
| **Database** | MongoDB (Local Service) | Persistent data store (`hospital_metrics`, `patient_pathways`, `accreditation_standards`, `risk_scores`, `alerts`, `capa_plans`, `benchmarks`). |
| **AI Analytics Service** | Python Flask (Port 5001) | ML risk prediction (cached model), IsolationForest anomaly detector, PM4Py process mining, SimPy digital twin. |
| **Generative Explainer** | Gemini / Structured Explainer | Natural-language explanation grounded in system-calculated audit evidence. |

---

## 📱 The 11 Coherent Views

1. **Executive Overview** (`/`): Compact summary KPI cards, departmental risk matrix, active alerts ticker, and CAPA resolution progress.
2. **Accreditation Kanban** (`/kanban`): Interactive drag/advance CAPA workflow (`OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`) with before/after metric comparison.
3. **Data Entry Center** (`/data-entry`): Quality indicator submissions & clinical patient pathway event log ingestion with instant validation.
4. **Operational Metrics** (`/metrics`): Historical time-series charts, area/line trends, multi-indicator correlations, and recorded shift tables.
5. **PM4Py Process Mining** (`/process-mining`): Directly-follows transition graph, bottleneck duration analysis, trace variants, and skipped mandatory step detection (e.g. skipped medication verification).
6. **Counterfactual Analysis** (`/counterfactual`): What-if scenario intervention slider simulator with clear scenario labeling.
7. **SimPy Digital Twin** (`/digital-twin`): 24-hour discrete-event simulation modeling patient arrivals, doctor/nurse queues, and bed occupancy.
8. **Peer Benchmark Radar** (`/benchmarks`): Radar comparison against verified national quality benchmark cohort averages.
9. **Accreditation Standards** (`/standards`): Full NABH/JCI clinical quality standards compliance matrix, thresholds, and live evidence logs.
10. **Alerts & Anomalies** (`/alerts`): Triaged severity issues with one-click "Convert to CAPA" workflow.
11. **Executive Reports & AI Copilot** (`/reports` & `/copilot`):
    - **Executive Reports**: Printable audit compliance document generated from stored results.
    - **AI Copilot**: Conversational assistant explaining stored risk and evidence trails.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js $\ge 18$
- Python $\ge 3.10$
- MongoDB running locally on `127.0.0.1:27017`

### 1. Seed Database (One-Time Setup)
```bash
cd d:/CN/database/seed
node seed.js
```

### 2. Start All Services with 1-Click Batch File
Double click `start_all.bat` or run:
```bash
./start_all.bat
```

### 3. Or Start Services Manually in Separate Terminals:
- **Terminal 1: Python AI Service**
  ```bash
  cd d:/CN/ai-service
  python app.py
  ```
- **Terminal 2: Node.js Backend API**
  ```bash
  cd d:/CN/backend
  node server.js
  ```
- **Terminal 3: React Frontend**
  ```bash
  cd d:/CN/frontend
  npm run dev
  ```

---

## 🎓 Viva / Presentation Reference

> **Question: How does your system work?**  
> *"The system collects hospital quality and patient pathway data through the frontend and stores it in MongoDB. The Node.js backend validates and coordinates the data. Accreditation rules check compliance, while the Python service performs risk prediction, anomaly detection and process analysis. The results are stored with evidence and used to generate alerts and corrective actions. After corrective actions are completed, the system re-evaluates the department to measure improvement. The Generative AI assistant explains these existing results in natural language."*
