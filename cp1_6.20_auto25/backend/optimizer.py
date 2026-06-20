from datetime import datetime, timedelta
from collections import defaultdict
import copy

OVERLOAD_THRESHOLD = 30
UNDERLOAD_THRESHOLD = 15


def detect_conflicts(tasks):
    conflicts = []
    member_tasks = defaultdict(list)
    for task in tasks:
        if task.get('status') != 'done':
            member_tasks[task['assigneeId']].append(task)

    for member_id, member_task_list in member_tasks.items():
        total_hours = sum(t['estimatedHours'] for t in member_task_list)
        if total_hours > OVERLOAD_THRESHOLD:
            date_map = defaultdict(list)
            for t in member_task_list:
                date_map[t['dueDate']].append(t)
            for due_date, date_tasks in date_map.items():
                if len(date_tasks) > 1:
                    high_tasks = [t for t in date_tasks if t['priority'] == 'high']
                    if len(high_tasks) > 1:
                        conflicts.append({
                            'type': 'deadline_overlap',
                            'memberId': member_id,
                            'dueDate': due_date,
                            'taskIds': [t['id'] for t in high_tasks],
                            'message': f"成员 {member_id} 在 {due_date} 有多个高优先级任务"
                        })

        if total_hours > OVERLOAD_THRESHOLD:
            conflicts.append({
                'type': 'overload',
                'memberId': member_id,
                'totalHours': total_hours,
                'message': f"成员 {member_id} 总工时 {total_hours}h 超过阈值 {OVERLOAD_THRESHOLD}h"
            })

    return conflicts


def optimize(tasks):
    optimized = copy.deepcopy(tasks)
    conflicts = detect_conflicts(optimized)

    member_hours = defaultdict(int)
    for task in optimized:
        if task.get('status') != 'done':
            member_hours[task['assigneeId']] += task['estimatedHours']

    member_ids = list(set(t['assigneeId'] for t in optimized))

    overloaded = [m for m in member_ids if member_hours[m] > OVERLOAD_THRESHOLD]
    overloaded.sort(key=lambda m: member_hours[m], reverse=True)

    underloaded = [m for m in member_ids if member_hours[m] < UNDERLOAD_THRESHOLD]
    underloaded.sort(key=lambda m: member_hours[m])

    reassigned = []

    for over_member in overloaded:
        movable_tasks = [
            t for t in optimized
            if t['assigneeId'] == over_member
            and t.get('status') != 'done'
            and t['priority'] != 'high'
        ]
        movable_tasks.sort(key=lambda t: (
            {'low': 0, 'medium': 1, 'high': 2}.get(t['priority'], 1),
            -t['estimatedHours']
        ))

        for task in movable_tasks:
            if member_hours[over_member] <= OVERLOAD_THRESHOLD:
                break

            best_target = None
            best_hours = float('inf')
            for under_member in underloaded:
                new_hours = member_hours[under_member] + task['estimatedHours']
                if new_hours <= OVERLOAD_THRESHOLD and member_hours[under_member] < best_hours:
                    best_target = under_member
                    best_hours = member_hours[under_member]

            if best_target is not None:
                task['assigneeId'] = best_target
                member_hours[over_member] -= task['estimatedHours']
                member_hours[best_target] += task['estimatedHours']
                reassigned.append({
                    'taskId': task['id'],
                    'fromMember': over_member,
                    'toMember': best_target
                })

                if member_hours[best_target] >= UNDERLOAD_THRESHOLD:
                    if best_target in underloaded:
                        underloaded.remove(best_target)

    return {
        'tasks': optimized,
        'conflicts': conflicts,
        'reassigned': reassigned,
        'memberHours': dict(member_hours)
    }
