from collections import defaultdict

DEFAULT_REFERENCE_PATHWAYS = {
    "ICU": ["Admission", "Triage", "Lab", "Medication Verification", "Treatment"],
    "Emergency": ["Registration", "Triage", "Emergency Examination", "Medication Verification", "Treatment", "Disposition"],
    "Surgery": ["Pre-Op Assessment", "Anesthesia Check", "Surgical Safety Checklist", "Surgical Procedure", "Post-Op Recovery"],
    "Cardiology": ["Admission", "ECG", "Biomarker Lab", "Cardiology Review", "Medication Verification", "Intervention"],
    "General Ward": ["Admission", "Nursing Triage", "Physician Rounds", "Medication Verification", "Discharge Planning"]
}

def check_trace_conformance(traces, department="ICU", custom_reference_pathway=None):
    """
    Evaluates patient traces against expected clinical protocol.
    Returns conformance metrics, deviation statistics, and specific evidence logs.
    """
    if not traces:
        return {
            "department": department,
            "conformanceRate": 100.0,
            "totalTraces": 0,
            "compliantTraces": 0,
            "deviatedTraces": 0,
            "deviations": [],
            "evidence": ["No traces found for department"]
        }
        
    expected_path = custom_reference_pathway or DEFAULT_REFERENCE_PATHWAYS.get(department, DEFAULT_REFERENCE_PATHWAYS["ICU"])
    
    compliant_count = 0
    deviated_count = 0
    missing_activity_counts = defaultdict(int)
    order_violation_counts = defaultdict(int)
    case_results = []
    
    for case in traces:
        case_id = case.get('caseId', 'Unknown')
        events = case.get('events', [])
        actual_activities = [e.get('activity') for e in events if e.get('activity')]
        
        # Check missing mandatory activities
        missing_steps = [step for step in expected_path if step not in actual_activities]
        
        # Check step sequence order
        order_violations = []
        last_index = -1
        for step in actual_activities:
            if step in expected_path:
                curr_index = expected_path.index(step)
                if curr_index < last_index:
                    order_violations.append(f"{step} occurred out-of-sequence")
                last_index = curr_index
                
        is_compliant = (len(missing_steps) == 0 and len(order_violations) == 0)
        
        if is_compliant:
            compliant_count += 1
        else:
            deviated_count += 1
            for m in missing_steps:
                missing_activity_counts[m] += 1
            for o in order_violations:
                order_violation_counts[o] += 1
                
        # Fitness formula for trace
        matched_count = len([a for a in actual_activities if a in expected_path])
        fitness = round((matched_count / max(1, len(expected_path))) * 100.0, 1)
        if missing_steps:
            fitness = max(20.0, fitness - (len(missing_steps) * 20.0))
            
        case_results.append({
            "caseId": case_id,
            "actualPath": actual_activities,
            "expectedPath": expected_path,
            "isCompliant": is_compliant,
            "missingSteps": missing_steps,
            "orderViolations": order_violations,
            "fitness": fitness
        })
        
    total_traces = len(traces)
    overall_conformance = round((compliant_count / max(1, total_traces)) * 100.0, 1)
    
    # Synthesize structured evidence strings
    evidence_logs = []
    deviations_summary = []
    
    for activity, count in missing_activity_counts.items():
        pct = round((count / total_traces) * 100.0, 1)
        evidence_msg = f"{count} of {total_traces} patient traces ({pct}%) skipped mandatory step '{activity}'"
        evidence_logs.append(evidence_msg)
        deviations_summary.append({
            "type": "SKIPPED_STEP",
            "activity": activity,
            "count": count,
            "percentage": pct,
            "severity": "HIGH" if "Medication" in activity or "Safety" in activity else "MEDIUM"
        })
        
    for violation, count in order_violation_counts.items():
        pct = round((count / total_traces) * 100.0, 1)
        evidence_msg = f"{count} traces exhibited sequence violation: {violation}"
        evidence_logs.append(evidence_msg)
        deviations_summary.append({
            "type": "ORDER_VIOLATION",
            "activity": violation,
            "count": count,
            "percentage": pct,
            "severity": "MEDIUM"
        })
        
    if not evidence_logs:
        evidence_logs.append(f"100% of analyzed traces strictly conformed to expected {department} clinical protocol.")

    return {
        "department": department,
        "conformanceRate": overall_conformance,
        "totalTraces": total_traces,
        "compliantTraces": compliant_count,
        "deviatedTraces": deviated_count,
        "expectedPath": expected_path,
        "deviations": deviations_summary,
        "evidence": evidence_logs,
        "caseDetails": case_results[:25] # Return top 25 for inspection
    }
