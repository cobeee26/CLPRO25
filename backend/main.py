from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import enum
from datetime import datetime, timedelta
import os
import uuid
import aiofiles

from database import engine, SessionLocal, get_db
from models import Base, User, Class, UserRole, ClassCreate, ClassResponse, Assignment, AssignmentCreate, AssignmentResponse, Schedule, ScheduleCreate, ScheduleResponse, Announcement, AnnouncementCreate, AnnouncementResponse, Submission, ClassroomReport, ClassroomReportCreate, ClassroomReportResponse, Enrollment
from schemas import ClassExport, SubmissionCreate, Submission as SubmissionSchema, SubmissionResponse
from security import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, verify_password, get_password_hash, create_access_token, verify_token
import crud  # IMPORTANT: DITO NILAGAY ANG ACTUAL VIOLATION CRUD FUNCTIONS

# Security scheme
security = HTTPBearer()

# File upload configuration
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Pydantic models for request/response
class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class UserCreate(BaseModel):
    username: str
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

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None and len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if v is not None and len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @validator('first_name')
    def validate_first_name(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('First name cannot be empty')
        return v.strip() if v else v
    
    @validator('last_name')
    def validate_last_name(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('Last name cannot be empty')
        return v.strip() if v else v

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('current_password')
    def validate_current_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Current password is required')
        return v.strip()
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('New password is required')
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v.strip()

# VIOLATIONS MODELS
class ViolationCreate(BaseModel):
    student_id: int
    assignment_id: int
    violation_type: str
    description: str
    time_away_seconds: int
    severity: str
    content_added_during_absence: Optional[int] = None
    ai_similarity_score: Optional[float] = None
    paste_content_length: Optional[int] = None

class ViolationResponse(BaseModel):
    id: int
    student_id: int
    assignment_id: int
    violation_type: str
    description: str
    detected_at: str
    time_away_seconds: int
    severity: str
    content_added_during_absence: Optional[int] = None
    ai_similarity_score: Optional[float] = None
    paste_content_length: Optional[int] = None
    
    class Config:
        from_attributes = True

# ENRICHED VIOLATION RESPONSE
class ViolationWithStudentResponse(ViolationResponse):
    student_name: str
    student_email: str
    assignment_name: str
    class_name: str

# VIOLATION SUMMARY MODEL
class ViolationSummary(BaseModel):
    assignment_id: int
    assignment_name: str
    class_name: str
    total_violations: int
    violations_by_type: Dict[str, int]
    violations_by_severity: Dict[str, int]
    average_time_away_seconds: float
    students_with_violations: int
    total_students: int

# SUBMISSION WITH CONTENT MODEL
class SubmissionWithContent(BaseModel):
    assignment_id: int
    content: Optional[str] = None
    link_url: Optional[str] = None
    time_spent_minutes: float
    file_name: Optional[str] = None

# SUBMISSION RESPONSE WITH DETAILS
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
    violations_count: Optional[int] = None
    violations: Optional[List[ViolationResponse]] = None
    
    class Config:
        from_attributes = True

# GRADE UPDATE MODEL
class GradeUpdate(BaseModel):
    grade: float
    feedback: Optional[str] = None
    
    @validator('grade')
    def validate_grade(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Grade must be between 0 and 100')
        return v

# Database lifespan function
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Run migrations to add missing columns
    from database import check_and_run_migrations
    check_and_run_migrations()
    
    # Create test users after tables are created
    db = SessionLocal()
    try:
        # Check if test admin user already exists
        admin_user = get_user_by_username(db, "admin@classtrack.edu")
        if not admin_user:
            # Create test admin user with properly hashed password
            plain_password = "password123"
            admin_hashed_password = get_password_hash(plain_password)
            
            admin_user = User(
                username="admin@classtrack.edu",
                hashed_password=admin_hashed_password,
                role=UserRole.ADMIN
            )
            db.add(admin_user)
            print(f"✅ Test Admin user created: admin@classtrack.edu / {plain_password}")
        
        # Check if test student user already exists
        student_user = get_user_by_username(db, "student@classtrack.edu")
        if not student_user:
            # Create test student user with properly hashed password
            plain_password = "password123"
            student_hashed_password = get_password_hash(plain_password)
            
            student_user = User(
                username="student@classtrack.edu",
                hashed_password=student_hashed_password,
                role=UserRole.STUDENT
            )
            db.add(student_user)
            print(f"✅ Test Student user created: student@classtrack.edu / {plain_password}")
        
        # Check if test teacher user already exists
        teacher_user = get_user_by_username(db, "teacher@classtrack.edu")
        if not teacher_user:
            # Create test teacher user with properly hashed password
            plain_password = "password123"
            teacher_hashed_password = get_password_hash(plain_password)
            
            teacher_user = User(
                username="teacher@classtrack.edu",
                hashed_password=teacher_hashed_password,
                role=UserRole.TEACHER
            )
            db.add(teacher_user)
            print(f"✅ Test Teacher user created: teacher@classtrack.edu / {plain_password}")
        
        # Commit all changes
        db.commit()
        print("✅ All test users committed to database successfully")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        print(f"   Error type: {type(e).__name__}")
        db.rollback()
    finally:
        db.close()
    
    yield
    # Shutdown: Clean up if needed
    pass

# Initialize FastAPI app
app = FastAPI(
    title="ClassTrack API",
    description="A FastAPI backend for class management system",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,  # Allows credentials
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Helper functions

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate a user by checking username and password.
    
    Args:
        db: Database session
        username: Username to authenticate
        password: Plain text password to verify
        
    Returns:
        User object if authentication successful, None otherwise
    """
    # Get user by username
    user = get_user_by_username(db, username)
    if not user:
        return None
    
    # Verify password using the stored hash
    if not verify_password(password, user.hashed_password):
        return None
    
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    username = verify_token(credentials.credentials)
    if username is None:
        raise credentials_exception
    
    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

# ====================================
# API ENDPOINTS - VIOLATIONS SECTION
# ====================================

@app.post("/violations/", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def create_violation(
    violation: ViolationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new violation record
    
    - **student_id**: ID of the student who committed the violation
    - **assignment_id**: ID of the assignment
    - **violation_type**: Type of violation
    - **description**: Description of the violation
    - **time_away_seconds**: Time away in seconds
    - **severity**: Severity level ('low', 'medium', 'high')
    - **content_added_during_absence**: Optional content added during absence
    - **ai_similarity_score**: Optional AI similarity score
    - **paste_content_length**: Optional paste content length
    
    Requires authentication. Students can create violations for themselves.
    """
    try:
        print(f"📝 Creating violation for student {violation.student_id}, assignment {violation.assignment_id}")
        
        # Use the actual CRUD function
        new_violation = crud.create_violation(db, violation_in=violation)
        
        print(f"✅ Violation recorded: {new_violation}")
        
        # Convert to response
        return ViolationResponse(
            id=new_violation.id,
            student_id=new_violation.student_id,
            assignment_id=new_violation.assignment_id,
            violation_type=new_violation.violation_type,
            description=new_violation.description,
            detected_at=new_violation.detected_at.isoformat(),
            time_away_seconds=new_violation.time_away_seconds,
            severity=new_violation.severity,
            content_added_during_absence=new_violation.content_added_during_absence,
            ai_similarity_score=new_violation.ai_similarity_score,
            paste_content_length=new_violation.paste_content_length
        )
        
    except ValueError as e:
        print(f"❌ Validation error creating violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ Error creating violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create violation: {str(e)}"
        )

@app.get("/assignments/violations")
async def get_all_violations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all violations for assignments
    
    Returns:
        List of all violations
        
    Requires authentication. Teachers and Admins can view all violations.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view violations"
        )
    
    try:
        print(f"📊 Fetching all violations for user: {current_user.username}")
        
        # Use the actual CRUD function
        violations = crud.get_violations(db)
        
        # Convert to response format
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return violation_responses
        
    except Exception as e:
        print(f"❌ Error fetching violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violations: {str(e)}"
        )

@app.get("/assignments/{assignment_id}/violations")
async def get_assignment_violations(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations for a specific assignment
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        List of violations for the assignment
        
    Requires authentication. Teachers can view violations for their assignments.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view assignment violations"
        )
    
    try:
        print(f"📊 Fetching violations for assignment {assignment_id}")
        
        # Verify the assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view violations for this assignment"
            )
        
        # Use the actual CRUD function
        violations = crud.get_violations_by_assignment(db, assignment_id)
        
        # Convert to response format
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return violation_responses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching assignment violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assignment violations: {str(e)}"
        )

# ====================================
# NEW ENDPOINTS FOR FRONTEND COMPATIBILITY
# ====================================

@app.get("/submissions/{submission_id}/violations")
async def get_violations_for_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations for a specific submission
    
    Args:
        submission_id: ID of the submission
        
    Returns:
        List of violations for the submission
        
    Requires authentication.
    Teachers and Admins can view violations for any submission.
    Students can view violations for their own submissions.
    """
    try:
        print(f"📊 Fetching violations for submission {submission_id}")
        
        # Get the submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check permissions
        if current_user.role == UserRole.STUDENT:
            # Students can only view their own violations
            if submission.student_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view violations for this submission"
                )
        elif current_user.role == UserRole.TEACHER:
            # Teachers can view violations for submissions in their assignments
            assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if assignment.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view violations for this submission"
                )
        
        # Get violations for this student in this assignment
        violations = crud.get_violations_by_student_and_assignment(db, submission.student_id, submission.assignment_id)
        
        # Convert to response format
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return violation_responses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching submission violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submission violations: {str(e)}"
        )

@app.get("/assignments/{assignment_id}/violations/enriched")
async def get_enriched_violations_for_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get enriched violations for a specific assignment with student and assignment information
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        List of enriched violations with student and assignment details
        
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view enriched violations"
        )
    
    try:
        print(f"📊 Fetching enriched violations for assignment {assignment_id}")
        
        # Verify the assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view violations for this assignment"
            )
        
        # Use the actual CRUD function with enriched data
        violations = crud.get_assignment_violations_with_student_info(db, assignment_id)
        
        return violations
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching enriched violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch enriched violations: {str(e)}"
        )

@app.get("/assignments/{assignment_id}/violations/summary")
async def get_violations_summary(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations summary for a specific assignment
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        Summary of violations for the assignment
        
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view violations summary"
        )
    
    try:
        print(f"📊 Fetching violations summary for assignment {assignment_id}")
        
        # Verify the assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view violations summary for this assignment"
            )
        
        # Get violation summary using CRUD function
        summary = crud.get_violation_summary_for_assignment(db, assignment_id)
        
        # Convert to response model
        return ViolationSummary(
            assignment_id=assignment_id,
            assignment_name=summary['assignment_name'],
            class_name=summary['class_name'],
            total_violations=summary['total_violations'],
            violations_by_type=summary['violations_by_type'],
            violations_by_severity=summary['violations_by_severity'],
            average_time_away_seconds=summary['average_time_away_seconds'],
            students_with_violations=summary['students_with_violations'],
            total_students=summary['total_students']
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching violations summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violations summary: {str(e)}"
        )

@app.get("/assignments/{assignment_id}/submissions-with-violations")
async def get_submissions_with_violations(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get submissions with their violations for a specific assignment
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        List of submissions with their violations
        
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions with violations"
        )
    
    try:
        print(f"📊 Fetching submissions with violations for assignment {assignment_id}")
        
        # Verify the assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view submissions for this assignment"
            )
        
        # Get submissions for this assignment
        submissions = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
        
        # Get all violations for this assignment
        violations = crud.get_violations_by_assignment(db, assignment_id)
        violations_by_student = {}
        for violation in violations:
            if violation.student_id not in violations_by_student:
                violations_by_student[violation.student_id] = []
            violations_by_student[violation.student_id].append(violation)
        
        # Return submissions with violations
        result = []
        for submission in submissions:
            # Get student information
            student = db.query(User).filter(User.id == submission.student_id).first()
            student_name = student.username if student else "Unknown"
            
            # Get violations for this student
            student_violations = violations_by_student.get(submission.student_id, [])
            
            # Convert violations to response format
            violation_responses = []
            for violation in student_violations:
                violation_responses.append(ViolationResponse(
                    id=violation.id,
                    student_id=violation.student_id,
                    assignment_id=violation.assignment_id,
                    violation_type=violation.violation_type,
                    description=violation.description,
                    detected_at=violation.detected_at.isoformat(),
                    time_away_seconds=violation.time_away_seconds,
                    severity=violation.severity,
                    content_added_during_absence=violation.content_added_during_absence,
                    ai_similarity_score=violation.ai_similarity_score,
                    paste_content_length=violation.paste_content_length
                ))
            
            result.append({
                "submission_id": submission.id,
                "student_id": submission.student_id,
                "student_name": student_name,
                "grade": submission.grade,
                "time_spent_minutes": submission.time_spent_minutes,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                "is_graded": submission.grade is not None,
                "violation_count": len(student_violations),
                "violations": violation_responses
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching submissions with violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submissions with violations: {str(e)}"
        )

@app.get("/violations/")
async def get_all_violations_paginated(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all violations with pagination
    
    Args:
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List of violations
        
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view all violations"
        )
    
    try:
        print(f"📊 Fetching all violations (skip={skip}, limit={limit})")
        
        # Use the actual CRUD function
        violations = crud.get_violations(db, skip=skip, limit=limit)
        
        # Convert to response format
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return violation_responses
        
    except Exception as e:
        print(f"❌ Error fetching all violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch all violations: {str(e)}"
        )

@app.get("/violations/student/{student_id}")
async def get_violations_for_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations for a specific student
    
    Args:
        student_id: ID of the student
        
    Returns:
        List of violations for the student
        
    Requires authentication.
    Teachers and Admins can view violations for any student.
    Students can view their own violations only.
    """
    try:
        print(f"📊 Fetching violations for student {student_id}")
        
        # Check permissions
        if current_user.role == UserRole.STUDENT:
            # Students can only view their own violations
            if current_user.id != student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view violations for this student"
                )
        
        # Use the actual CRUD function
        violations = crud.get_violations_by_student(db, student_id)
        
        # Convert to response format
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return violation_responses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student violations: {str(e)}"
        )

