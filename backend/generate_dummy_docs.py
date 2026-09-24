import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"c:\project\Welfare-main\sample_documents"
os.makedirs(OUT_DIR, exist_ok=True)

# Try to load Windows standard Arial or Segoe UI font, fallback to default
def get_fonts():
    try:
        title_font = ImageFont.truetype("arial.ttf", 26)
        sub_font = ImageFont.truetype("arial.ttf", 18)
        body_font = ImageFont.truetype("arial.ttf", 16)
        bold_font = ImageFont.truetype("arialbd.ttf", 17)
        bold_lg = ImageFont.truetype("arialbd.ttf", 22)
        sm_font = ImageFont.truetype("arial.ttf", 13)
        return title_font, sub_font, body_font, bold_font, bold_lg, sm_font
    except Exception:
        f = ImageFont.load_default()
        return f, f, f, f, f, f

title_f, sub_f, body_f, bold_f, bold_lg_f, sm_f = get_fonts()

def draw_header(d, w, title, subtitle="", dept="GOVERNMENT OF TAMIL NADU"):
    d.rectangle([(0, 0), (w, 80)], fill="#0f172a")
    d.text((w // 2, 22), dept, fill="#f8fafc", font=sub_f, anchor="mm")
    d.text((w // 2, 52), subtitle, fill="#94a3b8", font=sm_f, anchor="mm")
    d.line([(0, 80), (w, 80)], fill="#3b82f6", width=4)

def draw_stamp(d, x, y, text="VERIFIED OFFICIAL"):
    d.ellipse([(x, y), (x + 110, y + 110)], outline="#059669", width=3)
    d.ellipse([(x + 8, y + 8), (x + 102, y + 102)], outline="#059669", width=1)
    d.text((x + 55, y + 45), text, fill="#059669", font=sm_f, anchor="mm")
    d.text((x + 55, y + 65), "SEAL / O.S.", fill="#059669", font=sm_f, anchor="mm")

def draw_barcode(d, x, y, w, h):
    d.rectangle([(x, y), (x + w, y + h)], fill="#ffffff", outline="#cbd5e1")
    cur_x = x + 10
    step = 4
    for i in range(25):
        thick = 2 if (i % 3 == 0 or i % 5 == 0) else 1
        d.line([(cur_x, y + 5), (cur_x, y + h - 5)], fill="#000000", width=thick)
        cur_x += step

# -------------------------------------------------------------
# 1. Aadhaar Card
# -------------------------------------------------------------
def make_aadhaar():
    w, h = 900, 560
    img = Image.new("RGB", (w, h), "#fdfbf7")
    d = ImageDraw.Draw(img)
    # Header bar
    d.rectangle([(0, 0), (w, 75)], fill="#1e3a8a")
    d.text((w // 2, 25), "GOVERNMENT OF INDIA", fill="#ffffff", font=bold_f, anchor="mm")
    d.text((w // 2, 52), "Unique Identification Authority of India (UIDAI)", fill="#e2e8f0", font=sm_f, anchor="mm")
    d.line([(0, 75), (w, 75)], fill="#f97316", width=4)

    # Photo box
    d.rectangle([(45, 110), (220, 310)], fill="#e2e8f0", outline="#94a3b8", width=2)
    # Draw avatar head/shoulders
    d.ellipse([(105, 140), (160, 195)], fill="#64748b")
    d.chord([(75, 205), (190, 320)], 0, 180, fill="#64748b")
    d.text((132, 290), "PHOTO", fill="#475569", font=sm_f, anchor="mm")

    # Details
    x_text = 260
    d.text((x_text, 115), "Name / பெயர்:", fill="#64748b", font=sm_f)
    d.text((x_text, 138), "Selvan Vijay Kumar", fill="#0f172a", font=bold_lg_f)

    d.text((x_text, 185), "Date of Birth / பிறந்த தேதி:", fill="#64748b", font=sm_f)
    d.text((x_text, 208), "15/08/2004", fill="#0f172a", font=bold_f)

    d.text((x_text, 245), "Gender / பாலினம்:", fill="#64748b", font=sm_f)
    d.text((x_text, 268), "Male / ஆண்", fill="#0f172a", font=bold_f)

    d.text((x_text, 305), "Address / முகவரி:", fill="#64748b", font=sm_f)
    d.text((x_text, 328), "42, Anna Salai, Gandhipuram, Coimbatore - 641012, Tamil Nadu", fill="#1e293b", font=body_f)

    # Aadhaar Number banner
    d.rectangle([(40, 420), (w - 40, 490)], fill="#eff6ff", outline="#3b82f6", width=2)
    d.text((w // 2, 455), "5489   1234   8912", fill="#1e3a8a", font=bold_lg_f, anchor="mm")

    # Footer
    d.rectangle([(0, 525), (w, 560)], fill="#f97316")
    d.text((w // 2, 542), "mera aadhaar, meri pehchan — uidai.gov.in", fill="#ffffff", font=sm_f, anchor="mm")

    img.save(os.path.join(OUT_DIR, "01_aadhaar_card.jpg"), quality=95)

# -------------------------------------------------------------
# 2. Community Certificate
# -------------------------------------------------------------
def make_community():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    # Outer border
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    d.rectangle([(28, 28), (w - 28, h - 28)], outline="#3b82f6", width=1)

    draw_header(d, w, "GOVERNMENT OF TAMIL NADU", "REVENUE DEPARTMENT / வருவாய்த் துறை", "GOVERNMENT OF TAMIL NADU")

    d.text((w // 2, 120), "COMMUNITY CERTIFICATE / சாதிச் சான்றிதழ்", fill="#1e3a8a", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "Certificate No: TN-COMM-2026-44819", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Applicant Name", "Selvan Vijay Kumar"),
        ("Father's Name", "K. Murugan"),
        ("Mother's Name", "M. Lakshmi"),
        ("Date of Birth", "15/08/2004"),
        ("Community / Caste", "Backward Class (BC) - Vadugan / Kongu"),
        ("Sub-Caste", "Vadugan"),
        ("Village / Town", "Gandhipuram"),
        ("Taluk", "Coimbatore South"),
        ("District", "Coimbatore"),
        ("State", "Tamil Nadu"),
    ]

    y = 210
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 42)], fill="#f8fafc", outline="#e2e8f0")
        d.text((80, y + 21), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 21), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 54

    d.text((60, y + 20), "This certificate is issued based on field verification and revenue records.", fill="#475569", font=body_f)
    d.text((60, y + 50), "Date of Issue: 14/06/2024", fill="#0f172a", font=bold_f)

    draw_stamp(d, w - 240, y + 70, "TAHSILDAR")
    d.text((w - 185, y + 195), "Tahsildar / மண்டல துணை வட்டாட்சியர்\nCoimbatore South", fill="#0f172a", font=sm_f, anchor="mm")

    draw_barcode(d, 60, y + 100, 200, 60)
    img.save(os.path.join(OUT_DIR, "02_community_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 3. Income Certificate
# -------------------------------------------------------------
def make_income():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    d.rectangle([(28, 28), (w - 28, h - 28)], outline="#059669", width=1)

    draw_header(d, w, "GOVERNMENT OF TAMIL NADU", "REVENUE DEPARTMENT / வருவாய்த் துறை", "GOVERNMENT OF TAMIL NADU")

    d.text((w // 2, 120), "INCOME CERTIFICATE / வருமானச் சான்றிதழ்", fill="#065f46", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "Certificate No: TN-INC-2026-88192", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Applicant Name", "Selvan Vijay Kumar"),
        ("Father's Name", "K. Murugan"),
        ("Family Annual Income", "Rs. 72,000 /-"),
        ("Income in Words", "Rupees Seventy Two Thousand Only"),
        ("Source of Income", "Agriculture & Daily Labor"),
        ("Taluk", "Coimbatore South"),
        ("District", "Coimbatore"),
        ("Date of Issue", "20/05/2024"),
    ]

    y = 220
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 45)], fill="#f0fdf4", outline="#bbf7d0")
        d.text((80, y + 22), label, fill="#065f46", font=bold_f, anchor="lm")
        d.text((360, y + 22), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 58

    d.text((60, y + 30), "This certificate is valid for scholarship and welfare scheme applications.", fill="#475569", font=body_f)
    draw_stamp(d, w - 240, y + 80, "REVENUE DEPT")
    d.text((w - 185, y + 205), "Zonal Deputy Tahsildar\nCoimbatore South", fill="#0f172a", font=sm_f, anchor="mm")
    draw_barcode(d, 60, y + 90, 200, 60)

    img.save(os.path.join(OUT_DIR, "03_income_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 4. Nativity Certificate
# -------------------------------------------------------------
def make_nativity():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)

    draw_header(d, w, "GOVERNMENT OF TAMIL NADU", "REVENUE DEPARTMENT / வருவாய்த் துறை", "GOVERNMENT OF TAMIL NADU")
    d.text((w // 2, 120), "NATIVITY / RESIDENCE CERTIFICATE", fill="#1e3a8a", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "Certificate No: TN-NAT-2026-10294", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Applicant Name", "Selvan Vijay Kumar"),
        ("Father's Name", "K. Murugan"),
        ("Native District", "Coimbatore, Tamil Nadu"),
        ("Period of Continuous Residence", "20 Years"),
        ("Door No & Street", "42, Anna Salai, Gandhipuram"),
        ("Date of Issue", "18/06/2024"),
    ]

    y = 220
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 45)], fill="#f8fafc", outline="#e2e8f0")
        d.text((80, y + 22), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 22), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 58

    draw_stamp(d, w - 240, y + 80, "TAHSILDAR")
    d.text((w - 185, y + 205), "Tahsildar, Coimbatore South", fill="#0f172a", font=sm_f, anchor="mm")
    draw_barcode(d, 60, y + 90, 200, 60)
    img.save(os.path.join(OUT_DIR, "04_nativity_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 5. Class 10 Marksheet
# -------------------------------------------------------------
def make_marksheet10():
    w, h = 850, 1100
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)

    d.rectangle([(20, 20), (w - 20, 100)], fill="#1e3a8a")
    d.text((w // 2, 45), "TAMIL NADU STATE BOARD OF SCHOOL EXAMINATIONS", fill="#ffffff", font=bold_f, anchor="mm")
    d.text((w // 2, 75), "SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC / CLASS X)", fill="#93c5fd", font=sm_f, anchor="mm")

    d.text((70, 130), "Roll Number: 1084920", fill="#b91c1c", font=bold_f)
    d.text((70, 160), "Student Name: Vijay Kumar K", fill="#0f172a", font=bold_lg_f)
    d.text((70, 195), "School: Government Higher Secondary School, Coimbatore", fill="#475569", font=body_f)

    # Subject Table
    headers = ["Subject", "Max Marks", "Marks Obtained", "Status"]
    table_y = 240
    d.rectangle([(60, table_y), (w - 60, table_y + 35)], fill="#0f172a")
    col_x = [80, 340, 480, 640]
    for i, h_text in enumerate(headers):
        d.text((col_x[i], table_y + 18), h_text, fill="#ffffff", font=bold_f, anchor="lm")

    subjects = [
        ("Language (Tamil)", "100", "92", "PASS"),
        ("English", "100", "88", "PASS"),
        ("Mathematics", "100", "94", "PASS"),
        ("Science (Theory & Pract)", "100", "91", "PASS"),
        ("Social Science", "100", "95", "PASS"),
    ]

    cur_y = table_y + 35
    for sub, max_m, ob_m, st in subjects:
        d.rectangle([(60, cur_y), (w - 60, cur_y + 40)], fill="#f8fafc", outline="#cbd5e1")
        d.text((col_x[0], cur_y + 20), sub, fill="#0f172a", font=body_f, anchor="lm")
        d.text((col_x[1], cur_y + 20), max_m, fill="#475569", font=body_f, anchor="lm")
        d.text((col_x[2], cur_y + 20), ob_m, fill="#0f172a", font=bold_f, anchor="lm")
        d.text((col_x[3], cur_y + 20), st, fill="#059669", font=bold_f, anchor="lm")
        cur_y += 40

    # Total row
    d.rectangle([(60, cur_y), (w - 60, cur_y + 45)], fill="#e0f2fe", outline="#0284c7")
    d.text((col_x[0], cur_y + 22), "TOTAL / RESULT", fill="#0369a1", font=bold_f, anchor="lm")
    d.text((col_x[1], cur_y + 22), "500", fill="#0369a1", font=bold_f, anchor="lm")
    d.text((col_x[2], cur_y + 22), "460 (92%)", fill="#0369a1", font=bold_lg_f, anchor="lm")
    d.text((col_x[3], cur_y + 22), "FIRST CLASS WITH DISTINCTION", fill="#059669", font=bold_f, anchor="lm")

    draw_stamp(d, w - 240, cur_y + 90, "DGE CHENNAI")
    d.text((w - 185, cur_y + 215), "Secretary, Board of Examinations", fill="#0f172a", font=sm_f, anchor="mm")
    img.save(os.path.join(OUT_DIR, "05_class_10_marksheet.jpg"), quality=95)

# -------------------------------------------------------------
# 6. Class 12 Marksheet
# -------------------------------------------------------------
def make_marksheet12():
    w, h = 850, 1100
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)

    d.rectangle([(20, 20), (w - 20, 100)], fill="#701a75")
    d.text((w // 2, 45), "TAMIL NADU HIGHER SECONDARY EXAMINATION BOARD", fill="#ffffff", font=bold_f, anchor="mm")
    d.text((w // 2, 75), "HIGHER SECONDARY COURSE CERTIFICATE (HSC / CLASS XII)", fill="#f5d0fe", font=sm_f, anchor="mm")

    d.text((70, 130), "Registration No: 1284921", fill="#b91c1c", font=bold_f)
    d.text((70, 160), "Candidate Name: Vijay Kumar K", fill="#0f172a", font=bold_lg_f)
    d.text((70, 195), "Group: General Science (Maths, Physics, Chemistry, Biology)", fill="#475569", font=body_f)

    headers = ["Subject", "Max Marks", "Marks Obtained", "Status"]
    table_y = 240
    d.rectangle([(60, table_y), (w - 60, table_y + 35)], fill="#4a044e")
    col_x = [80, 340, 480, 640]
    for i, h_text in enumerate(headers):
        d.text((col_x[i], table_y + 18), h_text, fill="#ffffff", font=bold_f, anchor="lm")

    subjects = [
        ("Language (Tamil)", "100", "90", "PASS"),
        ("English", "100", "86", "PASS"),
        ("Mathematics", "100", "95", "PASS"),
        ("Physics", "100", "89", "PASS"),
        ("Chemistry", "100", "91", "PASS"),
        ("Biology", "100", "91", "PASS"),
    ]

    cur_y = table_y + 35
    for sub, max_m, ob_m, st in subjects:
        d.rectangle([(60, cur_y), (w - 60, cur_y + 38)], fill="#faf5ff", outline="#e9d5ff")
        d.text((col_x[0], cur_y + 19), sub, fill="#0f172a", font=body_f, anchor="lm")
        d.text((col_x[1], cur_y + 19), max_m, fill="#475569", font=body_f, anchor="lm")
        d.text((col_x[2], cur_y + 19), ob_m, fill="#0f172a", font=bold_f, anchor="lm")
        d.text((col_x[3], cur_y + 19), st, fill="#059669", font=bold_f, anchor="lm")
        cur_y += 38

    d.rectangle([(60, cur_y), (w - 60, cur_y + 45)], fill="#fdf4ff", outline="#c026d3")
    d.text((col_x[0], cur_y + 22), "TOTAL / RESULT", fill="#86198f", font=bold_f, anchor="lm")
    d.text((col_x[1], cur_y + 22), "600", fill="#86198f", font=bold_f, anchor="lm")
    d.text((col_x[2], cur_y + 22), "542 (90.3%)", fill="#86198f", font=bold_lg_f, anchor="lm")
    d.text((col_x[3], cur_y + 22), "PASSED WITH DISTINCTION", fill="#059669", font=bold_f, anchor="lm")

    draw_stamp(d, w - 240, cur_y + 80, "TN HSE BOARD")
    img.save(os.path.join(OUT_DIR, "06_class_12_marksheet.jpg"), quality=95)

# -------------------------------------------------------------
# 7. Transfer Certificate (TC)
# -------------------------------------------------------------
def make_tc():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    draw_header(d, w, "GOVT HIGHER SECONDARY SCHOOL", "COIMBATORE SOUTH, TAMIL NADU", "SCHOOL EDUCATION DEPARTMENT")

    d.text((w // 2, 120), "TRANSFER CERTIFICATE (TC)", fill="#1e3a8a", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "TC No: 4920 / 2024", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Name of the Pupil", "Vijay Kumar K"),
        ("Father / Guardian Name", "K. Murugan"),
        ("Nationality & Religion", "Indian - Hindu"),
        ("Community", "BC (Backward Class)"),
        ("Date of Birth", "15/08/2004"),
        ("Class Left", "Class XII (General Science)"),
        ("Medium of Instruction", "Tamil & English"),
        ("Conduct and Character", "Exemplary / Very Good"),
        ("Date of Relief", "31/05/2024"),
    ]

    y = 200
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 42)], fill="#f8fafc", outline="#e2e8f0")
        d.text((80, y + 21), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 21), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 52

    draw_stamp(d, w - 240, y + 60, "HEADMASTER")
    d.text((w - 185, y + 185), "Headmaster / பள்ளி தலைமை ஆசிரியர்", fill="#0f172a", font=sm_f, anchor="mm")
    img.save(os.path.join(OUT_DIR, "07_transfer_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 8. Bonafide Certificate
# -------------------------------------------------------------
def make_bonafide():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    draw_header(d, w, "GOVERNMENT ARTS & SCIENCE COLLEGE", "AFFILIATED TO BHARATHIAR UNIVERSITY", "HIGHER EDUCATION DEPARTMENT")

    d.text((w // 2, 120), "BONAFIDE STUDENT CERTIFICATE", fill="#1e3a8a", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "Ref: GASC/BONA/2025/1102", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Student Name", "Selvan Vijay Kumar"),
        ("Roll / Register No", "24BCS108"),
        ("Course & Department", "B.Sc. Computer Science"),
        ("Current Year of Study", "2nd Year (2025 - 2026)"),
        ("Father's Name", "K. Murugan"),
        ("Institution Name", "Government Arts & Science College, Coimbatore"),
    ]

    y = 220
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 45)], fill="#f8fafc", outline="#e2e8f0")
        d.text((80, y + 22), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 22), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 56

    d.text((60, y + 30), "This certificate is issued for applying to Government Scholarships & Welfare Schemes.", fill="#475569", font=body_f)
    draw_stamp(d, w - 240, y + 80, "PRINCIPAL")
    d.text((w - 185, y + 205), "Principal / கல்லூரி முதல்வர்", fill="#0f172a", font=sm_f, anchor="mm")
    img.save(os.path.join(OUT_DIR, "08_bonafide_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 9. School EMIS Certificate
# -------------------------------------------------------------
def make_emis():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    draw_header(d, w, "TAMIL NADU SCHOOL EDUCATION", "EMIS - Education Management Information System", "GOVERNMENT OF TAMIL NADU")

    d.text((w // 2, 120), "STUDENT EMIS ID VERIFICATION CERTIFICATE", fill="#1e3a8a", font=bold_lg_f, anchor="mm")

    lines = [
        ("EMIS ID Number", "330208012345"),
        ("Student Name", "Vijay Kumar K"),
        ("Date of Birth", "15/08/2004"),
        ("Gender", "Male"),
        ("School UDISE Code", "33020801402"),
        ("School Name", "Government Higher Secondary School"),
        ("Education District", "Coimbatore"),
        ("Classes Studied (Govt School)", "Class 6 to Class 12 (Govt School)"),
    ]

    y = 200
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 42)], fill="#eff6ff", outline="#bfdbfe")
        d.text((80, y + 21), label, fill="#1e40af", font=bold_f, anchor="lm")
        d.text((360, y + 21), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 52

    draw_stamp(d, w - 240, y + 80, "EMIS TN")
    d.text((w - 185, y + 205), "Nodal Officer (EMIS)\nDepartment of School Education", fill="#0f172a", font=sm_f, anchor="mm")
    draw_barcode(d, 60, y + 90, 200, 60)
    img.save(os.path.join(OUT_DIR, "09_school_emis_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 10. First Graduate Certificate
# -------------------------------------------------------------
def make_first_graduate():
    w, h = 800, 1050
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (w - 20, h - 20)], outline="#0f172a", width=3)
    draw_header(d, w, "GOVERNMENT OF TAMIL NADU", "REVENUE DEPARTMENT / வருவாய்த் துறை", "GOVERNMENT OF TAMIL NADU")

    d.text((w // 2, 120), "FIRST GRADUATE CERTIFICATE / முதல் பட்டதாரி சான்று", fill="#1e3a8a", font=bold_lg_f, anchor="mm")
    d.text((w // 2, 150), "Certificate No: TN-FG-2026-55912", fill="#b91c1c", font=bold_f, anchor="mm")

    lines = [
        ("Applicant Name", "Selvan Vijay Kumar"),
        ("Father's Name", "K. Murugan"),
        ("Mother's Name", "M. Lakshmi"),
        ("Eligibility Status", "Eligible - First Graduate in Family"),
        ("Taluk", "Coimbatore South"),
        ("Date of Issue", "12/06/2024"),
    ]

    y = 220
    for label, val in lines:
        d.rectangle([(60, y), (w - 60, y + 45)], fill="#f8fafc", outline="#e2e8f0")
        d.text((80, y + 22), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 22), val, fill="#0f172a", font=bold_f, anchor="lm")
        y += 56

    draw_stamp(d, w - 240, y + 80, "TAHSILDAR")
    d.text((w - 185, y + 205), "Tahsildar / மண்டல வட்டாட்சியர்", fill="#0f172a", font=sm_f, anchor="mm")
    img.save(os.path.join(OUT_DIR, "10_first_graduate_certificate.jpg"), quality=95)

# -------------------------------------------------------------
# 11. Bank Passbook
# -------------------------------------------------------------
def make_passbook():
    w, h = 950, 620
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)

    # Header
    d.rectangle([(0, 0), (w, 85)], fill="#0284c7")
    d.text((50, 30), "STATE BANK OF INDIA", fill="#ffffff", font=bold_lg_f)
    d.text((50, 60), "SAVINGS BANK ACCOUNT PASSBOOK", fill="#e0f2fe", font=sm_f)

    # Details
    lines = [
        ("Account Holder Name", "VIJAY KUMAR K"),
        ("Account Number", "39820194812"),
        ("Customer ID / CIF", "881294819"),
        ("IFSC Code", "SBIN0001234"),
        ("Branch", "Gandhipuram Branch, Coimbatore"),
        ("MICR Code", "641002008"),
        ("Date of Opening", "10/01/2022"),
    ]

    y = 120
    for label, val in lines:
        d.rectangle([(40, y), (w - 40, y + 42)], fill="#f8fafc", outline="#e2e8f0")
        d.text((60, y + 21), label, fill="#64748b", font=bold_f, anchor="lm")
        d.text((360, y + 21), val, fill="#0f172a", font=bold_lg_f if "Account Number" in label else bold_f, anchor="lm")
        y += 52

    draw_stamp(d, w - 220, y + 20, "SBI BRANCH")
    d.text((w - 165, y + 145), "Authorized Officer\nState Bank of India", fill="#0f172a", font=sm_f, anchor="mm")
    img.save(os.path.join(OUT_DIR, "11_bank_passbook.jpg"), quality=95)

if __name__ == "__main__":
    print("Generating all 11 dummy documents...")
    make_aadhaar()
    make_community()
    make_income()
    make_nativity()
    make_marksheet10()
    make_marksheet12()
    make_tc()
    make_bonafide()
    make_emis()
    make_first_graduate()
    make_passbook()
    print("All 11 dummy documents created successfully in:", OUT_DIR)
