import simpy
import random
import numpy as np

def run_digital_twin_simulation(params):
    """
    Discrete-event simulation of hospital department operations using SimPy.
    Parameters:
      - arrival_rate_per_hour: float (default 6.0)
      - num_doctors: int (default 4)
      - num_nurses: int (default 8)
      - num_beds: int (default 20)
      - avg_consult_time_mins: float (default 25.0)
      - avg_bed_stay_hours: float (default 8.0)
      - simulation_hours: int (default 24)
    """
    arrival_rate = float(params.get('arrivalRatePerHour', 8.0))
    num_doctors = max(1, int(params.get('numDoctors', 4)))
    num_nurses = max(1, int(params.get('numNurses', 8)))
    num_beds = max(1, int(params.get('numBeds', 20)))
    avg_consult = max(5.0, float(params.get('avgConsultationTime', 25.0)))
    avg_bed_stay = max(0.5, float(params.get('avgBedStayHours', 6.0)))
    sim_hours = max(6, int(params.get('simulationHours', 24)))
    
    sim_duration_mins = sim_hours * 60.0
    
    env = simpy.Environment()
    doctors = simpy.Resource(env, capacity=num_doctors)
    nurses = simpy.Resource(env, capacity=num_nurses)
    beds = simpy.Resource(env, capacity=num_beds)
    
    wait_times = []
    consult_times = []
    bed_stay_times = []
    hourly_queue = [0] * sim_hours
    hourly_occupancy = [0.0] * sim_hours
    hourly_arrivals = [0] * sim_hours
    
    patients_completed = [0]
    
    random.seed(42)
    np.random.seed(42)
    
    def patient_process(env, patient_id):
        arrival_time = env.now
        hour_idx = min(int(arrival_time // 60), sim_hours - 1)
        hourly_arrivals[hour_idx] += 1
        
        # 1. Nursing Triage
        with nurses.request() as req:
            yield req
            triage_duration = np.random.exponential(8.0)
            yield env.timeout(triage_duration)
            
        # 2. Doctor Consultation
        t_request_doc = env.now
        with doctors.request() as req_doc:
            yield req_doc
            wait_for_doc = env.now - t_request_doc
            wait_times.append(wait_for_doc)
            
            consult_duration = np.random.exponential(avg_consult)
            consult_times.append(consult_duration)
            yield env.timeout(consult_duration)
            
        # 3. Bed Admission (if needed, 60% probability)
        if random.random() < 0.60:
            with beds.request() as req_bed:
                yield req_bed
                stay_duration_mins = np.random.exponential(avg_bed_stay * 60.0)
                bed_stay_times.append(stay_duration_mins)
                yield env.timeout(stay_duration_mins)
                
        patients_completed[0] += 1
        
    def monitor(env):
        while True:
            hour_idx = min(int(env.now // 60), sim_hours - 1)
            hourly_queue[hour_idx] = len(doctors.queue) + len(nurses.queue)
            occupancy_pct = (beds.count / float(num_beds)) * 100.0
            hourly_occupancy[hour_idx] = round(occupancy_pct, 1)
            yield env.timeout(30) # monitor every 30 mins
            
    def patient_generator(env):
        p_id = 0
        mean_interarrival = 60.0 / max(0.1, arrival_rate)
        while True:
            interarrival = np.random.exponential(mean_interarrival)
            yield env.timeout(interarrival)
            p_id += 1
            env.process(patient_process(env, p_id))
            
    env.process(patient_generator(env))
    env.process(monitor(env))
    env.run(until=sim_duration_mins)
    
    # Calculate statistics
    avg_wait = round(float(np.mean(wait_times)) if wait_times else 0.0, 1)
    p90_wait = round(float(np.percentile(wait_times, 90)) if wait_times else 0.0, 1)
    max_wait = round(float(np.max(wait_times)) if wait_times else 0.0, 1)
    avg_occupancy = round(float(np.mean(hourly_occupancy)) if hourly_occupancy else 0.0, 1)
    
    # Doctor utilization approx
    total_consult_time = sum(consult_times)
    doc_utilization = round(min(100.0, (total_consult_time / (num_doctors * sim_duration_mins)) * 100.0), 1)
    
    timeline = []
    for h in range(sim_hours):
        timeline.append({
            "hour": f"Hour {h+1}",
            "arrivals": hourly_arrivals[h],
            "queueLength": hourly_queue[h],
            "bedOccupancy": min(100.0, hourly_occupancy[h])
        })
        
    # Quality compliance risk estimation for simulated configuration
    risk_level = "LOW"
    risk_score = 15.0
    if avg_wait > 45 or avg_occupancy > 90:
        risk_level = "HIGH"
        risk_score = 75.0
    elif avg_wait > 25 or avg_occupancy > 80:
        risk_level = "MEDIUM"
        risk_score = 45.0
        
    if avg_wait > 60 or avg_occupancy > 95:
        risk_level = "CRITICAL"
        risk_score = 90.0

    return {
        "status": "success",
        "scenarioParameters": {
            "arrivalRatePerHour": arrival_rate,
            "numDoctors": num_doctors,
            "numNurses": num_nurses,
            "numBeds": num_beds,
            "avgConsultationTime": avg_consult,
            "avgBedStayHours": avg_bed_stay,
            "simulationHours": sim_hours
        },
        "results": {
            "patientsServed": patients_completed[0],
            "avgWaitTimeMinutes": avg_wait,
            "p90WaitTimeMinutes": p90_wait,
            "maxWaitTimeMinutes": max_wait,
            "avgBedOccupancyRate": avg_occupancy,
            "doctorUtilizationRate": doc_utilization,
            "simulatedRiskScore": risk_score,
            "simulatedRiskLevel": risk_level
        },
        "timeline": timeline,
        "isScenarioEstimate": True
    }