@app.get("/violations/{violation_id}")
async def get_violation_by_id(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific violation by ID
    
    Args:
        violation_id: ID of the violation
        
    Returns:
        The violation
        
    Requires authentication.
    Teachers and Admins can view any violation.
    Students can view their own violations only.
    """
    try:
        print(f"📊 Fetching violation {violation_id}")
        
        # Use the actual CRUD function
        violation = crud.get_violation(db, violation_id)
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found"
            )
        
        # Check permissions
        if current_user.role == UserRole.STUDENT:
            # Students can only view their own violations
            if violation.student_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this violation"
                )
        elif current_user.role == UserRole.TEACHER:
            # Teachers can only view violations for assignments they created
            assignment = db.query(Assignment).filter(Assignment.id == violation.assignment_id).first()
            if assignment.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this violation"
                )
        
        # Convert to response
        return ViolationResponse(
            id=violation.id,
            student_id=violation.student_id,
            assignment_id=violation.assignment_id,
            violation_type=violation.violation_type,
            description=violation.description,
            detected_at=violation.detected_at.isoformat(),
            time_away_seconds=violation.time_away_seconds,
            severity=violation.severity,
            content_added_during_absence=violation.content_added_during_absence,
            ai_similarity_score=violation.ai_similarity_score,
            paste_content_length=violation.paste_content_length
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violation: {str(e)}"
        )

@app.delete("/violations/{violation_id}")
async def delete_violation(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a violation (Admin only)
    
    Args:
        violation_id: ID of the violation to delete
        
    Returns:
        Success message
        
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete violations"
        )
    
    try:
        print(f"🗑️ Deleting violation {violation_id}")
        
        # Use the actual CRUD function
        success = crud.delete_violation(db, violation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found"
            )
        
        return {"message": "Violation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete violation: {str(e)}"
        )

# ====================================
# API ENDPOINTS - SUBMISSIONS WITH FILE UPLOAD
# ====================================

@app.post("/submissions/upload/", status_code=status.HTTP_201_CREATED)
async def create_submission_with_file(
    assignment_id: int = Form(...),
    content: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    time_spent_minutes: float = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new submission with optional file upload (Student only)
    
    - **assignment_id**: ID of the assignment being submitted
    - **content**: Text content (optional)
    - **link_url**: Link URL (optional)
    - **time_spent_minutes**: Time spent on the assignment
    - **photo**: Optional file upload (PDF, DOC, DOCX, TXT, JPG, PNG, GIF, max 10MB)
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create submissions"
        )
    
    file_path = None
    file_name = None
    
    # Handle file upload if provided
    if photo:
        # Validate file type
        allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'}
        file_extension = os.path.splitext(photo.filename)[1].lower() if photo.filename else ''
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024
        if photo.size and photo.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        file_name = photo.filename
        
        try:
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content_bytes = await photo.read()
                await f.write(content_bytes)
            
            # Generate URL (relative path)
            file_path = f"/uploads/{filename}"
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
    
    try:
        print(f"📤 Creating submission for user {current_user.id}, assignment {assignment_id}")
        
        # Check if submission already exists
        existing_submission = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).first()
        
        if existing_submission:
            # Update existing submission
            if content is not None:
                existing_submission.content = content
            if link_url is not None:
                existing_submission.link_url = link_url
            if file_path is not None:
                existing_submission.file_path = file_path
                existing_submission.file_name = file_name
            existing_submission.time_spent_minutes = time_spent_minutes
            existing_submission.submitted_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_submission)
            
            print(f"✅ Updated existing submission {existing_submission.id}")
            
            return {
                "id": existing_submission.id,
                "assignment_id": existing_submission.assignment_id,
                "student_id": existing_submission.student_id,
                "content": existing_submission.content,
                "file_path": existing_submission.file_path,
                "file_name": existing_submission.file_name,
                "link_url": existing_submission.link_url,
                "grade": existing_submission.grade,
                "feedback": existing_submission.feedback,
                "time_spent_minutes": existing_submission.time_spent_minutes,
                "submitted_at": existing_submission.submitted_at,
                "is_graded": existing_submission.grade is not None
            }
        else:
            # Create new submission
            new_submission = Submission(
                assignment_id=assignment_id,
                student_id=current_user.id,
                content=content,
                link_url=link_url,
                file_path=file_path,
                file_name=file_name,
                time_spent_minutes=time_spent_minutes,
                submitted_at=datetime.utcnow()
            )
            
            db.add(new_submission)
            db.commit()
            db.refresh(new_submission)
            
            print(f"✅ Created new submission {new_submission.id}")
            
            return {
                "id": new_submission.id,
                "assignment_id": new_submission.assignment_id,
                "student_id": new_submission.student_id,
                "content": new_submission.content,
                "file_path": new_submission.file_path,
                "file_name": new_submission.file_name,
                "link_url": new_submission.link_url,
                "grade": new_submission.grade,
                "feedback": new_submission.feedback,
                "time_spent_minutes": new_submission.time_spent_minutes,
                "submitted_at": new_submission.submitted_at,
                "is_graded": new_submission.grade is not None
            }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating submission with file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        )

@app.put("/submissions/{submission_id}")
async def update_submission_with_file(
    submission_id: int,
    assignment_id: int = Form(...),
    content: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    time_spent_minutes: float = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a submission with optional file upload (Student only)
    
    - **submission_id**: ID of the submission to update
    - **assignment_id**: ID of the assignment
    - **content**: Text content (optional)
    - **link_url**: Link URL (optional)
    - **time_spent_minutes**: Time spent on the assignment
    - **photo**: Optional file upload (PDF, DOC, DOCX, TXT, JPG, PNG, GIF, max 10MB)
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update submissions"
        )
    
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check if student owns this submission
        if submission.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this submission"
            )
        
        # Handle file upload if provided
        if photo:
            # Validate file type
            allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'}
            file_extension = os.path.splitext(photo.filename)[1].lower() if photo.filename else ''
            
            if file_extension not in allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
                )
            
            # Validate file size (max 10MB)
            MAX_FILE_SIZE = 10 * 1024 * 1024
            if photo.size and photo.size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
                )
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            filename = f"{file_id}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            file_name = photo.filename
            
            try:
                # Save file
                async with aiofiles.open(file_path, 'wb') as f:
                    content_bytes = await photo.read()
                    await f.write(content_bytes)
                
                # Update file path
                submission.file_path = f"/uploads/{filename}"
                submission.file_name = file_name
                
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save file: {str(e)}"
                )
        
        # Update other fields
        if content is not None:
            submission.content = content
        if link_url is not None:
            submission.link_url = link_url
        submission.time_spent_minutes = time_spent_minutes
        submission.submitted_at = datetime.utcnow()
        
        db.commit()
        db.refresh(submission)
        
        print(f"✅ Updated submission {submission.id}")
        
        return {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "content": submission.content,
            "file_path": submission.file_path,
            "file_name": submission.file_name,
            "link_url": submission.link_url,
            "grade": submission.grade,
            "feedback": submission.feedback,
            "time_spent_minutes": submission.time_spent_minutes,
            "submitted_at": submission.submitted_at,
            "is_graded": submission.grade is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update submission: {str(e)}"
        )

@app.get("/submissions/{submission_id}/download")
async def download_submission_file(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download submission file
    
    Args:
        submission_id: ID of the submission
        
    Returns:
        File download
        
    Requires authentication.
    """
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check permissions
        if current_user.role == UserRole.STUDENT:
            # Students can only download their own files
            if submission.student_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to download this file"
                )
        elif current_user.role == UserRole.TEACHER:
            # Teachers can download files for assignments they created
            assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if assignment.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to download this file"
                )
        
        if not submission.file_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No file attached to this submission"
            )
        
        # Get full file path
        file_path = submission.file_path
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
        
        if not os.path.exists(full_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on server"
            )
        
        # Return file
        from fastapi.responses import FileResponse
        return FileResponse(
            path=full_path,
            filename=submission.file_name or "submission_file",
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )

