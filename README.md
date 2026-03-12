# SmartTriage
# SmartTriage ER Optimizer 🏥

[cite_start]**Track:** Healthcare Tech [cite: 2]  
[cite_start]**Challenge:** Algorithmic ER Patient Scheduling [cite: 6]

## 📝 Project Overview
[cite_start]SmartTriage is an algorithmic scheduling system designed to optimize Emergency Room operations[cite: 6]. [cite_start]By assigning patients to specific doctors (Trauma, Cardio, or General), the system generates a chronological treatment schedule aimed at minimizing the **Total ER Risk Score**[cite: 6, 13].

## ⚙️ Domain Logic (The "Contract")
The system strictly adheres to the following mandatory simulation rules:

### **1. [cite_start]Specialized Medical Staff** [cite: 17]
* **Doctor_T (TRAUMA):** Only treats TRAUMA patients[cite: 18, 20].
* **Doctor_C (CARDIO):** Only treats CARDIO patients[cite: 18, 21].
* **Doctor_G (GENERAL):** Can treat TRAUMA, CARDIO, or GENERAL patients[cite: 18, 22].
* **Capacity:** Each doctor treats one patient at a time; treatments cannot be interrupted[cite: 23, 39].

### **2. [cite_start]Risk Calculation** [cite: 46]
[cite_start]Patient risk is determined by severity (1-5) and time spent waiting in the pool[cite: 30, 48]:
* [cite_start]`waiting_time = treatment_start_time − arrival_time` [cite: 48]
* `patient_risk = severity × waiting_time` [cite: 48]
* [cite_start]**Goal:** Minimize the sum of all `patient_risk` values[cite: 49].

## 🚀 Algorithmic Strategy
[cite_start]To minimize total risk, we implemented a **[Insert your strategy, e.g., Greedy Heuristic / Lookahead]** approach[cite: 7]. 

* [cite_start]**Priority Queuing:** Patients are prioritized based on severity and arrival time to prevent high-severity "risk spikes"[cite: 108].
* **Doctor Allocation:** The algorithm prioritizes using specialized doctors (T/C) first, keeping the Generalist (G) available for any incoming high-severity case regardless of type[cite: 111].
* [cite_start]**Wait-Time Management:** We balance "treatment time" against "severity" to ensure quick cases don't hold up critical care[cite: 109].
