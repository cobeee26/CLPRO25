from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime

class ClassExport(BaseModel):
    """
    Export schema for Class data without relationships.
    
    This schema is specifically designed for CSV export and API responses
    that don't need the full Class model with its relationships.
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

class SubmissionResponse(BaseModel):
    """Response schema for Submission data"""
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