# ====================================
# API ENDPOINTS - TEACHER ASSIGNMENT SUBMISSIONS
# ====================================

@app.get("/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submissions for a specific assignment (Teacher and Admin only)
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        List of submissions with student information
        
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view assignment submissions"
        )
    
    try:
        # Get assignment to verify it exists and user has access
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view submissions for this assignment"
            )
        
        # Get submissions with student information
        submissions = db.query(Submission).join(User, Submission.student_id == User.id).filter(
            Submission.assignment_id == assignment_id
        ).all()
        
        # Get violations for this assignment
        violations = crud.get_violations_by_assignment(db, assignment_id)
        violations_by_student = {}
        for violation in violations:
            if violation.student_id not in violations_by_student:
                violations_by_student[violation.student_id] = []
            violations_by_student[violation.student_id].append(violation)
        
        # Format response with student names and violations
        result = []
        for submission in submissions:
            student = submission.student
            
            # Get student name
            student_name = student.username
            if student.first_name and student.last_name:
                student_name = f"{student.first_name} {student.last_name}"
            elif student.first_name:
                student_name = student.first_name
            elif student.last_name:
                student_name = student.last_name
            
            # Get violations for this student
            student_violations = violations_by_student.get(submission.student_id, [])
            violation_responses = []
            for violation in student_violations:
                violation_responses.append(ViolationResponse(
                    id=violation.id,
                    student_id=violation.student_id,
                    assignment_id=violation.assignment_id,
                    violation_type=violation.violation_type,
                    description=violation.description,
                    detected_at=violation.detected_at.isoformat(),
                    time_away_seconds=violation.time_away_seconds,
                    severity=violation.severity,
                    content_added_during_absence=violation.content_added_during_absence,
                    ai_similarity_score=violation.ai_similarity_score,
                    paste_content_length=violation.paste_content_length
                ))
            
            result.append({
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "student_id": submission.student_id,
                "student_name": student_name,
                "student_email": student.username,
                "content": submission.content,
                "file_path": submission.file_path,
                "file_name": submission.file_name,
                "grade": submission.grade,
                "feedback": submission.feedback,
                "time_spent_minutes": submission.time_spent_minutes,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                "is_graded": submission.grade is not None,
                "link_url": submission.link_url,
                "violations_count": len(student_violations),
                "violations": violation_responses
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting assignment submissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assignment submissions: {str(e)}"
        )

@app.patch("/submissions/{submission_id}/grade")
async def update_submission_grade(
    submission_id: int,
    grade_data: GradeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the grade for a submission (Teacher and Admin only)
    
    - **submission_id**: ID of the submission to grade
    - **grade**: Grade value (float between 0 and 100)
    - **feedback**: Optional feedback text
    
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to grade submissions"
        )
    
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Verify teacher has access to this assignment
        if current_user.role == UserRole.TEACHER:
            assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if assignment.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to grade this submission"
                )
        
        # Update grade and feedback
        submission.grade = grade_data.grade
        submission.feedback = grade_data.feedback
        
        db.commit()
        db.refresh(submission)
        
        return {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "grade": submission.grade,
            "feedback": submission.feedback,
            "time_spent_minutes": submission.time_spent_minutes,
            "submitted_at": submission.submitted_at,
            "is_graded": submission.grade is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update submission grade: {str(e)}"
        )

# ====================================
# API ENDPOINTS - STUDENT ASSIGNMENTS
# ====================================

@app.get("/assignments/student/{assignment_id}")
async def get_student_assignment_detail(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignment details for a student
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        Assignment details with class and teacher information
        
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student assignment details"
        )
    
    try:
        print(f"📝 Fetching assignment {assignment_id} for student: {current_user.username}")
        
        # Get assignment
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Get class information
        class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
        class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
        class_code = class_obj.code if class_obj else None
        
        # Get teacher information
        teacher_name = "Unknown Teacher"
        if class_obj and class_obj.teacher:
            teacher = class_obj.teacher
            teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
        elif assignment.creator:
            teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
        
        # Check if student is enrolled in the class
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.class_id == assignment.class_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in the class for this assignment"
            )
        
        # Get violations for this student in this assignment
        violations = crud.get_violations_by_student_and_assignment(db, current_user.id, assignment_id)
        violation_count = len(violations)
        
        return {
            "id": assignment.id,
            "name": assignment.name,
            "description": assignment.description,
            "class_id": assignment.class_id,
            "class_name": class_name,
            "class_code": class_code,
            "teacher_name": teacher_name,
            "creator_id": assignment.creator_id,
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "violation_count": violation_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student assignment: {str(e)}"
        )

@app.get("/students/me/assignments/{assignment_id}")
async def get_student_my_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignment details for the current student
    
    Args:
        assignment_id: ID of the assignment
        
    Returns:
        Assignment details for the current student
        
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student assignments"
        )
    
    try:
        print(f"📝 Fetching assignment {assignment_id} for student: {current_user.username}")
        
        # Get assignment
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Get class information
        class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
        class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
        class_code = class_obj.code if class_obj else None
        
        # Get teacher information
        teacher_name = "Unknown Teacher"
        if class_obj and class_obj.teacher:
            teacher = class_obj.teacher
            teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
        elif assignment.creator:
            teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
        
        # Check if student is enrolled in the class
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.class_id == assignment.class_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in the class for this assignment"
            )
        
        # Get violations for this student in this assignment
        violations = crud.get_violations_by_student_and_assignment(db, current_user.id, assignment_id)
        violation_count = len(violations)
        
        return {
            "id": assignment.id,
            "name": assignment.name,
            "description": assignment.description,
            "class_id": assignment.class_id,
            "class_name": class_name,
            "class_code": class_code,
            "teacher_name": teacher_name,
            "creator_id": assignment.creator_id,
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "violation_count": violation_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student assignment: {str(e)}"
        )

@app.get("/submissions/assignment/{assignment_id}/student")
async def get_student_submission_for_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current student's submission for a specific assignment
    
    Returns:
        The student's submission for the specified assignment, or 404 if not found
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions"
        )
    
    try:
        # Get the student's submission for this assignment
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).first()
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No submission found for this assignment"
            )
        
        # Get violations for this student in this assignment
        violations = crud.get_violations_by_student_and_assignment(db, current_user.id, assignment_id)
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "content": submission.content,
            "file_path": submission.file_path,
            "file_name": submission.file_name,
            "grade": submission.grade,
            "feedback": submission.feedback,
            "time_spent_minutes": submission.time_spent_minutes,
            "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            "is_graded": submission.grade is not None,
            "link_url": submission.link_url,
            "violations_count": len(violations),
            "violations": violation_responses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submission: {str(e)}"
        )

@app.get("/students/me/submissions/{assignment_id}")
async def get_student_my_submission(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current student's submission for a specific assignment
    
    Returns:
        The student's submission for the specified assignment, or 404 if not found
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions"
        )
    
    try:
        # Get the student's submission for this assignment
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).first()
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No submission found for this assignment"
            )
        
        # Get violations for this student in this assignment
        violations = crud.get_violations_by_student_and_assignment(db, current_user.id, assignment_id)
        violation_responses = []
        for violation in violations:
            violation_responses.append(ViolationResponse(
                id=violation.id,
                student_id=violation.student_id,
                assignment_id=violation.assignment_id,
                violation_type=violation.violation_type,
                description=violation.description,
                detected_at=violation.detected_at.isoformat(),
                time_away_seconds=violation.time_away_seconds,
                severity=violation.severity,
                content_added_during_absence=violation.content_added_during_absence,
                ai_similarity_score=violation.ai_similarity_score,
                paste_content_length=violation.paste_content_length
            ))
        
        return {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "content": submission.content,
            "file_path": submission.file_path,
            "file_name": submission.file_name,
            "grade": submission.grade,
            "feedback": submission.feedback,
            "time_spent_minutes": submission.time_spent_minutes,
            "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            "is_graded": submission.grade is not None,
            "link_url": submission.link_url,
            "violations_count": len(violations),
            "violations": violation_responses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submission: {str(e)}"
        )

# ====================================
# EXISTING ENDPOINTS (from your original code)
# ====================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to ClassTrack API"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate user and return access token.
    
    This endpoint handles user authentication and returns a JWT access token
    if the provided credentials are valid.
    
    Args:
        form_data: OAuth2PasswordRequestForm containing username and password
        db: Database session
        
    Returns:
        Token object containing access_token and token_type
        
    Raises:
        HTTPException: 400 status with "Incorrect username or password" if authentication fails
    """
    # Authenticate the user
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user
    
    - **username**: Unique username (min 3 characters)
    - **password**: Password (min 6 characters)
    - **role**: User role ('admin', 'teacher', or 'student')
    """
    # Check if user already exists
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user.password)
    
    # Create new user
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role=UserRole(user.role.value)
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing user (Admin only)
    
    - **user_id**: ID of the user to update
    - **username**: New username (optional)
    - **password**: New password (optional)
    - **role**: New role (optional)
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update users"
        )
    
    # Find the existing user
    db_user = get_user_by_id(db, user_id=user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if username is being updated and if it already exists
    if user_in.username and user_in.username != db_user.username:
        existing_user = get_user_by_username(db, username=user_in.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    
    # Update user fields
    update_data = user_in.dict(exclude_unset=True)
    
    if "username" in update_data:
        db_user.username = update_data["username"]
    
    if "role" in update_data:
        db_user.role = UserRole(update_data["role"].value)
    
    if "password" in update_data:
        # Hash the new password
        db_user.hashed_password = get_password_hash(update_data["password"])
    
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@app.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an existing user (Admin only)
    
    - **user_id**: ID of the user to delete
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete users"
        )
    
    try:
        success = crud.delete_user(db, user_id=user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {"message": "User deleted successfully"}
    except ValueError as e:
        # Handle foreign key constraint errors with user-friendly message
        error_message = str(e)
        if "foreign key constraint" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete user: User has active classes, assignments, or submissions. Please remove all related data first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user: {error_message}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

# Classes CRUD endpoints (Admin only)

@app.get("/classes/", response_model=list[ClassResponse])
async def get_classes_endpoint(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Get all classes (Admin only)
    
    - **skip**: Number of classes to skip (for pagination)
    - **limit**: Maximum number of classes to return
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view classes"
        )
    
    try:
        classes = crud.get_classes(db, skip=skip, limit=limit)
        return classes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classes: {str(e)}"
        )

@app.post("/classes/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_new_class(
    class_data: ClassCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new class (Admin only)
    
    - **name**: Class name
    - **code**: Unique class code
    - **teacher_id**: Optional teacher ID to assign to the class
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create classes"
        )
    
    try:
        new_class = crud.create_class(db, class_in=class_data)
        return new_class
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create class: {str(e)}"
        )

