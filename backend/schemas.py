from pydantic import BaseModel, validator
from typing import Optional, List, Dict
from datetime import datetime
import enum

class ClassExport(BaseModel):
    """
    Export schema for Class data without relationships.
    """
    id: int
    name: str
    code: str
    teacher_id: Optional[int] = None

    model_config = {"from_attributes": True}

# Submission schemas
class SubmissionBase(BaseModel):
    assignment_id: int
    student_id: int
    time_spent_minutes: int
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    link_url: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    @validator('assignment_id')
    def validate_assignment_id(cls, v):
        if v <= 0:
            raise ValueError('Assignment ID must be a positive integer')
        return v
    
    @validator('student_id')
    def validate_student_id(cls, v):
        if v <= 0:
            raise ValueError('Student ID must be a positive integer')
        return v
    
    @validator('time_spent_minutes')
    def validate_time_spent(cls, v):
        if v < 0:
            raise ValueError('Time spent cannot be negative')
        return v

class Submission(SubmissionBase):
    id: int
    grade: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}

# User Schemas
class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class UserBase(BaseModel):
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRoleEnum] = None

class UserCreate(UserBase):
    password: str
    role: UserRoleEnum
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserResponse(UserBase):
    id: int
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    username: str

class TeacherCreate(UserCreate):
    pass

class StudentCreate(UserCreate):
    pass

class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    link_url: Optional[str] = None
    grade: Optional[float] = None
    feedback: Optional[str] = None
    time_spent_minutes: int
    submitted_at: datetime
    is_graded: bool = False

    model_config = {"from_attributes": True}

