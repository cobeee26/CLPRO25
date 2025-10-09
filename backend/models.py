from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Text, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import Enum as SQLEnum
import enum
from typing import Optional
from pydantic import BaseModel, validator
from datetime import datetime
from database import Base

class UserRole(enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)

    # Relationships with cascading deletion
    classes_taught = relationship("Class", back_populates="teacher", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    assignments_created = relationship("Assignment", back_populates="creator", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships with cascading deletion
    teacher = relationship("User", back_populates="classes_taught")
    enrollments = relationship("Enrollment", back_populates="class_", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="class_", cascade="all, delete-orphan")
    classroom_reports = relationship("ClassroomReport", back_populates="class_", cascade="all, delete-orphan")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    class_ = relationship("Class", back_populates="enrollments")
    student = relationship("User", back_populates="enrollments")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships with cascading deletion
    class_ = relationship("Class", back_populates="assignments")
    creator = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")

# Pydantic schemas for Class
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
        return v.upper()  # Convert to uppercase

class ClassResponse(ClassBase):
    id: int
    teacher_id: Optional[int] = None

    model_config = {"from_attributes": True}

# Pydantic schemas for Assignment
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

# Pydantic schemas for Schedule
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

    model_config = {"from_attributes": True}

class ScheduleEnrichedResponse(ScheduleBase):
    id: int
    class_name: str
    class_code: str
    teacher_name: str
    teacher_full_name: str

    model_config = {"from_attributes": True}

# Pydantic schemas for Announcement
class AnnouncementBase(BaseModel):
    title: str
    content: str
    is_urgent: bool = False

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

# Pydantic schemas for ClassroomReport
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

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    grade = Column(Float, nullable=True)  # For teacher to fill
    time_spent_minutes = Column(Integer, nullable=False)  # Core AI data input for engagement
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    room_number = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Occupied")  # 'Occupied', 'Clean', 'Needs Cleaning'

    # Relationships
    class_ = relationship("Class", back_populates="schedules")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    date_posted = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_urgent = Column(Boolean, default=False, nullable=False)

class ClassroomReport(Base):
    __tablename__ = "classroom_reports"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_clean_before = Column(Boolean, nullable=False)
    is_clean_after = Column(Boolean, nullable=False)
    report_text = Column(Text, nullable=False)
    photo_url = Column(String, nullable=True)  # URL to uploaded photo evidence
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    class_ = relationship("Class", back_populates="classroom_reports")
    reporter = relationship("User")