@app.patch("/classes/{class_id}", response_model=ClassResponse)
async def update_existing_class(
    class_id: int,
    class_data: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing class (Admin only)
    
    - **class_id**: ID of the class to update
    - **name**: Updated class name
    - **code**: Updated class code
    - **teacher_id**: Updated teacher ID assignment
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update classes"
        )
    
    try:
        updated_class = crud.update_class(db, class_id=class_id, class_in=class_data)
        if not updated_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        return updated_class
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update class: {str(e)}"
        )

@app.delete("/classes/{class_id}")
async def delete_existing_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a class (Admin only)
    
    - **class_id**: ID of the class to delete
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete classes"
        )
    
    try:
        success = crud.delete_class(db, class_id=class_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        return {"message": "Class deleted successfully"}
    except ValueError as e:
        # Handle foreign key constraint errors with user-friendly message
        error_message = str(e)
        if "foreign key constraint" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete class: Class still has active students, assignments, or schedules. Please remove all related data first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete class: {error_message}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete class: {str(e)}"
        )

# Assignment endpoints (Teacher and Admin only)

@app.get("/assignments/", response_model=list[AssignmentResponse])
async def get_assignments_endpoint(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Get all assignments (Teacher and Admin only)
    
    - **skip**: Number of assignments to skip (for pagination)
    - **limit**: Maximum number of assignments to return
    
    For teachers, returns only assignments they created.
    For admins, returns all assignments.
    
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view assignments"
        )
    
    try:
        if current_user.role == UserRole.ADMIN:
            # Admins can see all assignments
            assignments = crud.get_assignments(db, skip=skip, limit=limit)
        else:
            # Teachers can only see their own assignments
            assignments = crud.get_assignments_by_teacher(db, teacher_id=current_user.id, skip=skip, limit=limit)
        
        return assignments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assignments: {str(e)}"
        )

@app.post("/assignments/", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_assignment(
    assignment_data: AssignmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new assignment (Teacher and Admin only)
    
    - **name**: Assignment name
    - **description**: Assignment description (optional)
    - **class_id**: ID of the class this assignment belongs to
    
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments"
        )
    
    try:
        print(f"API: Creating assignment for user {current_user.id} with data: {assignment_data}")
        
        # Additional validation at API level
        if not assignment_data.name or not assignment_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignment name cannot be empty"
            )
        
        if not assignment_data.class_id or assignment_data.class_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid class ID is required"
            )
        
        new_assignment = crud.create_assignment(db, assignment_in=assignment_data, creator_id=current_user.id)
        print(f"API: Successfully created assignment {new_assignment.id}")
        return new_assignment
        
    except ValueError as e:
        print(f"API: ValueError in assignment creation: {e}")
        # All ValueError exceptions from crud.py are validation errors that should return 400
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        # Re-raise HTTPException as-is (these are our API-level validation errors)
        raise
    except Exception as e:
        print(f"API: Unexpected error in assignment creation: {e}")
        print(f"API: Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        # Only return 500 for truly unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the assignment. Please try again."
        )

@app.get("/assignments/me", response_model=list[AssignmentResponse])
async def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignments for the current student (Student only)
    
    Returns all assignments for classes where the current user is enrolled.
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view assignments"
        )
    
    try:
        assignments = crud.get_assignments_for_student(db, user_id=current_user.id)
        return assignments
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assignments: {str(e)}"
        )

@app.delete("/assignments/{assignment_id}")
async def delete_existing_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an assignment (Teacher and Admin only)
    
    - **assignment_id**: ID of the assignment to delete
    
    Requires authentication and TEACHER or ADMIN role.
    Teachers can only delete their own assignments, Admins can delete any assignment.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete assignments"
        )
    
    # First, check if the assignment exists and get it
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # For teachers, check if they own the assignment
    if current_user.role == UserRole.TEACHER:
        if assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this assignment"
            )
    
    try:
        # Now delete the assignment (we already have it, so no need to query again)
        print(f"DEBUG: Deleting assignment {assignment_id} (name: {assignment.name}) for user {current_user.id} (role: {current_user.role})")
        db.delete(assignment)
        db.commit()
        print(f"DEBUG: Assignment {assignment_id} deleted successfully")
        
        return {"message": "Assignment deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Error deleting assignment {assignment_id}: {str(e)}")
        # Handle foreign key constraint errors with user-friendly message
        error_message = str(e)
        if "foreign key constraint" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete assignment: Assignment still has active submissions or other dependencies. Please remove all related data first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete assignment: {error_message}"
            )

# FIXED: Student assignments endpoint - ALL STUDENTS CAN SEE ALL ASSIGNMENTS
@app.get("/assignments/student/", response_model=List[AssignmentResponse])
async def get_student_assignments_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ALL assignments for ALL students (including from all teachers)
    
    Returns ALL assignments from ALL classes.
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student assignments"
        )
    
    try:
        print(f"📝 Fetching ALL assignments for student: {current_user.username}")
        
        # Get ALL assignments with class and teacher information
        assignments = db.query(Assignment).join(Class).join(User, Class.teacher_id == User.id).all()
        
        print(f"✅ Found {len(assignments)} assignments for student")
        
        # Convert to response format
        assignment_responses = []
        for assignment in assignments:
            # Get class information
            class_obj = assignment.class_
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            # Get teacher information
            teacher_name = "Unknown Teacher"
            if class_obj and class_obj.teacher:
                teacher_name = class_obj.teacher.first_name + " " + class_obj.teacher.last_name if class_obj.teacher.first_name and class_obj.teacher.last_name else class_obj.teacher.username
            elif assignment.creator:
                teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
            
            # FIX: Safely handle created_at
            created_at = getattr(assignment, 'created_at', None)
            if created_at:
                created_at_str = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            assignment_response = AssignmentResponse(
                id=assignment.id,
                name=assignment.name,
                description=assignment.description,
                class_id=assignment.class_id,
                class_name=class_name,
                class_code=class_obj.code if class_obj else None,
                teacher_name=teacher_name,
                creator_id=assignment.creator_id,
                created_at=created_at_str
            )
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        print(f"❌ Error fetching student assignments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student assignments: {str(e)}"
        )

# FIXED: Student classes endpoint - ALL STUDENTS CAN SEE ALL CLASSES
@app.get("/classes/student/", response_model=List[dict])
async def get_student_classes_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ALL classes for ALL students with teacher information
    
    Returns ALL classes with teacher details.
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student classes"
        )
    
    try:
        print(f"📚 Fetching ALL classes for student: {current_user.username}")
        
        # Get ALL classes with teacher information
        classes = db.query(Class).join(User, Class.teacher_id == User.id).all()
        
        print(f"✅ Found {len(classes)} classes for student")
        
        classes_data = []
        for class_obj in classes:
            teacher = class_obj.teacher
            
            # Get teacher name
            teacher_name = "Unknown Teacher"
            if teacher:
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            
            # FIX: Safely handle description attribute
            description = getattr(class_obj, 'description', None)
            
            # FIX: Safely handle created_at attribute - use current time if not available
            created_at = getattr(class_obj, 'created_at', None)
            if created_at:
                created_at_str = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            class_data = {
                "id": class_obj.id,
                "name": class_obj.name,
                "code": class_obj.code,
                "teacher_id": class_obj.teacher_id,
                "teacher_name": teacher_name,
                "description": description,
                "created_at": created_at_str
            }
            classes_data.append(class_data)
        
        print(f"✅ Returning {len(classes_data)} classes for student")
        return classes_data
        
    except Exception as e:
        print(f"❌ Error fetching student classes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student classes: {str(e)}"
        )

# FIXED: Add the missing /students/me/classes endpoint
@app.get("/students/me/classes", response_model=List[dict])
async def get_student_my_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get classes for the current student (Student only)
    
    Returns classes that the student is enrolled in.
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student classes"
        )
    
    try:
        print(f"📚 Fetching enrolled classes for student: {current_user.username}")
        
        # Get classes the student is enrolled in
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        class_ids = [enrollment.class_id for enrollment in enrollments]
        
        if not class_ids:
            return []
        
        # Get classes with teacher information
        classes = db.query(Class).join(User, Class.teacher_id == User.id).filter(
            Class.id.in_(class_ids)
        ).all()
        
        print(f"✅ Found {len(classes)} enrolled classes for student")
        
        classes_data = []
        for class_obj in classes:
            teacher = class_obj.teacher
            
            # Get teacher name
            teacher_name = "Unknown Teacher"
            if teacher:
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            
            # FIX: Safely handle description attribute
            description = getattr(class_obj, 'description', None)
            
            # FIX: Safely handle created_at attribute
            created_at = getattr(class_obj, 'created_at', None)
            if created_at:
                created_at_str = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            class_data = {
                "id": class_obj.id,
                "name": class_obj.name,
                "code": class_obj.code,
                "teacher_id": class_obj.teacher_id,
                "teacher_name": teacher_name,
                "description": description,
                "created_at": created_at_str
            }
            classes_data.append(class_data)
        
        print(f"✅ Returning {len(classes_data)} enrolled classes for student")
        return classes_data
        
    except Exception as e:
        print(f"❌ Error fetching student enrolled classes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student enrolled classes: {str(e)}"
        )

