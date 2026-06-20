import time
from datetime import datetime, timezone
from models import Reminder, User

def start_scheduler(app, socketio):
    with app.app_context():
        while True:
            try:
                check_reminders(app, socketio)
            except Exception as e:
                print(f"Scheduler error: {e}")
            time.sleep(3600)

def check_reminders(app, socketio):
    now = datetime.now(timezone.utc)
    
    with app.app_context():
        due_reminders = Reminder.query.filter(
            Reminder.due_date <= now,
            Reminder.is_read == False
        ).all()
        
        user_ids = set()
        for reminder in due_reminders:
            user_ids.add(reminder.user_id)
        
        for user_id in user_ids:
            socketio.emit('reminder', {
                'user_id': user_id,
                'message': 'You have new review reminders'
            }, room=f"user_{user_id}")
            
            try:
                user = User.query.get(user_id)
                if user:
                    send_desktop_notification(user.email, "Learning Reminder", "You have reviews due today!")
            except Exception as e:
                print(f"Notification error: {e}")

def send_desktop_notification(email, title, message):
    print(f"Notification to {email}: {title} - {message}")
