# SmartTriage ER Optimizer

A single-file web application for scheduling ER patients across three doctors, minimizing total risk.

---

## Algorithm

*Phase 1 — Priority Greedy Scheduling*

Each patient is scored when a doctor becomes free:


score = severity × 1000 + wait_so_far × severity × 2 − treatment_time × 0.1


Highest score is assigned first. Doctor_G (GENERAL) defers to specialists if they free up within 3 minutes and patient severity ≤ 3.

*Phase 2 — Local Swap Improvement (3 passes)*

Tries swapping doctor assignments between patient pairs. Accepts swaps that reduce total risk. Rebuilds the timeline after each accepted swap.

*Complexity:* O(n² log n) + O(k × n²) where k ≤ 3

---

## Doctors

| Doctor ID | Specialization | Can Treat |
|-----------|---------------|-----------|
| Doctor_T  | TRAUMA        | TRAUMA only |
| Doctor_C  | CARDIO        | CARDIO only |
| Doctor_G  | GENERAL       | TRAUMA, CARDIO, GENERAL |

---

## Input Format

patients.csv


patient_id,severity,arrival_time,treatment_time,required_specialization
P1,5,0,8,TRAUMA
P2,3,2,4,CARDIO
P3,4,3,6,TRAUMA


- severity: 1–5 (5 = critical)
- arrival_time: integer minutes ≥ 0
- treatment_time: integer minutes ≥ 1
- required_specialization: TRAUMA / CARDIO / GENERAL

---

## Output Format

submission.json

json
{
  "treatments": [
    { "patient_id": "P1", "doctor_id": "Doctor_T", "start_time": 0, "end_time": 8 },
    { "patient_id": "P2", "doctor_id": "Doctor_C", "start_time": 2, "end_time": 6 }
  ],
  "estimated_total_risk": 20
}


Sorted by start_time. Risk = Σ (severity × wait_time) per patient.

---

## Features

- CSV upload → auto-schedules and renders results
- Live doctor status (FREE / TREATING) with progress bar
- ER timeline playback with idle gap visualization
- Risk heatmap per patient
- Auto charts: severity distribution, arrival vs treatment time
- Export: submission.json + detailed smarttriage_report.json
- Login with persistent session (stays logged in on refresh)
- Dark / light theme

---

## Usage

1. Open smarttriage_v5.html in any browser — no install needed
2. Sign in with your name and role
3. Upload patients.csv or add patients manually
4. Click *Run SmartTriage*
5. Download submission.json from the Export tab

---

## Risk Calculation


waiting_time = start_time − arrival_time
patient_risk = severity × waiting_time
total_risk   = Σ patient_risk


Lower total risk = better schedule.