# Teacher assignments endpoint
@app.get("/assignments/teacher/", response_model=List[AssignmentResponse])
async def get_teacher_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignments created by the current teacher
    
    Returns assignments created by the teacher with class information.
    
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view teacher assignments"
        )
    
    try:
        print(f"📝 Fetching assignments for teacher: {current_user.username}")
        
        # Get assignments created by the teacher with class information
        assignments = db.query(Assignment).join(Class).filter(
            Assignment.creator_id == current_user.id
        ).all()
        
        print(f"✅ Found {len(assignments)} assignments for teacher")
        
        # Convert to response format
        assignment_responses = []
        for assignment in assignments:
            class_obj = assignment.class_
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            assignment_response = AssignmentResponse(
                id=assignment.id,
                name=assignment.name,
                description=assignment.description,
                class_id=assignment.class_id,
                class_name=class_name,
                class_code=class_obj.code if class_obj else None,
                teacher_name=current_user.first_name + " " + current_user.last_name if current_user.first_name and current_user.last_name else current_user.username,
                creator_id=assignment.creator_id,
                created_at=assignment.created_at
            )
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        print(f"❌ Error fetching teacher assignments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teacher assignments: {str(e)}"
        )

# Submission endpoints (Student only)

@app.post("/submissions/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_submission(
    submission_data: SubmissionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new submission (Student only)
    
    - **assignment_id**: ID of the assignment being submitted
    - **student_id**: ID of the student submitting (ignored - uses authenticated user's ID)
    - **time_spent_minutes**: Time spent on the assignment (core AI data input)
    
    Requires authentication and STUDENT role.
    The student_id from the request is ignored - the authenticated user's ID is always used.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create submissions"
        )
    
    try:
        print(f"API: Creating submission for user {current_user.id} with data: {submission_data}")
        
        # Always use the authenticated user's ID, ignoring any student_id from the frontend
        new_submission = crud.create_submission(db, submission_in=submission_data, student_id=current_user.id)
        print(f"API: Successfully created submission {new_submission.id}")
        return new_submission
    except HTTPException:
        # Let HTTPException (like 409 Conflict) pass through unchanged
        raise
    except ValueError as e:
        print(f"API: ValueError in submission creation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"API: Unexpected error in submission creation: {e}")
        print(f"API: Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the submission. Please try again."
        )

# STUDENT-SPECIFIC ENDPOINTS - ADD THESE MISSING FUNCTIONS

@app.get("/students/me/submissions", response_model=List[SubmissionResponse])
async def get_student_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submissions for the current student
    
    Returns:
        List of submissions made by the student
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student submissions"
        )
    
    try:
        print(f"📄 Fetching submissions for student: {current_user.username}")
        
        # Get all submissions for the student
        submissions = db.query(Submission).filter(
            Submission.student_id == current_user.id
        ).all()
        
        print(f"✅ Found {len(submissions)} submissions for student")
        
        # Convert to response format
        submission_responses = []
        for submission in submissions:
            # FIX: Safely handle submitted_at
            submitted_at = getattr(submission, 'submitted_at', None)
            if submitted_at:
                submitted_at_str = submitted_at.isoformat() if hasattr(submitted_at, 'isoformat') else str(submitted_at)
            else:
                submitted_at_str = datetime.utcnow().isoformat()
            
            submission_response = SubmissionResponse(
                id=submission.id,
                assignment_id=submission.assignment_id,
                student_id=submission.student_id,
                grade=submission.grade,
                time_spent_minutes=submission.time_spent_minutes,
                submitted_at=submitted_at_str
            )
            submission_responses.append(submission_response)
        
        return submission_responses
        
    except Exception as e:
        print(f"❌ Error fetching student submissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student submissions: {str(e)}"
        )

@app.get("/students/me/schedule")
async def get_student_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get schedule for the current student
    
    Returns:
        List of schedules for the student's enrolled classes
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student schedule"
        )
    
    try:
        print(f"📅 Fetching schedule for student: {current_user.username}")
        
        # Get classes the student is enrolled in
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        class_ids = [enrollment.class_id for enrollment in enrollments]
        
        if not class_ids:
            return []
        
        # Get schedules for those classes
        schedules = db.query(Schedule).filter(Schedule.class_id.in_(class_ids)).all()
        
        # Convert to response format with enriched information
        schedule_responses = []
        for schedule in schedules:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == schedule.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {schedule.class_id}"
            class_code = class_obj.code if class_obj else "N/A"
            
            # Get teacher information
            teacher_name = "Unknown Teacher"
            if class_obj and class_obj.teacher:
                teacher = class_obj.teacher
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            
            # FIX: Safely handle created_at
            created_at = getattr(schedule, 'created_at', None)
            if created_at:
                created_at_str = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            schedule_response = {
                "id": schedule.id,
                "class_id": schedule.class_id,
                "class_name": class_name,
                "class_code": class_code,
                "teacher_name": teacher_name,
                "start_time": schedule.start_time.isoformat() if hasattr(schedule.start_time, 'isoformat') else str(schedule.start_time),
                "end_time": schedule.end_time.isoformat() if hasattr(schedule.end_time, 'isoformat') else str(schedule.end_time),
                "room_number": schedule.room_number,
                "status": schedule.status,
                "created_at": created_at_str
            }
            schedule_responses.append(schedule_response)
        
        print(f"✅ Found {len(schedule_responses)} schedule entries for student")
        return schedule_responses
        
    except Exception as e:
        print(f"❌ Error fetching student schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student schedule: {str(e)}"
        )

# Insights endpoints (Teacher and Admin only)

