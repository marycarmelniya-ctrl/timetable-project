from flask import Flask, request, jsonify, render_template
import sqlite3
import random

app = Flask(__name__)

# -----------------------------
# HOME ROUTE (IMPORTANT FIX)
# -----------------------------
@app.route("/")
def home():
    return render_template("dashboard.html")


# -----------------------------
# DATABASE CONNECTION
# -----------------------------
def get_db():
    return sqlite3.connect("database.db")


# -----------------------------
# GET TEACHERS
# -----------------------------
@app.route("/teachers")
def get_teachers():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM teachers")
    rows = cursor.fetchall()

    data = []
    for r in rows:
        data.append({
            "id": r[0],
            "name": r[1],
            "department": r[2]
        })

    conn.close()
    return jsonify(data)


# -----------------------------
# GET CLASSES
# -----------------------------
@app.route("/classes")
def get_classes():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, class_name, section FROM classes")
    rows = cursor.fetchall()

    data = []
    for r in rows:
        data.append({
            "id": r[0],
            "class_name": r[1],
            "section": r[2]
        })

    conn.close()
    return jsonify(data)


# -----------------------------
# GET ROOMS
# -----------------------------
@app.route("/rooms")
def get_rooms():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rooms")
    rows = cursor.fetchall()

    data = []
    for r in rows:
        data.append({
            "id": r[0],
            "room_number": r[1],
            "capacity": r[2]
        })

    conn.close()
    return jsonify(data)


# -----------------------------
# GET LESSONS
# -----------------------------
@app.route("/lessons")
def get_lessons():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM lessons")
    rows = cursor.fetchall()

    data = []
    for r in rows:
        data.append({
            "id": r[0],
            "teacher_id": r[1],
            "class_id": r[2],
            "room_id": r[3],
            "subject": r[4],
            "day": r[5],
            "period": r[6]
        })

    conn.close()
    return jsonify(data)


# -----------------------------
# SMART TIMETABLE GENERATION
# -----------------------------
@app.route("/generate-timetable", methods=["POST"])
def generate_timetable():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM lessons")

    days = ["Monday","Tuesday","Wednesday","Thursday","Friday"]
    periods = [1,2,3,4,5]

    subjects = ["Math","Physics","Chemistry","CS","English"]

    cursor.execute("SELECT id FROM teachers")
    teachers = cursor.fetchall()

    cursor.execute("SELECT id FROM classes")
    classes = cursor.fetchall()

    cursor.execute("SELECT id FROM rooms")
    rooms = cursor.fetchall()

    if not teachers or not classes or not rooms:
        return jsonify({"error": "Missing data!"})

    used_teachers = {}
    used_rooms = {}

    for c in classes:

        subject_count = {sub: 0 for sub in subjects}

        for day in days:

            prev_subject = None

            for period in periods:

                # subject logic
                available_subjects = [s for s in subjects if s != prev_subject]
                random.shuffle(available_subjects)
                available_subjects.sort(key=lambda x: subject_count[x])

                min_count = subject_count[available_subjects[0]]
                least_used = [s for s in available_subjects if subject_count[s] == min_count]

                subject = random.choice(least_used)

                subject_count[subject] += 1
                prev_subject = subject

                # conflict + blocked logic
                if (day, period) not in used_teachers:
                    used_teachers[(day, period)] = set()
                if (day, period) not in used_rooms:
                    used_rooms[(day, period)] = set()

                available_teachers = []

                for t in teachers:
                    teacher_id = t[0]

                    if teacher_id in used_teachers[(day, period)]:
                        continue

                    cursor.execute("""
                    SELECT 1 FROM blocked_slots
                    WHERE teacher_id=? AND day=? AND period=?
                    """, (teacher_id, day, period))

                    if cursor.fetchone():
                        continue

                    available_teachers.append(teacher_id)

                if not available_teachers:
                    continue

                teacher = random.choice(available_teachers)

                available_rooms = [r[0] for r in rooms if r[0] not in used_rooms[(day, period)]]
                if not available_rooms:
                    continue

                room = random.choice(available_rooms)

                used_teachers[(day, period)].add(teacher)
                used_rooms[(day, period)].add(room)

                cursor.execute("""
                INSERT INTO lessons (teacher_id, class_id, room_id, subject, day, period)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (teacher, c[0], room, subject, day, period))

    conn.commit()
    conn.close()

    return jsonify({"message": "Smart timetable generated"})


# -----------------------------
# 🔥 RELIEF SYSTEM (ADDED)
# -----------------------------
@app.route("/assign-relief", methods=["POST"])
def assign_relief():
    data = request.json

    teacher_id = data["teacher_id"]
    day = data["day"]
    period = data["period"]

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id FROM lessons
    WHERE teacher_id=? AND day=? AND period=?
    """, (teacher_id, day, period))

    lesson = cursor.fetchone()

    if not lesson:
        return jsonify({"error": "No lesson found"})

    lesson_id = lesson[0]

    cursor.execute("SELECT id FROM teachers")
    teachers = cursor.fetchall()

    cursor.execute("""
    SELECT teacher_id FROM lessons
    WHERE day=? AND period=?
    """, (day, period))

    busy = [t[0] for t in cursor.fetchall()]

    cursor.execute("""
    SELECT teacher_id FROM blocked_slots
    WHERE day=? AND period=?
    """, (day, period))

    blocked = [t[0] for t in cursor.fetchall()]

    available = []

    for t in teachers:
        tid = t[0]

        if tid == teacher_id:
            continue
        if tid in busy:
            continue
        if tid in blocked:
            continue

        available.append(tid)

    if not available:
        return jsonify({"error": "No relief teacher available"})

    relief_teacher = random.choice(available)

    cursor.execute("""
    UPDATE lessons
    SET teacher_id=?
    WHERE id=?
    """, (relief_teacher, lesson_id))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Relief assigned",
        "new_teacher": relief_teacher
    })


# -----------------------------
# RUN APP
# -----------------------------
if __name__ == "__main__":
    app.run()