# NEW: Assignment response with class name
class AssignmentWithClassName(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class_id: int
    class_name: str
    class_code: Optional[str] = None
    teacher_name: Optional[str] = None
    creator_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# NEW: Violation schemas for violations endpoints
class ViolationBase(BaseModel):
    student_id: int
    assignment_id: int
    violation_type: str
    description: str
    time_away_seconds: int
    severity: str
    content_added_during_absence: Optional[int] = None
    ai_similarity_score: Optional[float] = None
    paste_content_length: Optional[int] = None

class ViolationCreate(ViolationBase):
    @validator('student_id')
    def validate_student_id(cls, v):
        if v <= 0:
            raise ValueError('Student ID must be a positive integer')
        return v
    
    @validator('assignment_id')
    def validate_assignment_id(cls, v):
        if v <= 0:
            raise ValueError('Assignment ID must be a positive integer')
        return v
    
    @validator('violation_type')
    def validate_violation_type(cls, v):
        valid_types = ['tab_switch', 'ai_detected', 'plagiarism', 'copy_paste', 'time_exceeded']
        if v not in valid_types:
            raise ValueError(f'Violation type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('severity')
    def validate_severity(cls, v):
        valid_severities = ['low', 'medium', 'high']
        if v not in valid_severities:
            raise ValueError(f'Severity must be one of: {", ".join(valid_severities)}')
        return v
    
    @validator('time_away_seconds')
    def validate_time_away_seconds(cls, v):
        if v < 0:
            raise ValueError('Time away cannot be negative')
        return v

class ViolationResponse(ViolationBase):
    id: int
    detected_at: datetime

    model_config = {"from_attributes": True}

# NEW: Chat Request
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

# NEW: Grade update schema
class GradeUpdate(BaseModel):
    grade: float
    feedback: Optional[str] = None
    
    @validator('grade')
    def validate_grade(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Grade must be between 0 and 100')
        return v

# NEW: Submission with content model for file upload
class SubmissionWithContent(BaseModel):
    assignment_id: int
    content: Optional[str] = None
    link_url: Optional[str] = None
    time_spent_minutes: float
    file_name: Optional[str] = None

# NEW: Submission detail response with student info
class SubmissionDetailResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: str
    student_email: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    submitted_at: str
    grade: Optional[float] = None
    feedback: Optional[str] = None
    is_graded: bool
    time_spent_minutes: float
    link_url: Optional[str] = None
    
    model_config = {"from_attributes": True}

# NEW: Class with teacher info
class ClassWithTeacherInfo(BaseModel):
    id: int
    name: str
    code: str
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    
    model_config = {"from_attributes": True}

# NEW: Student assignment detail
class StudentAssignmentDetail(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class_id: int
    class_name: str
    class_code: str
    teacher_name: str
    creator_id: int
    created_at: datetime
    due_date: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

# NEW: Student submission detail
class StudentSubmissionDetail(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    grade: Optional[float] = None
    feedback: Optional[str] = None
    time_spent_minutes: float
    submitted_at: datetime
    is_graded: bool
    link_url: Optional[str] = None
    
    model_config = {"from_attributes": True}

# NEW: Teacher assignment submissions
class TeacherAssignmentSubmission(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: str
    student_email: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    grade: Optional[float] = None
    feedback: Optional[str] = None
    time_spent_minutes: float
    submitted_at: str
    is_graded: bool
    link_url: Optional[str] = None
    
    model_config = {"from_attributes": True}

# NEW: QR Scan Schema
class AttendanceScan(BaseModel):
    qr_content: str
    class_id: int
    schedule_id: Optional[int] = None
    teacher_id: Optional[int] = None


# MIGRATED FROM MODELS.PY
# Class Schemas
class ClassBase(BaseModel):
    name: str
    code: str
    teacher_id: Optional[int] = None

class ClassCreate(ClassBase):
    @validator('name')
    def validate_name(cls, v):
        if len(v) < 1:
            raise ValueError('Class name cannot be empty')
        return v
    
    @validator('code')
    def validate_code(cls, v):
        if len(v) < 3:
            raise ValueError('Class code must be at least 3 characters long')
        return v.upper()

class ClassResponse(ClassBase):
    id: int
    teacher_id: Optional[int] = None
    model_config = {"from_attributes": True}

# Assignment Schemas (Basic)
class AssignmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    class_id: int

class AssignmentCreate(AssignmentBase):
    @validator('name')
    def validate_name(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('Assignment name is required and must be a string')
        v = v.strip()
        if len(v) < 1:
             raise ValueError('Assignment name cannot be empty')
        if len(v) > 255:
             raise ValueError('Assignment name cannot exceed 255 characters')
        return v
    
    @validator('class_id')
    def validate_class_id(cls, v):
        if v is None:
             raise ValueError('Class ID is required')
        if not isinstance(v, int):
             try:
                 v = int(v)
             except (ValueError, TypeError):
                 raise ValueError('Class ID must be a valid integer')
        if v <= 0:
             raise ValueError('Class ID must be a positive integer')
        return v

    @validator('description')
    def validate_description(cls, v):
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError('Description must be a string')
        v = v.strip()
        if len(v) == 0:
            return None
        if len(v) > 1000:
            raise ValueError('Description cannot exceed 1000 characters')
        return v

class AssignmentResponse(AssignmentBase):
    id: int
    creator_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Schedule Schemas
class ScheduleBase(BaseModel):
    class_id: int
    start_time: datetime
    end_time: datetime
    room_number: str
    status: str = "Occupied"

class ScheduleCreate(ScheduleBase):
    @validator('class_id')
    def validate_class_id(cls, v):
        if not isinstance(v, int):
            raise ValueError('Class ID must be an integer')
        if v <= 0:
            raise ValueError('Class ID must be a positive integer')
        return v
    
    @validator('room_number')
    def validate_room_number(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Room number cannot be empty')
        return v.strip()
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['Occupied', 'Clean', 'Needs Cleaning']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v

class ScheduleResponse(ScheduleBase):
    id: int
    join_code: Optional[str] = None
    model_config = {"from_attributes": True}

class ScheduleEnrichedResponse(ScheduleBase):
    id: int
    class_name: str
    class_code: str
    teacher_name: str
    teacher_full_name: str
    join_code: Optional[str] = None
    model_config = {"from_attributes": True}

# Announcement Schemas
class AnnouncementBase(BaseModel):
    title: str
    content: str
    is_urgent: bool = False
    class_id: Optional[int] = None

class AnnouncementCreate(AnnouncementBase):
    @validator('title')
    def validate_title(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Title cannot be empty')
        return v.strip()
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Content cannot be empty')
        return v.strip()

class AnnouncementResponse(AnnouncementBase):
    id: int
    date_posted: datetime
    model_config = {"from_attributes": True}

# ClassroomReport Schemas
class ClassroomReportBase(BaseModel):
    class_id: int
    is_clean_before: bool
    is_clean_after: bool
    report_text: str
    photo_url: Optional[str] = None

class ClassroomReportCreate(ClassroomReportBase):
    @validator('class_id')
    def validate_class_id(cls, v):
        if v <= 0:
            raise ValueError('Class ID must be a positive integer')
        return v
    
    @validator('report_text')
    def validate_report_text(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Report text cannot be empty')
        return v.strip()



class ClassroomReportResponse(ClassroomReportBase):
    id: int
    reporter_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# MIGRATED Violation Schemas
class ViolationBase(BaseModel):
    student_id: int
    assignment_id: int
    violation_type: str
    description: str
    time_away_seconds: int
    severity: str
    content_added_during_absence: Optional[int] = None
    ai_similarity_score: Optional[float] = None
    paste_content_length: Optional[int] = None

class ViolationCreate(ViolationBase):
    @validator('student_id')
    def validate_student_id(cls, v):
        if v <= 0:
            raise ValueError('Student ID must be a positive integer')
        return v
    
    @validator('assignment_id')
    def validate_assignment_id(cls, v):
        if v <= 0:
            raise ValueError('Assignment ID must be a positive integer')
        return v
    
    @validator('violation_type')
    def validate_violation_type(cls, v):
        valid_types = ['tab_switch', 'ai_detected', 'plagiarism', 'copy_paste', 'time_exceeded']
        if v not in valid_types:
            raise ValueError(f'Violation type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('severity')
    def validate_severity(cls, v):
        valid_severities = ['low', 'medium', 'high']
        if v not in valid_severities:
            raise ValueError(f'Severity must be one of: {", ".join(valid_severities)}')
        return v
    
    @validator('time_away_seconds')
    def validate_time_away_seconds(cls, v):
        if v < 0:
            raise ValueError('Time away cannot be negative')
        return v

class ViolationResponse(ViolationBase):
    id: int
    detected_at: datetime
    
    model_config = {"from_attributes": True}

# Attendance Schemas
class AttendanceBase(BaseModel):
    class_id: int
    student_id: int
    status: str
    schedule_id: Optional[int] = None

class AttendanceCreate(AttendanceBase):
    @validator('status')
    def validate_status(cls, v):
        valid = ['Present', 'Absent', 'Late', 'Excused', 'Pending', 'Discarded']
        if v not in valid:
            raise ValueError(f"Status must be one of {valid}")
        return v

class AttendanceResponse(AttendanceBase):
    id: int
    date: datetime
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    
    model_config = {"from_attributes": True}

class ScanResponse(BaseModel):
    status: str  # "success", "not_enrolled", "error", "duplicate"
    message: str
    student_name: Optional[str] = None
    student_id: Optional[int] = None
    class_name: Optional[str] = None
    attendance_id: Optional[int] = None # ID of the pending record
    enrollment_status: bool
    scan_timestamp: datetime = datetime.utcnow()


# Enrollment Schemas
class JoinClassRequest(BaseModel):
    join_code: str

    @validator('join_code')
    def validate_join_code(cls, v):
        if len(v) != 6:
            raise ValueError('Join code must be exactly 6 characters')
        return v.upper()

class EnrollmentResponse(BaseModel):
    id: int
    class_id: int
    student_id: int
    schedule_id: Optional[int] = None
    
    
    model_config = {"from_attributes": True}

# NEW: Class People Response
class ClassPeopleResponse(BaseModel):
    teacher: Optional[UserResponse] = None
    students: List[UserResponse] = []
    class_name: str
    class_section: Optional[str] = None # Using code or name as proxy if needed
    student_count: int

    model_config = {"from_attributes": True}