@app.get("/insights/engagement/{assignment_id}")
async def get_engagement_insights(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get engagement insights for a specific assignment (Teacher and Admin only)
    
    - **assignment_id**: ID of the assignment to get insights for
    
    Returns engagement metrics including total submissions, average time spent, and AI-calculated engagement score.
    
    Requires authentication and TEACHER or ADMIN role.
    """
    # Check if current user is a teacher or admin
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view engagement insights"
        )
    
    try:
        # Get assignment to verify it exists and user has access
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # For teachers, verify they created this assignment
        if current_user.role == UserRole.TEACHER and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view insights for this assignment"
            )
        
        # Get submissions for this assignment
        from models import Submission, User
        submissions = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
        
        if not submissions:
            # No submissions yet
            return {
                "assignment_id": assignment_id,
                "assignment_name": assignment.name,
                "class_name": assignment.class_.name if assignment.class_ else "Unknown Class",
                "total_submissions": 0,
                "average_time_spent": 0,
                "engagement_score": 0.0,
                "last_updated": datetime.utcnow().isoformat()
            }
        
        # Calculate metrics
        total_submissions = len(submissions)
        total_time_spent = sum(sub.time_spent_minutes for sub in submissions)
        average_time_spent = total_time_spent / total_submissions if total_submissions > 0 else 0
        
        # Calculate AI engagement score (simplified algorithm)
        # Based on submission rate, time spent, and recency
        engagement_score = min(10.0, max(0.0, 
            (total_submissions * 0.4) +  # Submission rate factor
            (average_time_spent / 10 * 0.4) +  # Time spent factor
            (2.0)  # Base score for having submissions
        ))
        
        return {
            "assignment_id": assignment_id,
            "assignment_name": assignment.name,
            "class_name": assignment.class_.name if assignment.class_ else "Unknown Class",
            "total_submissions": total_submissions,
            "average_time_spent": round(average_time_spent, 1),
            "engagement_score": round(engagement_score, 1),
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get engagement insights: {str(e)}"
        )

@app.get("/users/", response_model=list[UserResponse])
async def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all users (Admin only)
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users"
        )
    
    users = db.query(User).all()
    return users

@app.post("/users/create", response_model=UserResponse)
async def create_user_by_admin(
    user_in: UserCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user (Admin only)
    
    - **username**: Unique username (min 3 characters)
    - **password**: Password (min 6 characters)
    - **role**: User role ('teacher' or 'student')
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create users"
        )
    
    # Check if user already exists
    db_user = get_user_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_in.password)
    
    # Create new user
    db_user = User(
        username=user_in.username,
        hashed_password=hashed_password,
        role=UserRole(user_in.role.value)
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information (protected endpoint)"""
    return current_user

@app.put("/users/me", response_model=UserResponse)
async def update_user_profile_endpoint(
    user_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's profile information (Protected endpoint)
    
    - **first_name**: User's first name (optional)
    - **last_name**: User's last name (optional)
    
    Requires authentication. Only the authenticated user can update their own profile.
    """
    try:
        # Prepare update data (only include non-None values)
        update_data = {}
        if user_update.first_name is not None:
            update_data['first_name'] = user_update.first_name
        if user_update.last_name is not None:
            update_data['last_name'] = user_update.last_name
        
        # Update the user's profile
        updated_user = crud.update_user_profile(
            db=db,
            user_id=current_user.id,
            update_data=update_data
        )
        
        return updated_user
        
    except ValueError as e:
        error_message = str(e)
        if "User not found" in error_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    except HTTPException:
        # Re-raise HTTP exceptions unchanged
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating profile. Please try again."
        )

@app.post("/users/me/photo")
async def upload_profile_photo_endpoint(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload profile photo for current user (Protected endpoint)
    
    - **photo**: Image file (JPEG, PNG, GIF, WebP)
    
    Requires authentication. Only the authenticated user can upload their own profile photo.
    """
    try:
        # Validate file type
        if not photo.content_type or not photo.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image (JPEG, PNG, GIF, or WebP)"
            )
        
        # Validate file size (max 5MB)
        if photo.size and photo.size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        # Generate unique filename
        file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await photo.read()
            await f.write(content)
        
        # Generate full accessible URL for the uploaded file
        photo_url = f"/uploads/{unique_filename}"
        full_photo_url = f"http://localhost:8000{photo_url}"
        
        # Update user's profile picture URL in database (store relative path)
        updated_user = crud.update_user_profile_picture(
            db=db,
            user_id=current_user.id,
            profile_picture_url=photo_url
        )
        
        return {
            "message": "Profile photo uploaded successfully",
            "photo_url": full_photo_url,
            "user": updated_user
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions unchanged
        raise
    except ValueError as e:
        error_message = str(e)
        if "User not found" in error_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while uploading photo. Please try again."
        )

@app.put("/users/change-password")
async def change_password_endpoint(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change user password with current password verification (Protected endpoint)
    
    - **current_password**: User's current password (must be correct)
    - **new_password**: New password (min 8 characters)
    
    Requires authentication. Only the authenticated user can change their own password.
    """
    try:
        # Change the user's password
        success = crud.change_user_password(
            db=db,
            user_id=current_user.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        
        if success:
            return {
                "message": "Password changed successfully",
                "success": True
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password. Please try again."
            )
            
    except ValueError as e:
        # Handle validation errors (incorrect current password, user not found, etc.)
        error_message = str(e)
        if "Current password is incorrect" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        elif "User not found" in error_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    except HTTPException:
        # Re-raise HTTP exceptions unchanged
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while changing password. Please try again."
        )

# Metrics endpoints (Admin only)

@app.get("/metrics/users/count")
async def get_users_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get total count of users (Admin only)
    
    Returns the total number of users in the system.
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view user metrics"
        )
    
    try:
        count = crud.count_total_users(db)
        return {"count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users count: {str(e)}"
        )

@app.get("/metrics/classes/count")
async def get_classes_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get total count of classes (Admin only)
    
    Returns the total number of classes in the system.
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view class metrics"
        )
    
    try:
        count = crud.count_total_classes(db)
        return {"count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get classes count: {str(e)}"
        )

# Export endpoints (Admin only)

@app.get("/exports/users/all", response_model=list[UserResponse])
async def export_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export all users data (Admin only)
    
    Returns all users in the system for CSV export purposes.
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export user data"
        )
    
    try:
        users = crud.get_all_users(db)
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export users: {str(e)}"
        )

@app.get("/exports/classes/all")
async def export_all_classes_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export all classes data (Admin only)
    
    Returns all classes in the system for CSV export purposes.
    Uses forced dictionary conversion to bypass ORM serialization issues.
    
    Requires authentication and ADMIN role.
    """
    # Check if current user is an admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export class data"
        )
    
    # Get classes as simple dictionaries (no ORM serialization issues)
    classes = crud.get_all_classes(db)
    return classes

# Schedule endpoints
@app.post("/schedules/", response_model=ScheduleResponse)
async def create_schedule_endpoint(
    schedule: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new schedule entry (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create schedules"
        )
    
    try:
        return crud.create_schedule(db, schedule)
    except HTTPException:
        # Re-raise HTTPExceptions (like 404 for invalid class_id)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create schedule: {str(e)}"
        )

@app.get("/schedules/", response_model=list[ScheduleResponse])
async def get_schedules_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all schedules with pagination (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view schedules"
        )
    
    try:
        return crud.get_schedules(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch schedules: {str(e)}"
        )

@app.get("/schedules/live")
async def get_schedules_live_endpoint(db: Session = Depends(get_db)):
    """
    Get all schedules for live display with enriched teacher and class information (Public endpoint)
    No authentication required - for student dashboard display.
    """
    try:
        return crud.get_schedules_live_enriched(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live schedules: {str(e)}"
        )

@app.get("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule_endpoint(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific schedule by ID (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view schedules"
        )
    
    schedule = crud.get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    return schedule

@app.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule_endpoint(
    schedule_id: int,
    schedule: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a schedule (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update schedules"
        )
    
    try:
        updated_schedule = crud.update_schedule(db, schedule_id, schedule)
        if not updated_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        return updated_schedule
    except HTTPException:
        # Re-raise HTTPExceptions (like 404 for invalid class_id)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update schedule: {str(e)}"
        )

@app.delete("/schedules/{schedule_id}")
async def delete_schedule_endpoint(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a schedule (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete schedules"
        )
    
    if not crud.delete_schedule(db, schedule_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    return {"message": "Schedule deleted successfully"}

# NEW ENDPOINT: Get cleanliness status for specific schedule
@app.get("/schedules/{schedule_id}/cleanliness")
async def get_schedule_cleanliness(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get cleanliness report for a specific schedule
    
    Args:
        schedule_id: ID of the schedule to get cleanliness for
        
    Returns:
        Cleanliness status and latest report
    """
    try:
        # Get the schedule
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        # Get latest room report for this class
        latest_report = db.query(ClassroomReport).filter(
            ClassroomReport.class_id == schedule.class_id
        ).order_by(
            ClassroomReport.created_at.desc()
        ).first()
        
        if not latest_report:
            return {
                "schedule_id": schedule_id,
                "class_id": schedule.class_id,
                "cleanliness_status": schedule.status,
                "has_report": False,
                "latest_report": None,
                "message": "No cleanliness reports yet"
            }
        
        # Convert boolean to string for compatibility
        is_clean_after = "true" if latest_report.is_clean_after else "false"
        is_clean_before = "true" if latest_report.is_clean_before else "false"
        
        return {
            "schedule_id": schedule_id,
            "class_id": schedule.class_id,
            "cleanliness_status": "Clean" if latest_report.is_clean_after else "Needs Cleaning",
            "has_report": True,
            "latest_report": {
                "id": latest_report.id,
                "reporter_id": latest_report.reporter_id,
                "is_clean_before": is_clean_before,
                "is_clean_after": is_clean_after,
                "report_text": latest_report.report_text,
                "photo_url": latest_report.photo_url,
                "created_at": latest_report.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cleanliness status: {str(e)}"
        )

# Announcement endpoints
@app.post("/announcements/", response_model=AnnouncementResponse)
async def create_announcement_endpoint(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new announcement (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create announcements"
        )
    
    try:
        return crud.create_announcement(db, announcement)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create announcement: {str(e)}"
        )

@app.get("/announcements/", response_model=list[AnnouncementResponse])
async def get_announcements_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all announcements with pagination (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view announcements"
        )
    
    try:
        return crud.get_announcements(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch announcements: {str(e)}"
        )

@app.get("/announcements/live", response_model=list[AnnouncementResponse])
async def get_announcements_live_endpoint(db: Session = Depends(get_db)):
    """
    Get all announcements for live display (Public endpoint)
    No authentication required - for student dashboard display.
    """
    try:
        return crud.get_announcements_live(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live announcements: {str(e)}"
        )

@app.get("/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific announcement by ID (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view announcements"
        )
    
    announcement = crud.get_announcement(db, announcement_id)
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    return announcement

@app.put("/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement_endpoint(
    announcement_id: int,
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an announcement (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update announcements"
        )
    
    updated_announcement = crud.update_announcement(db, announcement_id, announcement)
    if not updated_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    return updated_announcement

@app.delete("/announcements/{announcement_id}")
async def delete_announcement_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an announcement (Admin and Teacher only)
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete announcements"
        )
    
    if not crud.delete_announcement(db, announcement_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    return {"message": "Announcement deleted successfully"}

# Classroom Report endpoints

@app.post("/reports/", response_model=ClassroomReportResponse, status_code=status.HTTP_201_CREATED)
async def create_classroom_report_endpoint(
    class_id: int = Form(...),
    is_clean_before: bool = Form(...),
    is_clean_after: bool = Form(...),
    report_text: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new classroom report with optional photo evidence (Students only)
    
    - **class_id**: ID of the class/room being reported
    - **is_clean_before**: Whether the room was clean before use
    - **is_clean_after**: Whether the room was clean after use
    - **report_text**: Description of the report
    - **photo**: Optional photo evidence (jpg, jpeg, png, gif, webp, max 10MB)
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create classroom reports"
        )
    
    photo_url = None
    
    # Handle photo upload if provided
    if photo:
        # Validate file type
        file_extension = os.path.splitext(photo.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Validate file size
        if photo.size and photo.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        try:
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await photo.read()
                await f.write(content)
            
            # Generate URL (in production, this would be a proper URL)
            photo_url = f"/uploads/{filename}"
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save photo: {str(e)}"
            )
    
    # Create report data
    report_data = ClassroomReportCreate(
        class_id=class_id,
        is_clean_before=is_clean_before,
        is_clean_after=is_clean_after,
        report_text=report_text,
        photo_url=photo_url
    )
    
    try:
        new_report = crud.create_classroom_report(db, report_in=report_data, reporter_id=current_user.id)
        
        # AFTER CREATING THE REPORT, UPDATE ALL RELATED SCHEDULES
        try:
            # Find all schedules for this class
            class_schedules = db.query(Schedule).filter(
                Schedule.class_id == class_id
            ).all()
            
            for schedule in class_schedules:
                # Update schedule status based on cleanliness
                new_status = "Clean" if is_clean_after else "Needs Cleaning"
                schedule.status = new_status
                print(f"✅ Updated schedule {schedule.id} status to: {new_status}")
            
            db.commit()
            print(f"✅ Successfully updated {len(class_schedules)} schedules for class {class_id}")
        except Exception as e:
            print(f"⚠️ Warning: Could not update schedule statuses: {e}")
            # Don't fail the report creation if schedule update fails
            db.rollback()
            # Re-query the report to ensure it's still saved
            db.refresh(new_report)
        
        return new_report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create classroom report: {str(e)}"
        )

@app.get("/reports/", response_model=list[ClassroomReportResponse])
async def get_classroom_reports_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all classroom reports (Admin and Teacher only)
    
    - **skip**: Number of reports to skip (for pagination)
    - **limit**: Maximum number of reports to return
    
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view classroom reports"
        )
    
    try:
        reports = crud.get_classroom_reports(db, skip=skip, limit=limit)
        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classroom reports: {str(e)}"
        )

@app.get("/reports/my", response_model=list[ClassroomReportResponse])
async def get_my_classroom_reports_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get classroom reports created by the current user (Students only)
    
    - **skip**: Number of reports to skip (for pagination)
    - **limit**: Maximum number of reports to return
    
    Requires authentication and STUDENT role.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view classroom reports"
        )
    
    try:
        reports = crud.get_classroom_reports_by_reporter(db, reporter_id=current_user.id, skip=skip, limit=limit)
        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classroom reports: {str(e)}"
        )

@app.get("/reports/class/{class_id}", response_model=list[ClassroomReportResponse])
async def get_classroom_reports_by_class_endpoint(
    class_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get classroom reports for a specific class (Admin and Teacher only)
    
    - **class_id**: ID of the class
    - **skip**: Number of reports to skip (for pagination)
    - **limit**: Maximum number of reports to return
    
    Requires authentication and ADMIN or TEACHER role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view classroom reports"
        )
    
    try:
        reports = crud.get_classroom_reports_by_class(db, class_id=class_id, skip=skip, limit=limit)
        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classroom reports: {str(e)}"
        )

# NEW: Latest reports endpoint - FIX FOR 404 ERROR
@app.get("/reports/latest")
async def get_latest_classroom_reports(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get latest classroom reports for the current user
    
    - **limit**: Maximum number of latest reports to return (default: 10)
    
    Returns latest reports based on user role:
    - Students: Their own latest reports
    - Teachers: Latest reports for their classes
    - Admins: All latest reports
    
    Requires authentication.
    """
    try:
        print(f"📊 Fetching latest reports for user: {current_user.username} (role: {current_user.role})")
        
        if current_user.role == UserRole.STUDENT:
            # Students get their own latest reports
            reports = db.query(ClassroomReport).filter(
                ClassroomReport.reporter_id == current_user.id
            ).order_by(
                ClassroomReport.created_at.desc()
            ).limit(limit).all()
            
            print(f"✅ Found {len(reports)} latest reports for student")
        
        elif current_user.role == UserRole.TEACHER:
            # Teachers get latest reports for their classes
            # First, get classes taught by this teacher
            teacher_classes = db.query(Class).filter(
                Class.teacher_id == current_user.id
            ).all()
            
            class_ids = [cls.id for cls in teacher_classes]
            
            if not class_ids:
                print("ℹ️ No classes found for teacher")
                return []
            
            # Get reports for these classes
            reports = db.query(ClassroomReport).filter(
                ClassroomReport.class_id.in_(class_ids)
            ).order_by(
                ClassroomReport.created_at.desc()
            ).limit(limit).all()
            
            print(f"✅ Found {len(reports)} latest reports for teacher's classes")
        
        elif current_user.role == UserRole.ADMIN:
            # Admins get all latest reports
            reports = db.query(ClassroomReport).order_by(
                ClassroomReport.created_at.desc()
            ).limit(limit).all()
            
            print(f"✅ Found {len(reports)} latest reports for admin")
        
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view reports"
            )
        
        # Convert to response format with enriched information
        report_responses = []
        for report in reports:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == report.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {report.class_id}"
            class_code = class_obj.code if class_obj else "N/A"
            
            # Get reporter information
            reporter = db.query(User).filter(User.id == report.reporter_id).first()
            reporter_name = "Unknown User"
            if reporter:
                reporter_name = reporter.first_name + " " + reporter.last_name if reporter.first_name and reporter.last_name else reporter.username
            
            # Get teacher information for the class
            teacher_name = "Unknown Teacher"
            if class_obj and class_obj.teacher:
                teacher = class_obj.teacher
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            
            # FIX: Safely handle created_at
            created_at = getattr(report, 'created_at', None)
            if created_at:
                created_at_str = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            report_response = {
                "id": report.id,
                "class_id": report.class_id,
                "class_name": class_name,
                "class_code": class_code,
                "teacher_name": teacher_name,
                "reporter_id": report.reporter_id,
                "reporter_name": reporter_name,
                "is_clean_before": report.is_clean_before,
                "is_clean_after": report.is_clean_after,
                "report_text": report.report_text,
                "photo_url": report.photo_url,
                "created_at": created_at_str
            }
            report_responses.append(report_response)
        
        return report_responses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching latest reports: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch latest reports: {str(e)}"
        )

# Teacher-specific endpoints

@app.get("/classes/{class_id}")
async def get_class_by_id(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific class by ID
    
    Args:
        class_id: ID of the class to retrieve
        
    Returns:
        Class data
        
    Requires authentication and appropriate role.
    """
    try:
        # Get class
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Check permissions - admin can see all, teachers can see their assigned classes
        if current_user.role != UserRole.ADMIN:
            # Check if teacher is assigned to this class
            if class_obj.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this class"
                )
        
        return {
            "id": class_obj.id,
            "name": class_obj.name,
            "code": class_obj.code,
            "description": getattr(class_obj, 'description', None),  # FIX: Safe attribute access
            "teacher_id": class_obj.teacher_id,
            "created_at": class_obj.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch class: {str(e)}"
        )

@app.get("/teachers/me/classes", response_model=dict)
async def get_teacher_classes_with_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get classes assigned to current teacher with aggregated metrics
    
    Returns:
        - classes: List of classes assigned to the teacher
        - metrics: Aggregated metrics including total students and classes
    
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view teacher classes"
        )
    
    try:
        # Get classes assigned to the teacher
        teacher_classes = crud.get_classes_by_teacher(db, teacher_id=current_user.id)
        
        # Calculate metrics
        total_classes = len(teacher_classes)
        total_students = 0
        
        # Count total students across all teacher's classes
        for class_obj in teacher_classes:
            student_count = db.query(Enrollment).filter(
                Enrollment.class_id == class_obj.id
            ).count()
            total_students += student_count
        
        # Convert classes to response format
        class_responses = []
        for class_obj in teacher_classes:
            class_dict = {
                'id': class_obj.id,
                'name': class_obj.name,
                'code': class_obj.code,
                'teacher_id': class_obj.teacher_id,
                'description': getattr(class_obj, 'description', None),  # FIX: Safe attribute access
                'student_count': student_count  # Add student count to response
            }
            class_responses.append(class_dict)
        
        return {
            'classes': class_responses,
            'metrics': {
                'total_classes': total_classes,
                'total_students': total_students
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teacher classes: {str(e)}"
        )

@app.get("/teachers/me/classes/{class_id}/roster")
async def get_class_roster(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get student roster for a specific class (Teacher only)
    
    Args:
        class_id: ID of the class
        
    Returns:
        List of students enrolled in the class
        
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view class roster"
        )
    
    try:
        # Verify the class is assigned to the current teacher
        class_obj = db.query(Class).filter(
            Class.id == class_id,
            Class.teacher_id == current_user.id
        ).first()
        
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found or not assigned to teacher"
            )
        
        # Get enrolled students
        enrollments = db.query(Enrollment).filter(
            Enrollment.class_id == class_id
        ).all()
        
        # Get student details
        roster = []
        for enrollment in enrollments:
            student = db.query(User).filter(
                User.id == enrollment.student_id
            ).first()
            
            if student:
                student_data = {
                    'id': student.id,
                    'username': student.username,
                    'first_name': student.first_name,
                    'last_name': student.last_name,
                    'email': student.email,
                    'enrolled_at': enrollment.enrolled_at
                }
                roster.append(student_data)
        
        return roster
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch class roster: {str(e)}"
        )

@app.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    assignment_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing assignment
    
    Args:
        assignment_id: ID of the assignment to update
        assignment_update: Dictionary containing fields to update
        
    Returns:
        Updated assignment data
        
    Requires authentication and TEACHER or ADMIN role.
    """
    try:
        # Check if assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check if user has permission to update this assignment
        # Allow if user is admin or if user is the creator of the assignment
        if current_user.role != UserRole.ADMIN and assignment.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this assignment"
            )
        
        # Update assignment fields
        if 'name' in assignment_update:
            assignment.name = assignment_update['name']
        if 'description' in assignment_update:
            assignment.description = assignment_update['description']
        if 'class_id' in assignment_update:
            assignment.class_id = assignment_update['class_id']
        
        db.commit()
        db.refresh(assignment)
        
        # Get class name for response
        class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
        class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
        
        return AssignmentResponse(
            id=assignment.id,
            name=assignment.name,
            description=assignment.description,
            class_id=assignment.class_id,
            class_name=class_name,
            creator_id=assignment.creator_id,
            created_at=assignment.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update assignment: {str(e)}"
        )

# FIXED: /assignments/{assignment_id} endpoint - NOW ALLOWS STUDENTS TO VIEW ASSIGNMENTS THEY ARE ENROLLED IN
@app.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific assignment by ID
    
    Args:
        assignment_id: ID of the assignment to retrieve
        
    Returns:
        Assignment data
        
    Requires authentication.
    - Admins can see all assignments
    - Teachers can see assignments they created
    - Students can see assignments if they are enrolled in the class
    """
    try:
        # Get assignment
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check permissions based on user role
        if current_user.role == UserRole.ADMIN:
            # Admin can see all assignments
            pass
        elif current_user.role == UserRole.TEACHER:
            # Teacher can only see their own assignments
            if assignment.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this assignment"
                )
        elif current_user.role == UserRole.STUDENT:
            # Student can only see assignments if they are enrolled in the class
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.class_id == assignment.class_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not enrolled in the class for this assignment"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view assignments"
            )
        
        # Get class information
        class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
        class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
        
        # Get teacher information
        teacher_name = "Unknown Teacher"
        if class_obj and class_obj.teacher:
            teacher = class_obj.teacher
            teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
        elif assignment.creator:
            teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
        
        return AssignmentResponse(
            id=assignment.id,
            name=assignment.name,
            description=assignment.description,
            class_id=assignment.class_id,
            class_name=class_name,
            class_code=class_obj.code if class_obj else None,
            teacher_name=teacher_name,
            creator_id=assignment.creator_id,
            created_at=assignment.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assignment: {str(e)}"
        )

# Student-specific endpoints

@app.get("/students/me/assignments", response_model=list[AssignmentResponse])
async def get_student_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignments for the current student
    
    Returns:
        List of assignments for the student's enrolled classes
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student assignments"
        )
    
    try:
        # Get classes the student is enrolled in
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        class_ids = [enrollment.class_id for enrollment in enrollments]
        
        if not class_ids:
            return []
        
        # Get assignments for those classes
        assignments = db.query(Assignment).filter(Assignment.class_id.in_(class_ids)).all()
        
        # Convert to response format
        assignment_responses = []
        for assignment in assignments:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            assignment_response = AssignmentResponse(
                id=assignment.id,
                name=assignment.name,
                description=assignment.description,
                class_id=assignment.class_id,
                class_name=class_name,
                creator_id=assignment.creator_id,
                created_at=assignment.created_at
            )
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student assignments: {str(e)}"
        )

@app.get("/students/me/grades")
async def get_student_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get grades for the current student
    
    Returns:
        List of submissions with grades for the student
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student grades"
        )
    
    try:
        # Get all submissions for the student
        submissions = db.query(Submission).filter(Submission.student_id == current_user.id).all()
        
        # Convert to response format with assignment and class information
        grade_responses = []
        for submission in submissions:
            # Get assignment information
            assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if not assignment:
                continue
                
            # Get class information
            class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            grade_response = {
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "assignment_name": assignment.name,
                "class_id": assignment.class_id,
                "class_name": class_name,
                "grade": submission.grade,
                "time_spent_minutes": submission.time_spent_minutes,
                "submitted_at": submission.submitted_at,
                "is_graded": submission.grade is not None
            }
            grade_responses.append(grade_response)
        
        return grade_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student grades: {str(e)}"
        )

@app.delete("/submissions/{submission_id}")
async def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a submission (Student only)
    
    Args:
        submission_id: ID of the submission to delete
        
    Returns:
        Success message
        
    Requires authentication and STUDENT role.
    Students can only delete their own submissions if they are not graded.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete submissions"
        )
    
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check if student owns this submission
        if submission.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this submission"
            )
        
        # Check if submission is already graded (can't delete graded submissions)
        if submission.grade is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete already graded submission"
            )
        
        # Delete submission
        db.delete(submission)
        db.commit()
        
        return {"message": "Submission deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete submission: {str(e)}"
        )

@app.get("/teachers/me/assignments", response_model=list[AssignmentResponse])
async def get_teacher_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get assignments created by the current teacher
    
    Returns:
        List of assignments created by the teacher
    
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view teacher assignments"
        )
    
    try:
        # Get assignments created by the teacher
        assignments = crud.get_assignments_by_teacher(db, teacher_id=current_user.id)
        
        # Convert to response format
        assignment_responses = []
        for assignment in assignments:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            assignment_response = AssignmentResponse(
                id=assignment.id,
                name=assignment.name,
                description=assignment.description,
                class_id=assignment.class_id,
                class_name=class_name,
                creator_id=assignment.creator_id,
                created_at=assignment.created_at
            )
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teacher assignments: {str(e)}"
        )

@app.get("/teachers/me/reports", response_model=dict)
async def get_teacher_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive reports for teacher's classes including student performance
    
    Returns:
        - class_performance: Aggregated performance data for each class
        - student_performance: Individual student performance data
    
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view teacher reports"
        )
    
    try:
        # Get classes assigned to the teacher
        teacher_classes = crud.get_classes_by_teacher(db, teacher_id=current_user.id)
        
        class_performance = []
        student_performance = []
        
        for class_obj in teacher_classes:
            # Get all assignments for this class
            assignments = db.query(Assignment).filter(
                Assignment.class_id == class_obj.id
            ).all()
            
            # Get all enrollments for this class
            enrollments = db.query(Enrollment).filter(
                Enrollment.class_id == class_obj.id
            ).all()
            
            # Calculate class-level metrics
            total_assignments = len(assignments)
            total_students = len(enrollments)
            
            # Calculate average submission rate and grade for the class
            total_submissions = 0
            total_grades = 0
            graded_submissions = 0
            
            class_student_data = []
            
            for enrollment in enrollments:
                student = db.query(User).filter(User.id == enrollment.student_id).first()
                if not student:
                    continue
                
                # Get submissions for this student in this class
                student_submissions = db.query(Submission).filter(
                    Submission.student_id == student.id,
                    Submission.assignment_id.in_([a.id for a in assignments])
                ).all()
                
                # Calculate student metrics
                submitted_assignments = len(student_submissions)
                total_submissions += submitted_assignments
                
                # Calculate average grade for this student
                student_grades = [s.grade for s in student_submissions if s.grade is not None]
                student_avg_grade = sum(student_grades) / len(student_grades) if student_grades else 0
                
                if student_grades:
                    total_grades += sum(student_grades)
                    graded_submissions += len(student_grades)
                
                # Add to student performance data
                student_data = {
                    'student_id': student.id,
                    'student_name': f"{student.first_name or ''} {student.last_name or ''}".strip() or student.username,
                    'class_id': class_obj.id,
                    'class_name': class_obj.name,
                    'average_grade_in_class': round(student_avg_grade, 2),
                    'total_assignments_submitted': submitted_assignments,
                    'total_assignments_available': total_assignments,
                    'submission_rate': round((submitted_assignments / total_assignments * 100) if total_assignments > 0 else 0, 2)
                }
                student_performance.append(student_data)
                class_student_data.append(student_data)
            
            # Calculate class-level metrics
            class_avg_grade = (total_grades / graded_submissions) if graded_submissions > 0 else 0
            class_submission_rate = (total_submissions / (total_students * total_assignments) * 100) if total_students > 0 and total_assignments > 0 else 0
            
            class_data = {
                'class_id': class_obj.id,
                'class_name': class_obj.name,
                'class_code': class_obj.code,
                'total_students': total_students,
                'total_assignments': total_assignments,
                'average_grade': round(class_avg_grade, 2),
                'submission_rate': round(class_submission_rate, 2),
                'students': class_student_data
            }
            class_performance.append(class_data)
        
        return {
            'class_performance': class_performance,
            'student_performance': student_performance,
            'summary': {
                'total_classes': len(teacher_classes),
                'total_students': len(student_performance),
                'overall_average_grade': round(sum(s['average_grade_in_class'] for s in student_performance) / len(student_performance), 2) if student_performance else 0,
                'overall_submission_rate': round(sum(s['submission_rate'] for s in student_performance) / len(student_performance), 2) if student_performance else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teacher reports: {str(e)}"
        )

# NEW: Teacher student count endpoint - ADDED FIX
@app.get("/teachers/me/students/count")
async def get_teacher_students_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get total student count for the current teacher (Teacher only)
    
    Returns:
        Total number of students across all teacher's classes
    
    Requires authentication and TEACHER role.
    """
    # Check if current user is a teacher
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student counts"
        )
    
    try:
        # Get classes assigned to the teacher
        teacher_classes = db.query(Class).filter(
            Class.teacher_id == current_user.id
        ).all()
        
        if not teacher_classes:
            return {"total_students": 0}
        
        # Count total students across all teacher's classes
        total_students = 0
        for class_obj in teacher_classes:
            student_count = db.query(Enrollment).filter(
                Enrollment.class_id == class_obj.id
            ).count()
            total_students += student_count
        
        return {"total_students": total_students}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get student count: {str(e)}"
        )

