from pydantic import BaseModel, validator
from typing import Optional
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
    submitted_at: datetime

    model_config = {"from_attributes": True}

class SubmissionResponse(BaseModel):
    """Response schema for Submission data"""
    id: int
    assignment_id: int
    student_id: int
    grade: Optional[float] = None
    time_spent_minutes: int
    submitted_at: datetime

    model_config = {"from_attributes": True}