from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Text, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import Enum as SQLEnum
import enum
from typing import Optional
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
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True) # Added for schedule-specific enrollment
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    class_ = relationship("Class", back_populates="enrollments")
    schedule = relationship("Schedule", back_populates="enrollments")
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

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    grade = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    time_spent_minutes = Column(Float, nullable=False, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    violation_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    time_away_seconds = Column(Integer, nullable=False)
    severity = Column(String, nullable=False)
    content_added_during_absence = Column(Integer, nullable=True)
    ai_similarity_score = Column(Float, nullable=True)
    paste_content_length = Column(Integer, nullable=True)

    # Relationships
    student = relationship("User")
    assignment = relationship("Assignment")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    room_number = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Occupied")  # 'Occupied', 'Clean', 'Needs Cleaning'
    join_code = Column(String, unique=True, index=True, nullable=True) # Added for enrollment

    # Relationships
    class_ = relationship("Class", back_populates="schedules")
    enrollments = relationship("Enrollment", back_populates="schedule", cascade="all, delete-orphan")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    date_posted = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_urgent = Column(Boolean, default=False, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True) # Check: nullable=True allows global announcements

    # Relationships
    class_ = relationship("Class")

class ClassroomReport(Base):
    __tablename__ = "classroom_reports"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_clean_before = Column(Boolean, nullable=False)
    is_clean_after = Column(Boolean, nullable=False)
    report_text = Column(Text, nullable=False)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    class_ = relationship("Class", back_populates="classroom_reports")
    reporter = relationship("User")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True) # Added for session validation
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, nullable=False)  # 'Present', 'Absent', 'Late', 'Excused'

    # Relationships
    class_ = relationship("Class")
    schedule = relationship("Schedule")
    student = relationship("User")

# Pydantic schemas have been moved to schemas.py