# ADDITIONAL ENDPOINTS FOR API CLIENT COMPATIBILITY

# NEW: Get specific class for student (for enrollment checking)
@app.get("/classes/student/{class_id}")
async def get_student_class_by_id(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific class for a student
    
    Args:
        class_id: ID of the class to retrieve
        
    Returns:
        Class data if student is enrolled
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view classes"
        )
    
    try:
        # Check if student is enrolled in the class
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.class_id == class_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this class"
            )
        
        # Get class
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Get teacher information
        teacher_name = "Unknown Teacher"
        if class_obj.teacher:
            teacher = class_obj.teacher
            teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
        
        return {
            "id": class_obj.id,
            "name": class_obj.name,
            "code": class_obj.code,
            "teacher_id": class_obj.teacher_id,
            "teacher_name": teacher_name,
            "description": getattr(class_obj, 'description', None),
            "created_at": class_obj.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch class: {str(e)}"
        )

# NEW: Get student's grades summary
@app.get("/students/me/grades/summary")
async def get_student_grades_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get grades summary for the current student
    
    Returns:
        Summary of grades including average grade, total submissions, etc.
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view grades summary"
        )
    
    try:
        # Get all submissions for the student
        submissions = db.query(Submission).filter(Submission.student_id == current_user.id).all()
        
        # Calculate summary statistics
        total_submissions = len(submissions)
        graded_submissions = [s for s in submissions if s.grade is not None]
        total_graded = len(graded_submissions)
        
        if total_graded > 0:
            average_grade = sum(s.grade for s in graded_submissions) / total_graded
            highest_grade = max(s.grade for s in graded_submissions)
            lowest_grade = min(s.grade for s in graded_submissions)
        else:
            average_grade = 0
            highest_grade = 0
            lowest_grade = 0
        
        # Get assignments by status
        completed_assignments = total_graded
        pending_assignments = total_submissions - total_graded
        
        return {
            "total_submissions": total_submissions,
            "graded_submissions": total_graded,
            "average_grade": round(average_grade, 2),
            "highest_grade": round(highest_grade, 2) if total_graded > 0 else 0,
            "lowest_grade": round(lowest_grade, 2) if total_graded > 0 else 0,
            "completed_assignments": completed_assignments,
            "pending_assignments": pending_assignments,
            "completion_rate": round((completed_assignments / total_submissions * 100) if total_submissions > 0 else 0, 2)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch grades summary: {str(e)}"
        )

