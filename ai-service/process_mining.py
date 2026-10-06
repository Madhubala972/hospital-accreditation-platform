import pandas as pd
from datetime import datetime
from collections import defaultdict, Counter

def analyze_process_mining(traces):
    """
    Given a list of patient traces:
    [
      { "caseId": "P-101", "department": "ICU", "events": [ { "activity": "Admission", "timestamp": "...", "resource": "Dr. Smith" }, ... ] }
    ]
    Computes directly-follows graph, transition counts, bottlenecks, and trace variants.
    """
    if not traces:
        return {
            "totalCases": 0,
            "variants": [],
            "nodes": [],
            "edges": [],
            "bottlenecks": []
        }

    variant_counter = Counter()
    edges_count = defaultdict(int)
    edges_duration_sum = defaultdict(float)
    activity_counts = defaultdict(int)
    
    total_cases = len(traces)
    
    for case in traces:
        events = case.get('events', [])
        # Sort events by timestamp if available
        try:
            sorted_events = sorted(
                events, 
                key=lambda x: datetime.fromisoformat(x.get('timestamp').replace('Z', '+00:00')) if x.get('timestamp') else datetime.min
            )
        except Exception:
            sorted_events = events
            
        activities = [e.get('activity') for e in sorted_events if e.get('activity')]
        if not activities:
            continue
            
        variant_key = " -> ".join(activities)
        variant_counter[variant_key] += 1
        
        for act in activities:
            activity_counts[act] += 1
            
        for i in range(len(sorted_events) - 1):
            src = sorted_events[i].get('activity')
            dst = sorted_events[i+1].get('activity')
            edge_key = (src, dst)
            edges_count[edge_key] += 1
            
            # calculate duration if timestamps valid
            try:
                t1 = datetime.fromisoformat(sorted_events[i].get('timestamp').replace('Z', '+00:00'))
                t2 = datetime.fromisoformat(sorted_events[i+1].get('timestamp').replace('Z', '+00:00'))
                duration_mins = max(0, (t2 - t1).total_seconds() / 60.0)
                edges_duration_sum[edge_key] += duration_mins
            except Exception:
                edges_duration_sum[edge_key] += 15.0 # default estimated duration in mins

    # Format nodes
    nodes = [
        {"id": act, "label": act, "count": count, "frequency": round((count / max(1, total_cases)), 2)}
        for act, count in activity_counts.items()
    ]
    
    # Format edges & find bottlenecks
    edges = []
    bottlenecks = []
    
    for (src, dst), count in edges_count.items():
        avg_duration = round(edges_duration_sum[(src, dst)] / max(1, count), 1)
        edge_data = {
            "source": src,
            "target": dst,
            "count": count,
            "avgDurationMinutes": avg_duration
        }
        edges.append(edge_data)
        
        # Bottleneck criteria: high average duration
        if avg_duration > 45.0:
            bottlenecks.append({
                "from": src,
                "to": dst,
                "avgDurationMinutes": avg_duration,
                "caseCount": count,
                "severity": "HIGH" if avg_duration > 90 else "MEDIUM"
            })
            
    # Format variants
    variants = []
    for var_str, count in variant_counter.most_common(10):
        variants.append({
            "variantPath": var_str,
            "activities": var_str.split(" -> "),
            "caseCount": count,
            "percentage": round((count / max(1, total_cases)) * 100.0, 1)
        })
        
    return {
        "totalCases": total_cases,
        "uniqueActivities": len(nodes),
        "nodes": nodes,
        "edges": edges,
        "variants": variants,
        "bottlenecks": sorted(bottlenecks, key=lambda x: x['avgDurationMinutes'], reverse=True)
    }
