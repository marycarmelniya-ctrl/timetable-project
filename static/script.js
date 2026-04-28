document.addEventListener("DOMContentLoaded", function () {

    let isTeacherView = false;

    const displayArea = document.getElementById("displayArea");
    const teacherCount = document.getElementById("teacherCount");
    const classCount = document.getElementById("classCount");
    const roomCount = document.getElementById("roomCount");
    const lessonCount = document.getElementById("lessonCount");

    // -----------------------------
    // Load Counts
    // -----------------------------
    function loadCounts() {

        fetch("/teachers")
        .then(res => res.json())
        .then(data => teacherCount.innerText = data.length + " Teachers");

        fetch("/classes")
        .then(res => res.json())
        .then(data => classCount.innerText = data.length + " Classes");

        fetch("/rooms")
        .then(res => res.json())
        .then(data => roomCount.innerText = data.length + " Rooms");

        fetch("/lessons")
        .then(res => res.json())
        .then(data => lessonCount.innerText = data.length + " Lessons");
    }

    // -----------------------------
    // Generate Timetable
    // -----------------------------
    function generateTimetable() {
        isTeacherView = false;

        fetch("/generate-timetable", { method: "POST" })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadCounts();
            getLessons();
        });
    }

    // -----------------------------
    // Download Timetable
    // -----------------------------
    function downloadTimetable() {

        let content = displayArea.innerHTML;

        if (!content.trim()) {
            alert("Generate timetable first!");
            return;
        }

        let blob = new Blob([`
            <html>
            <body>${content}</body>
            </html>
        `], { type: "text/html" });

        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "timetable.html";
        a.click();
    }

    // -----------------------------
    // Teacher Dropdown
    // -----------------------------
    function loadTeacherDropdown() {
        fetch("/teachers")
        .then(res => res.json())
        .then(data => {
            let select = document.getElementById("teacherSelect");

            select.innerHTML = '<option value="">Select Teacher</option>';

            data.forEach(t => {
                let option = document.createElement("option");
                option.value = t.id;
                option.text = t.name;
                select.appendChild(option);
            });
        });
    }

    // -----------------------------
    // ✅ FIXED Teacher Timetable
    // -----------------------------
    function viewTeacherTimetable() {

        isTeacherView = true;

        let teacherId = document.getElementById("teacherSelect").value;

        if (!teacherId) {
            alert("Select teacher first");
            return;
        }

        fetch("/lessons")
        .then(res => res.json())
        .then(data => {

            let filtered = data.filter(l => l.teacher_id == teacherId);

            let html = "<h2>My Timetable</h2><table><tr><th>Day</th><th>Period</th><th>Subject</th></tr>";

            filtered.forEach(l => {
                html += `<tr>
                            <td>${l.day}</td>
                            <td>${l.period}</td>
                            <td>${l.subject}</td>
                        </tr>`;
            });

            html += "</table>";

            displayArea.innerHTML = html;
        });
    }

    // -----------------------------
    // Teachers
    // -----------------------------
    function getTeachers() {
        isTeacherView = false;

        fetch("/teachers")
        .then(res => res.json())
        .then(data => {

            let html = "<h2>Teachers</h2><table><tr><th>Name</th><th>Department</th></tr>";

            data.forEach(t => {
                html += `<tr><td>${t.name}</td><td>${t.department}</td></tr>`;
            });

            html += "</table>";

            displayArea.innerHTML = html;
        });
    }

    function getClasses() {
        isTeacherView = false;

        fetch("/classes")
        .then(res => res.json())
        .then(data => {

            let html = "<h2>Classes</h2><table><tr><th>Class</th><th>Section</th></tr>";

            data.forEach(c => {
                html += `<tr><td>${c.class_name}</td><td>${c.section}</td></tr>`;
            });

            html += "</table>";

            displayArea.innerHTML = html;
        });
    }

    function getRooms() {
        isTeacherView = false;

        fetch("/rooms")
        .then(res => res.json())
        .then(data => {

            let html = "<h2>Rooms</h2><table><tr><th>Room</th><th>Capacity</th></tr>";

            data.forEach(r => {
                html += `<tr><td>${r.room_number}</td><td>${r.capacity}</td></tr>`;
            });

            html += "</table>";

            displayArea.innerHTML = html;
        });
    }

    // -----------------------------
    // ✅ FIXED Timetable Grid
    // -----------------------------
    function getLessons() {

        isTeacherView = false;

        fetch("/classes")
        .then(res => res.json())
        .then(classData => {

            let classMap = {};
            classData.forEach(c => {
                classMap[c.id] = c.class_name + " - " + c.section;
            });

            fetch("/lessons")
            .then(res => res.json())
            .then(data => {

                let days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
                let periods = [1,2,3,4,5];

                let classes = [...new Set(data.map(l => l.class_id))];

                let html = "<h2>Weekly Timetable</h2>";

                classes.forEach(classId => {

                    html += `<h3>${classMap[classId]}</h3>`;
                    html += "<table><tr><th>Day</th>";

                    periods.forEach(p => html += `<th>P${p}</th>`);
                    html += "</tr>";

                    days.forEach(day => {
                        html += `<tr><td>${day}</td>`;

                        periods.forEach(p => {
                            let lesson = data.find(l =>
                                l.day === day &&
                                l.period === p &&
                                l.class_id === classId
                            );

                            html += `<td>${lesson ? lesson.subject : "-"}</td>`;
                        });

                        html += "</tr>";
                    });

                    html += "</table><br>";
                });

                displayArea.innerHTML = html;
            });

        });
    }

    // -----------------------------
    // Relief System
    // -----------------------------
    function assignRelief() {

        let teacher_id = document.getElementById("reliefTeacher").value;
        let day = document.getElementById("reliefDay").value;
        let period = document.getElementById("reliefPeriod").value;

        fetch("/assign-relief", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ teacher_id, day, period })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || data.error);
            getLessons();
        });
    }

    // -----------------------------
    // Digital Handover
    // -----------------------------
    function saveNote() {
        let note = document.getElementById("handoverNote").value;
        localStorage.setItem("handoverNote", note);
        alert("Note saved!");
    }

    function loadNote() {
        let note = localStorage.getItem("handoverNote");
        if (note) document.getElementById("handoverNote").value = note;
    }

    // -----------------------------
    // Expose
    // -----------------------------
    window.generateTimetable = generateTimetable;
    window.getTeachers = getTeachers;
    window.getClasses = getClasses;
    window.getRooms = getRooms;
    window.getLessons = getLessons;
    window.viewTeacherTimetable = viewTeacherTimetable;
    window.downloadTimetable = downloadTimetable;
    window.assignRelief = assignRelief;
    window.saveNote = saveNote;

    // -----------------------------
    // ✅ SMART AUTO REFRESH
    // -----------------------------
    setInterval(() => {
        if (!isTeacherView) {
            getLessons();
        }
    }, 5000);

    setInterval(loadCounts, 5000);

    loadCounts();
    loadTeacherDropdown();
    loadNote();

});