# NEW: Get student's upcoming assignments
@app.get("/students/me/assignments/upcoming")
async def get_student_upcoming_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upcoming assignments for the current student
    
    Returns:
        List of assignments that don't have submissions yet
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view upcoming assignments"
        )
    
    try:
        # Get classes the student is enrolled in
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        class_ids = [enrollment.class_id for enrollment in enrollments]
        
        if not class_ids:
            return []
        
        # Get all assignments for those classes
        all_assignments = db.query(Assignment).filter(Assignment.class_id.in_(class_ids)).all()
        
        # Get submissions for the student
        submissions = db.query(Submission).filter(Submission.student_id == current_user.id).all()
        submitted_assignment_ids = [sub.assignment_id for sub in submissions]
        
        # Filter assignments that don't have submissions yet
        upcoming_assignments = [ass for ass in all_assignments if ass.id not in submitted_assignment_ids]
        
        # Convert to response format
        assignment_responses = []
        for assignment in upcoming_assignments:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            # Get teacher information
            teacher_name = "Unknown Teacher"
            if class_obj and class_obj.teacher:
                teacher = class_obj.teacher
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            elif assignment.creator:
                teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
            
            assignment_response = AssignmentResponse(
                id=assignment.id,
                name=assignment.name,
                description=assignment.description,
                class_id=assignment.class_id,
                class_name=class_name,
                class_code=class_obj.code if class_obj else None,
                teacher_name=teacher_name,
                creator_id=assignment.creator_id,
                created_at=assignment.created_at
            )
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch upcoming assignments: {str(e)}"
        )

# NEW: Get student's completed assignments
@app.get("/students/me/assignments/completed")
async def get_student_completed_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get completed assignments for the current student
    
    Returns:
        List of assignments that have submissions
    
    Requires authentication and STUDENT role.
    """
    # Check if current user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view completed assignments"
        )
    
    try:
        # Get submissions for the student
        submissions = db.query(Submission).filter(Submission.student_id == current_user.id).all()
        
        if not submissions:
            return []
        
        # Get assignment IDs from submissions
        assignment_ids = [sub.assignment_id for sub in submissions]
        
        # Get assignments
        assignments = db.query(Assignment).filter(Assignment.id.in_(assignment_ids)).all()
        
        # Create a mapping of assignment_id to submission
        submission_map = {sub.assignment_id: sub for sub in submissions}
        
        # Convert to response format with submission info
        assignment_responses = []
        for assignment in assignments:
            # Get class information
            class_obj = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = class_obj.name if class_obj else f"Class {assignment.class_id}"
            
            # Get teacher information
            teacher_name = "Unknown Teacher"
            if class_obj and class_obj.teacher:
                teacher = class_obj.teacher
                teacher_name = teacher.first_name + " " + teacher.last_name if teacher.first_name and teacher.last_name else teacher.username
            elif assignment.creator:
                teacher_name = assignment.creator.first_name + " " + assignment.creator.last_name if assignment.creator.first_name and assignment.creator.last_name else assignment.creator.username
            
            # Get submission info
            submission = submission_map.get(assignment.id)
            
            assignment_response = {
                "id": assignment.id,
                "name": assignment.name,
                "description": assignment.description,
                "class_id": assignment.class_id,
                "class_name": class_name,
                "class_code": class_obj.code if class_obj else None,
                "teacher_name": teacher_name,
                "creator_id": assignment.creator_id,
                "created_at": assignment.created_at,
                "submission_id": submission.id if submission else None,
                "grade": submission.grade if submission else None,
                "time_spent_minutes": submission.time_spent_minutes if submission else None,
                "submitted_at": submission.submitted_at if submission else None,
                "is_graded": submission.grade is not None if submission else False
            }
            assignment_responses.append(assignment_response)
        
        return assignment_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch completed assignments: {str(e)}"
        )

# Static file serving for uploaded photos
from fastapi.staticfiles import StaticFiles

# Mount static files directory
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)