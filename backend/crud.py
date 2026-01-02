from sqlalchemy.orm import Session
from models import Class, ClassCreate, User, Assignment, AssignmentCreate, Submission, Enrollment, Schedule, ScheduleCreate, Announcement, AnnouncementCreate, ClassroomReport, ClassroomReportCreate, Violation, ViolationCreate
from schemas import SubmissionCreate
from typing import Optional, List
from datetime import datetime


def create_class(db: Session, class_in: ClassCreate) -> Class:
    """
    Create a new class and save it to the database.
    
    Args:
        db: Database session
        class_in: ClassCreate object containing class data
        
    Returns:
        Class: The created class object
        
    Raises:
        ValueError: If class name or code already exists
    """
    # Check if class name already exists
    existing_class_by_name = db.query(Class).filter(Class.name == class_in.name).first()
    if existing_class_by_name:
        raise ValueError(f"Class with name '{class_in.name}' already exists")
    
    # Check if class code already exists
    existing_class_by_code = db.query(Class).filter(Class.code == class_in.code).first()
    if existing_class_by_code:
        raise ValueError(f"Class with code '{class_in.code}' already exists")
    
    # If teacher_id is provided, verify the teacher exists
    if class_in.teacher_id is not None:
        teacher = db.query(User).filter(User.id == class_in.teacher_id).first()
        if not teacher:
            raise ValueError(f"Teacher with ID {class_in.teacher_id} not found")
        if teacher.role.value != "teacher":
            raise ValueError(f"User with ID {class_in.teacher_id} is not a teacher")
    
    # Create the new class
    db_class = Class(
        name=class_in.name,
        code=class_in.code,
        teacher_id=class_in.teacher_id
    )
    
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class


def get_class(db: Session, class_id: int) -> Optional[Class]:
    """
    Fetch a single class by its ID.
    
    Args:
        db: Database session
        class_id: ID of the class to fetch
        
    Returns:
        Class: The class object if found, None otherwise
    """
    return db.query(Class).filter(Class.id == class_id).first()


def get_classes(db: Session, skip: int = 0, limit: int = 100) -> List[Class]:
    """
    Fetch a list of all classes with pagination.
    
    Args:
        db: Database session
        skip: Number of classes to skip (for pagination)
        limit: Maximum number of classes to return
        
    Returns:
        List[Class]: List of class objects
    """
    return db.query(Class).offset(skip).limit(limit).all()


def update_class(db: Session, class_id: int, class_in: ClassCreate) -> Optional[Class]:
    """
    Update an existing class's name, code, or assigned teacher ID.
    
    Args:
        db: Database session
        class_id: ID of the class to update
        class_in: ClassCreate object containing updated class data
        
    Returns:
        Class: The updated class object if found, None otherwise
        
    Raises:
        ValueError: If class name or code already exists (excluding current class)
    """
    # Get the existing class
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return None
    
    # Check if class name already exists (excluding current class)
    existing_class_by_name = db.query(Class).filter(
        Class.name == class_in.name,
        Class.id != class_id
    ).first()
    if existing_class_by_name:
        raise ValueError(f"Class with name '{class_in.name}' already exists")
    
    # Check if class code already exists (excluding current class)
    existing_class_by_code = db.query(Class).filter(
        Class.code == class_in.code,
        Class.id != class_id
    ).first()
    if existing_class_by_code:
        raise ValueError(f"Class with code '{class_in.code}' already exists")
    
    # If teacher_id is provided, verify the teacher exists
    if class_in.teacher_id is not None:
        teacher = db.query(User).filter(User.id == class_in.teacher_id).first()
        if not teacher:
            raise ValueError(f"Teacher with ID {class_in.teacher_id} not found")
        if teacher.role.value != "teacher":
            raise ValueError(f"User with ID {class_in.teacher_id} is not a teacher")
    
    # Update the class fields
    db_class.name = class_in.name
    db_class.code = class_in.code
    db_class.teacher_id = class_in.teacher_id
    
    db.commit()
    db.refresh(db_class)
    return db_class


def delete_class(db: Session, class_id: int) -> bool:
    """
    Delete a class by its ID with cascading deletion.
    
    This function will automatically delete all related records:
    - Enrollments (students enrolled in the class)
    - Assignments (assignments for the class)
    - Schedules (schedules for the class)
    - ClassroomReports (reports for the class)
    
    Args:
        db: Database session
        class_id: ID of the class to delete
        
    Returns:
        bool: True if class was deleted, False if class not found
        
    Raises:
        Exception: If there are any errors during deletion
    """
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return False
    
    try:
        # Log the class being deleted for debugging
        print(f"Deleting class: {db_class.name} (ID: {db_class.id})")
        
        # With cascade="all, delete-orphan", this will automatically delete:
        # - All enrollments for this class
        # - All assignments for this class  
        # - All schedules for this class
        # - All classroom reports for this class
        db.delete(db_class)
        db.commit()
        
        print(f"Successfully deleted class: {db_class.name} and all related records")
        return True
        
    except Exception as e:
        db.rollback()
        error_msg = f"Cannot delete class '{db_class.name}' (ID: {class_id}): {str(e)}"
        print(f"Error deleting class: {error_msg}")
        
        # Provide more specific error information
        if "foreign key constraint" in str(e).lower():
            raise ValueError(f"Cannot delete class because it has related data that cannot be removed. Please ensure all related records are properly configured for cascade deletion. Error: {str(e)}")
        else:
            raise ValueError(f"Database error while deleting class: {str(e)}")


def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user by their ID with cascading deletion.
    
    Args:
        db: Database session
        user_id: ID of the user to delete
        
    Returns:
        bool: True if user was deleted, False if user not found
        
    Raises:
        ValueError: If there are foreign key constraints that prevent deletion
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return False
    
    try:
        # With cascade="all, delete-orphan", this should delete all related records
        db.delete(db_user)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        # If cascading deletion fails, provide a more specific error
        raise ValueError(f"Cannot delete user: {str(e)}")


def get_classes_by_teacher(db: Session, teacher_id: int, skip: int = 0, limit: int = 100) -> List[Class]:
    """
    Fetch all classes assigned to a specific teacher.
    
    Args:
        db: Database session
        teacher_id: ID of the teacher
        skip: Number of classes to skip (for pagination)
        limit: Maximum number of classes to return
        
    Returns:
        List[Class]: List of class objects assigned to the teacher
    """
    return db.query(Class).filter(Class.teacher_id == teacher_id).offset(skip).limit(limit).all()


def get_unassigned_classes(db: Session, skip: int = 0, limit: int = 100) -> List[Class]:
    """
    Fetch all classes that are not assigned to any teacher.
    
    Args:
        db: Database session
        skip: Number of classes to skip (for pagination)
        limit: Maximum number of classes to return
        
    Returns:
        List[Class]: List of unassigned class objects
    """
    return db.query(Class).filter(Class.teacher_id.is_(None)).offset(skip).limit(limit).all()


def search_classes(db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Class]:
    """
    Search classes by name or code.
    
    Args:
        db: Database session
        search_term: Term to search for in class name or code
        skip: Number of classes to skip (for pagination)
        limit: Maximum number of classes to return
        
    Returns:
        List[Class]: List of class objects matching the search term
    """
    return db.query(Class).filter(
        (Class.name.ilike(f"%{search_term}%")) | 
        (Class.code.ilike(f"%{search_term}%"))
    ).offset(skip).limit(limit).all()


def count_total_users(db: Session) -> int:
    """
    Count the total number of users in the users table.
    
    Args:
        db: Database session
        
    Returns:
        int: Total count of users
    """
    return db.query(User).count()


def count_total_classes(db: Session) -> int:
    """
    Count the total number of classes in the classes table.
    
    Args:
        db: Database session
        
    Returns:
        int: Total count of classes
    """
    return db.query(Class).count()


def get_all_users(db: Session) -> List[User]:
    """
    Fetch all users from the users table without pagination.
    
    Args:
        db: Database session
        
    Returns:
        List[User]: List of all user objects
    """
    return db.query(User).all()


def get_all_classes(db: Session) -> List[dict]:
    """
    Fetch all classes from the classes table without pagination.
    Uses forced dictionary conversion to bypass ORM serialization issues.
    
    Args:
        db: Database session
        
    Returns:
        List[dict]: List of class dictionaries with only necessary fields
    """
    # Fetch all classes using SQLAlchemy query
    classes = db.query(Class).all()
    
    # Convert to simple dictionaries with only necessary columns
    # This bypasses ORM relationship serialization issues
    class_dicts = []
    for class_obj in classes:
        class_dict = {
            'id': class_obj.id,
            'name': class_obj.name,
            'code': class_obj.code,
            'teacher_id': class_obj.teacher_id
        }
        class_dicts.append(class_dict)
    
    return class_dicts


def create_assignment(db: Session, assignment_in: AssignmentCreate, creator_id: int) -> Assignment:
    """
    Create a new assignment and save it to the database.
    
    Args:
        db: Database session
        assignment_in: AssignmentCreate object containing assignment data
        creator_id: ID of the user creating the assignment
        
    Returns:
        Assignment: The created assignment object
        
    Raises:
        ValueError: If class doesn't exist, creator is not authorized, or data is invalid
    """
    try:
        # Log the input data for debugging
        print(f"Creating assignment with data: name='{assignment_in.name}', description='{assignment_in.description}', class_id={assignment_in.class_id}, creator_id={creator_id}")
        
        # Enhanced data validation
        if not assignment_in.name or not assignment_in.name.strip():
            raise ValueError("Assignment name cannot be empty")
        
        if not isinstance(assignment_in.class_id, int) or assignment_in.class_id <= 0:
            raise ValueError("Class ID must be a positive integer")
        
        if not isinstance(creator_id, int) or creator_id <= 0:
            raise ValueError("Creator ID must be a positive integer")
        
        # Verify the class exists with enhanced error message
        class_obj = db.query(Class).filter(Class.id == assignment_in.class_id).first()
        if not class_obj:
            # Check if any classes exist at all
            total_classes = db.query(Class).count()
            if total_classes == 0:
                raise ValueError("No classes exist in the system. Please create a class first.")
            else:
                raise ValueError(f"Class with ID {assignment_in.class_id} not found. Please verify the class ID is correct.")
        
        print(f"Found class: {class_obj.name} (ID: {class_obj.id})")
        
        # Verify the creator exists and is a teacher or admin
        creator = db.query(User).filter(User.id == creator_id).first()
        if not creator:
            raise ValueError(f"User with ID {creator_id} not found")
        
        print(f"Found creator: {creator.username} (ID: {creator.id}, Role: {creator.role.value})")
        
        if creator.role.value not in ["teacher", "admin"]:
            raise ValueError(f"User with ID {creator_id} is not authorized to create assignments. Only teachers and admins can create assignments.")
        
        # Create the new assignment with enhanced validation
        try:
            db_assignment = Assignment(
                name=assignment_in.name.strip(),
                description=assignment_in.description.strip() if assignment_in.description else None,
                class_id=assignment_in.class_id,
                creator_id=creator_id
            )
            
            print(f"Created assignment object: {db_assignment}")
            
            db.add(db_assignment)
            db.commit()
            db.refresh(db_assignment)
            
            print(f"Successfully created assignment with ID: {db_assignment.id}")
            return db_assignment
            
        except Exception as db_error:
            db.rollback()
            print(f"Database error during assignment creation: {db_error}")
            print(f"Database error type: {type(db_error).__name__}")
            
            # Handle specific database constraint violations
            error_str = str(db_error).lower()
            if "foreign key constraint" in error_str or "fk_" in error_str:
                if "class_id" in error_str:
                    raise ValueError(f"Invalid Class ID: {assignment_in.class_id}. The class does not exist or has been deleted.")
                elif "creator_id" in error_str:
                    raise ValueError(f"Invalid Creator ID: {creator_id}. The user does not exist or has been deleted.")
                else:
                    raise ValueError(f"Database constraint violation: {db_error}")
            elif "not null" in error_str:
                raise ValueError("Required field is missing or null")
            elif "unique constraint" in error_str:
                raise ValueError("An assignment with this name already exists")
            else:
                raise ValueError(f"Database error: {db_error}")
        
    except ValueError as ve:
        # Re-raise ValueError as-is (these are our validation errors)
        print(f"Validation error in create_assignment: {ve}")
        db.rollback()
        raise ve
    except Exception as e:
        print(f"Unexpected error in create_assignment: {e}")
        print(f"Error type: {type(e).__name__}")
        db.rollback()
        raise ValueError(f"Failed to create assignment: {str(e)}")


def create_submission(db: Session, submission_in: SubmissionCreate, student_id: int = None) -> Submission:
    """
    Create a new submission and save it to the database.
    
    Args:
        db: Database session
        submission_in: SubmissionCreate object containing submission data
        student_id: Optional explicit student ID to use (overrides submission_in.student_id)
        
    Returns:
        Submission: The created submission object
        
    Raises:
        ValueError: If assignment or student doesn't exist, or student is not enrolled in the class
    """
    try:
        # Log the input data for debugging
        print(f"Creating submission with data: assignment_id={submission_in.assignment_id}, student_id={student_id}, time_spent={submission_in.time_spent_minutes}")
        
        # Use explicit student_id if provided, otherwise use the one from submission_in
        actual_student_id = student_id if student_id is not None else submission_in.student_id
        
        # Enhanced data validation
        if not isinstance(submission_in.assignment_id, int) or submission_in.assignment_id <= 0:
            raise ValueError("Assignment ID must be a positive integer")
        
        if not isinstance(actual_student_id, int) or actual_student_id <= 0:
            raise ValueError("Student ID must be a positive integer")
        
        if not isinstance(submission_in.time_spent_minutes, int) or submission_in.time_spent_minutes < 0:
            raise ValueError("Time spent must be a non-negative integer")
        
        # Verify the assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == submission_in.assignment_id).first()
        if not assignment:
            # Check if any assignments exist at all
            total_assignments = db.query(Assignment).count()
            if total_assignments == 0:
                raise ValueError("No assignments exist in the system. Please create an assignment first.")
            else:
                raise ValueError(f"Assignment with ID {submission_in.assignment_id} not found. Please verify the assignment ID is correct.")
        
        print(f"Found assignment: {assignment.name} (ID: {assignment.id})")
        
        # Verify the student exists and is a student
        student = db.query(User).filter(User.id == actual_student_id).first()
        if not student:
            raise ValueError(f"User with ID {actual_student_id} not found")
        
        print(f"Found student: {student.username} (ID: {student.id}, Role: {student.role.value})")
        
        if student.role.value != "student":
            raise ValueError(f"User with ID {actual_student_id} is not a student")
        
        # Verify the student is enrolled in the class that contains this assignment
        from models import Enrollment
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == actual_student_id,
            Enrollment.class_id == assignment.class_id
        ).first()
        
        if not enrollment:
            raise ValueError(f"Student with ID {actual_student_id} is not enrolled in the class for assignment {submission_in.assignment_id}")
        
        # Check if student has already submitted this assignment
        existing_submission = db.query(Submission).filter(
            Submission.assignment_id == submission_in.assignment_id,
            Submission.student_id == actual_student_id
        ).first()
        
        if existing_submission:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student has already submitted this assignment"
            )
        
        # Create the new submission with enhanced validation
        try:
            db_submission = Submission(
                assignment_id=submission_in.assignment_id,
                student_id=actual_student_id,
                time_spent_minutes=submission_in.time_spent_minutes
            )
            
            print(f"Created submission object: {db_submission}")
            
            db.add(db_submission)
            db.commit()
            db.refresh(db_submission)
            
            print(f"Successfully created submission with ID: {db_submission.id}")
            return db_submission
            
        except Exception as db_error:
            db.rollback()
            print(f"Database error during submission creation: {db_error}")
            print(f"Database error type: {type(db_error).__name__}")
            
            # Handle specific database constraint violations
            error_str = str(db_error).lower()
            if "foreign key constraint" in error_str or "fk_" in error_str:
                if "assignment_id" in error_str:
                    raise ValueError(f"Invalid Assignment ID: {submission_in.assignment_id}. The assignment does not exist or has been deleted.")
                elif "student_id" in error_str:
                    raise ValueError(f"Invalid Student ID: {actual_student_id}. The user does not exist or has been deleted.")
                else:
                    raise ValueError(f"Database constraint violation: {db_error}")
            elif "not null" in error_str:
                raise ValueError("Required field is missing or null")
            elif "unique constraint" in error_str:
                raise ValueError("A submission for this assignment already exists")
            else:
                raise ValueError(f"Database error: {db_error}")
        
    except ValueError as ve:
        # Re-raise ValueError as-is (these are our validation errors)
        print(f"Validation error in create_submission: {ve}")
        db.rollback()
        raise ve
    except Exception as e:
        print(f"Unexpected error in create_submission: {e}")
        print(f"Error type: {type(e).__name__}")
        db.rollback()
        raise ValueError(f"Failed to create submission: {str(e)}")


def get_student_classes_ids(db: Session, user_id: int) -> List[int]:
    """
    Get a list of Class IDs where the given user_id is a member (student).
    
    Args:
        db: Database session
        user_id: ID of the student user
        
    Returns:
        List[int]: List of class IDs where the student is enrolled
        
    Raises:
        ValueError: If user doesn't exist or is not a student
    """
    # Verify the user exists and is a student
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with ID {user_id} not found")
    
    if user.role.value != "student":
        raise ValueError(f"User with ID {user_id} is not a student")
    
    # Get all enrollments for this student
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == user_id).all()
    
    # Extract class IDs from enrollments
    class_ids = [enrollment.class_id for enrollment in enrollments]
    
    return class_ids


def get_assignments_for_student(db: Session, user_id: int) -> List[Assignment]:
    """
    Get all assignments associated with classes where the given user_id is a member (student).
    
    Args:
        db: Database session
        user_id: ID of the student user
        
    Returns:
        List[Assignment]: List of assignments for classes the student is enrolled in
        
    Raises:
        ValueError: If user doesn't exist or is not a student
    """
    # Get the student's class IDs
    class_ids = get_student_classes_ids(db, user_id)
    
    # If student is not enrolled in any classes, return empty list
    if not class_ids:
        return []
    
    # Get all assignments for the student's classes
    assignments = db.query(Assignment).filter(Assignment.class_id.in_(class_ids)).all()
    
    return assignments


def get_assignments(db: Session, skip: int = 0, limit: int = 100) -> List[Assignment]:
    """
    Get all assignments with pagination (for teachers and admins).
    
    Args:
        db: Database session
        skip: Number of assignments to skip (for pagination)
        limit: Maximum number of assignments to return
        
    Returns:
        List[Assignment]: List of assignment objects
    """
    return db.query(Assignment).offset(skip).limit(limit).all()


def get_assignments_by_teacher(db: Session, teacher_id: int, skip: int = 0, limit: int = 100) -> List[Assignment]:
    """
    Get all assignments created by a specific teacher.
    
    Args:
        db: Database session
        teacher_id: ID of the teacher
        skip: Number of assignments to skip (for pagination)
        limit: Maximum number of assignments to return
        
    Returns:
        List[Assignment]: List of assignment objects created by the teacher
    """
    return db.query(Assignment).filter(Assignment.creator_id == teacher_id).offset(skip).limit(limit).all()


# Schedule CRUD operations
def create_schedule(db: Session, schedule_in: ScheduleCreate) -> Schedule:
    """
    Create a new schedule entry.
    
    Args:
        db: Database session
        schedule_in: Schedule creation data
        
    Returns:
        Schedule: Created schedule object
        
    Raises:
        HTTPException: If class_id doesn't exist
    """
    # Validate that the class_id exists
    class_exists = db.query(Class).filter(Class.id == schedule_in.class_id).first()
    if not class_exists:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {schedule_in.class_id} not found. Please ensure the class exists before creating a schedule."
        )
    
    schedule = Schedule(**schedule_in.dict())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def get_schedules(db: Session, skip: int = 0, limit: int = 100) -> List[Schedule]:
    """
    Get all schedules with pagination.
    
    Args:
        db: Database session
        skip: Number of schedules to skip (for pagination)
        limit: Maximum number of schedules to return
        
    Returns:
        List[Schedule]: List of schedule objects
    """
    return db.query(Schedule).offset(skip).limit(limit).all()


def get_schedules_live(db: Session) -> List[Schedule]:
    """
    Get all schedules for live display with eager-loaded class and teacher data.
    
    Args:
        db: Database session
        
    Returns:
        List[Schedule]: List of schedule objects with class and teacher relationships loaded
    """
    from sqlalchemy.orm import joinedload
    
    return db.query(Schedule).options(
        joinedload(Schedule.class_).joinedload(Class.teacher)
    ).all()

def get_schedules_live_enriched(db: Session) -> List[dict]:
    """
    Get all schedules for live display with enriched class and teacher information.
    
    Args:
        db: Database session
        
    Returns:
        List[dict]: List of enriched schedule dictionaries with class and teacher details
    """
    from sqlalchemy.orm import joinedload
    
    schedules = db.query(Schedule).options(
        joinedload(Schedule.class_).joinedload(Class.teacher)
    ).all()
    
    enriched_schedules = []
    for schedule in schedules:
        # Get teacher information
        teacher_name = "Unknown Teacher"
        teacher_full_name = "Unknown Teacher"
        
        if schedule.class_ and schedule.class_.teacher:
            teacher = schedule.class_.teacher
            if teacher.first_name and teacher.last_name:
                teacher_full_name = f"{teacher.first_name} {teacher.last_name}"
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
            elif teacher.first_name:
                teacher_name = teacher.first_name
                teacher_full_name = teacher.first_name
            elif teacher.username:
                teacher_name = teacher.username
                teacher_full_name = teacher.username
        
        # Get class information
        class_name = schedule.class_.name if schedule.class_ else "Unknown Class"
        class_code = schedule.class_.code if schedule.class_ else "UNKNOWN"
        
        enriched_schedule = {
            "id": schedule.id,
            "class_id": schedule.class_id,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "room_number": schedule.room_number,
            "status": schedule.status,
            "class_name": class_name,
            "class_code": class_code,
            "teacher_name": teacher_name,
            "teacher_full_name": teacher_full_name
        }
        enriched_schedules.append(enriched_schedule)
    
    return enriched_schedules


def get_schedule(db: Session, schedule_id: int) -> Optional[Schedule]:
    """
    Get a specific schedule by ID.
    
    Args:
        db: Database session
        schedule_id: ID of the schedule
        
    Returns:
        Optional[Schedule]: Schedule object if found, None otherwise
    """
    return db.query(Schedule).filter(Schedule.id == schedule_id).first()


def update_schedule(db: Session, schedule_id: int, schedule_in: ScheduleCreate) -> Optional[Schedule]:
    """
    Update an existing schedule.
    
    Args:
        db: Database session
        schedule_id: ID of the schedule to update
        schedule_in: Updated schedule data
        
    Returns:
        Optional[Schedule]: Updated schedule object if found, None otherwise
        
    Raises:
        HTTPException: If class_id doesn't exist
    """
    # Validate that the class_id exists
    class_exists = db.query(Class).filter(Class.id == schedule_in.class_id).first()
    if not class_exists:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {schedule_in.class_id} not found. Please ensure the class exists before updating a schedule."
        )
    
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule:
        for key, value in schedule_in.dict().items():
            setattr(schedule, key, value)
        db.commit()
        db.refresh(schedule)
    return schedule


def delete_schedule(db: Session, schedule_id: int) -> bool:
    """
    Delete a schedule.
    
    Args:
        db: Database session
        schedule_id: ID of the schedule to delete
        
    Returns:
        bool: True if deleted, False if not found
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule:
        db.delete(schedule)
        db.commit()
        return True
    return False


# Announcement CRUD operations
def create_announcement(db: Session, announcement_in: AnnouncementCreate) -> Announcement:
    """
    Create a new announcement.
    
    Args:
        db: Database session
        announcement_in: Announcement creation data
        
    Returns:
        Announcement: Created announcement object
    """
    announcement = Announcement(**announcement_in.dict())
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def get_announcements(db: Session, skip: int = 0, limit: int = 100) -> List[Announcement]:
    """
    Get all announcements with pagination.
    
    Args:
        db: Database session
        skip: Number of announcements to skip (for pagination)
        limit: Maximum number of announcements to return
        
    Returns:
        List[Announcement]: List of announcement objects
    """
    return db.query(Announcement).order_by(Announcement.date_posted.desc()).offset(skip).limit(limit).all()


def get_announcements_live(db: Session) -> List[Announcement]:
    """
    Get all announcements for live display (no pagination, ordered by date).
    
    Args:
        db: Database session
        
    Returns:
        List[Announcement]: List of all announcement objects ordered by date
    """
    return db.query(Announcement).order_by(Announcement.date_posted.desc()).all()


def get_announcement(db: Session, announcement_id: int) -> Optional[Announcement]:
    """
    Get a specific announcement by ID.
    
    Args:
        db: Database session
        announcement_id: ID of the announcement
        
    Returns:
        Optional[Announcement]: Announcement object if found, None otherwise
    """
    return db.query(Announcement).filter(Announcement.id == announcement_id).first()


def update_announcement(db: Session, announcement_id: int, announcement_in: AnnouncementCreate) -> Optional[Announcement]:
    """
    Update an existing announcement.
    
    Args:
        db: Database session
        announcement_id: ID of the announcement to update
        announcement_in: Updated announcement data
        
    Returns:
        Optional[Announcement]: Updated announcement object if found, None otherwise
    """
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement:
        for key, value in announcement_in.dict().items():
            setattr(announcement, key, value)
        db.commit()
        db.refresh(announcement)
    return announcement


def delete_announcement(db: Session, announcement_id: int) -> bool:
    """
    Delete an announcement.
    
    Args:
        db: Database session
        announcement_id: ID of the announcement to delete
        
    Returns:
        bool: True if deleted, False if not found
    """
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement:
        db.delete(announcement)
        db.commit()
        return True
    return False


# Classroom Report CRUD operations
def create_classroom_report(db: Session, report_in: ClassroomReportCreate, reporter_id: int) -> ClassroomReport:
    """
    Create a new classroom report.
    
    Args:
        db: Database session
        report_in: ClassroomReportCreate object containing report data
        reporter_id: ID of the user creating the report
        
    Returns:
        ClassroomReport: The created report object
        
    Raises:
        ValueError: If class doesn't exist or reporter is not authorized
    """
    # Verify the class exists
    class_obj = db.query(Class).filter(Class.id == report_in.class_id).first()
    if not class_obj:
        raise ValueError(f"Class with ID {report_in.class_id} not found")
    
    # Verify the reporter exists
    reporter = db.query(User).filter(User.id == reporter_id).first()
    if not reporter:
        raise ValueError(f"User with ID {reporter_id} not found")
    
    # Create the new report
    db_report = ClassroomReport(
        class_id=report_in.class_id,
        reporter_id=reporter_id,
        is_clean_before=report_in.is_clean_before,
        is_clean_after=report_in.is_clean_after,
        report_text=report_in.report_text,
        photo_url=report_in.photo_url
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


def get_classroom_reports(db: Session, skip: int = 0, limit: int = 100) -> List[ClassroomReport]:
    """
    Get all classroom reports with pagination.
    
    Args:
        db: Database session
        skip: Number of reports to skip (for pagination)
        limit: Maximum number of reports to return
        
    Returns:
        List[ClassroomReport]: List of report objects
    """
    return db.query(ClassroomReport).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_reports_by_class(db: Session, class_id: int, skip: int = 0, limit: int = 100) -> List[ClassroomReport]:
    """
    Get classroom reports for a specific class.
    
    Args:
        db: Database session
        class_id: ID of the class
        skip: Number of reports to skip (for pagination)
        limit: Maximum number of reports to return
        
    Returns:
        List[ClassroomReport]: List of report objects for the class
    """
    return db.query(ClassroomReport).filter(ClassroomReport.class_id == class_id).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_reports_by_reporter(db: Session, reporter_id: int, skip: int = 0, limit: int = 100) -> List[ClassroomReport]:
    """
    Get classroom reports created by a specific user.
    
    Args:
        db: Database session
        reporter_id: ID of the reporter
        skip: Number of reports to skip (for pagination)
        limit: Maximum number of reports to return
        
    Returns:
        List[ClassroomReport]: List of report objects created by the user
    """
    return db.query(ClassroomReport).filter(ClassroomReport.reporter_id == reporter_id).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_report(db: Session, report_id: int) -> Optional[ClassroomReport]:
    """
    Get a specific classroom report by ID.
    
    Args:
        db: Database session
        report_id: ID of the report
        
    Returns:
        Optional[ClassroomReport]: Report object if found, None otherwise
    """
    return db.query(ClassroomReport).filter(ClassroomReport.id == report_id).first()


def delete_classroom_report(db: Session, report_id: int) -> bool:
    """
    Delete a classroom report.
    
    Args:
        db: Database session
        report_id: ID of the report to delete
        
    Returns:
        bool: True if deleted, False if not found
    """
    report = db.query(ClassroomReport).filter(ClassroomReport.id == report_id).first()
    if report:
        db.delete(report)
        db.commit()
        return True
    return False


# ====================================
# VIOLATION CRUD OPERATIONS
# ====================================

def create_violation(db: Session, violation_in: ViolationCreate) -> Violation:
    """
    Create a new violation record.
    
    Args:
        db: Database session
        violation_in: Violation creation data
        
    Returns:
        Violation: Created violation object
        
    Raises:
        ValueError: If student or assignment doesn't exist
    """
    # Verify student exists
    student = db.query(User).filter(User.id == violation_in.student_id).first()
    if not student:
        raise ValueError(f"Student with ID {violation_in.student_id} not found")
    
    # Verify assignment exists
    assignment = db.query(Assignment).filter(Assignment.id == violation_in.assignment_id).first()
    if not assignment:
        raise ValueError(f"Assignment with ID {violation_in.assignment_id} not found")
    
    # Create violation
    db_violation = Violation(
        student_id=violation_in.student_id,
        assignment_id=violation_in.assignment_id,
        violation_type=violation_in.violation_type,
        description=violation_in.description,
        time_away_seconds=violation_in.time_away_seconds,
        severity=violation_in.severity,
        content_added_during_absence=violation_in.content_added_during_absence,
        ai_similarity_score=violation_in.ai_similarity_score,
        paste_content_length=violation_in.paste_content_length,
        detected_at=datetime.utcnow()
    )
    
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)
    return db_violation


def get_violations(db: Session, skip: int = 0, limit: int = 100) -> List[Violation]:
    """
    Get all violations with pagination.
    
    Args:
        db: Database session
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[Violation]: List of violation objects
    """
    return db.query(Violation).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violation(db: Session, violation_id: int) -> Optional[Violation]:
    """
    Get a specific violation by ID.
    
    Args:
        db: Database session
        violation_id: ID of the violation
        
    Returns:
        Optional[Violation]: Violation object if found, None otherwise
    """
    return db.query(Violation).filter(Violation.id == violation_id).first()


def get_violations_by_assignment(db: Session, assignment_id: int, skip: int = 0, limit: int = 100) -> List[Violation]:
    """
    Get violations for a specific assignment.
    
    Args:
        db: Database session
        assignment_id: ID of the assignment
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[Violation]: List of violation objects for the assignment
    """
    return db.query(Violation).filter(
        Violation.assignment_id == assignment_id
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_student(db: Session, student_id: int, skip: int = 0, limit: int = 100) -> List[Violation]:
    """
    Get violations for a specific student.
    
    Args:
        db: Database session
        student_id: ID of the student
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[Violation]: List of violation objects for the student
    """
    return db.query(Violation).filter(
        Violation.student_id == student_id
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_student_and_assignment(db: Session, student_id: int, assignment_id: int) -> List[Violation]:
    """
    Get violations for a specific student in a specific assignment.
    
    Args:
        db: Database session
        student_id: ID of the student
        assignment_id: ID of the assignment
        
    Returns:
        List[Violation]: List of violation objects for the student in the assignment
    """
    return db.query(Violation).filter(
        Violation.student_id == student_id,
        Violation.assignment_id == assignment_id
    ).order_by(Violation.detected_at.desc()).all()


def get_violations_by_type(db: Session, violation_type: str, skip: int = 0, limit: int = 100) -> List[Violation]:
    """
    Get violations by type.
    
    Args:
        db: Database session
        violation_type: Type of violation
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[Violation]: List of violation objects of the specified type
    """
    return db.query(Violation).filter(
        Violation.violation_type == violation_type
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_severity(db: Session, severity: str, skip: int = 0, limit: int = 100) -> List[Violation]:
    """
    Get violations by severity level.
    
    Args:
        db: Database session
        severity: Severity level ('low', 'medium', 'high')
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[Violation]: List of violation objects with the specified severity
    """
    return db.query(Violation).filter(
        Violation.severity == severity
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def count_violations_by_assignment(db: Session, assignment_id: int) -> dict:
    """
    Count violations for a specific assignment by severity.
    
    Args:
        db: Database session
        assignment_id: ID of the assignment
        
    Returns:
        dict: Count of violations by severity level
    """
    violations = db.query(Violation).filter(
        Violation.assignment_id == assignment_id
    ).all()
    
    counts = {
        'total': len(violations),
        'low': len([v for v in violations if v.severity == 'low']),
        'medium': len([v for v in violations if v.severity == 'medium']),
        'high': len([v for v in violations if v.severity == 'high'])
    }
    
    return counts


def count_violations_by_student(db: Session, student_id: int) -> dict:
    """
    Count violations for a specific student by severity.
    
    Args:
        db: Database session
        student_id: ID of the student
        
    Returns:
        dict: Count of violations by severity level
    """
    violations = db.query(Violation).filter(
        Violation.student_id == student_id
    ).all()
    
    counts = {
        'total': len(violations),
        'low': len([v for v in violations if v.severity == 'low']),
        'medium': len([v for v in violations if v.severity == 'medium']),
        'high': len([v for v in violations if v.severity == 'high'])
    }
    
    return counts


def get_violation_summary_for_assignment(db: Session, assignment_id: int) -> dict:
    """
    Get comprehensive violation summary for an assignment.
    
    Args:
        db: Database session
        assignment_id: ID of the assignment
        
    Returns:
        dict: Violation summary including counts, types, and student data
    """
    # Get assignment
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise ValueError(f"Assignment with ID {assignment_id} not found")
    
    # Get all violations for this assignment
    violations = get_violations_by_assignment(db, assignment_id, skip=0, limit=1000)
    
    # Get all submissions for this assignment
    submissions = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    
    # Count violations by type
    violation_types = {}
    for violation in violations:
        if violation.violation_type not in violation_types:
            violation_types[violation.violation_type] = 0
        violation_types[violation.violation_type] += 1
    
    # Count violations by severity
    severity_counts = {
        'low': 0,
        'medium': 0,
        'high': 0
    }
    for violation in violations:
        severity_counts[violation.severity] += 1
    
    # Get unique students with violations
    student_ids_with_violations = list(set([v.student_id for v in violations]))
    
    # Get student details
    students_with_violations = []
    for student_id in student_ids_with_violations:
        student = db.query(User).filter(User.id == student_id).first()
        if student:
            student_violations = get_violations_by_student_and_assignment(db, student_id, assignment_id)
            students_with_violations.append({
                'student_id': student_id,
                'student_name': f"{student.first_name or ''} {student.last_name or ''}".strip() or student.username,
                'violation_count': len(student_violations),
                'severity_breakdown': {
                    'low': len([v for v in student_violations if v.severity == 'low']),
                    'medium': len([v for v in student_violations if v.severity == 'medium']),
                    'high': len([v for v in student_violations if v.severity == 'high'])
                }
            })
    
    # Calculate average time away
    total_time_away = sum(v.time_away_seconds for v in violations)
    avg_time_away = total_time_away / len(violations) if violations else 0
    
    return {
        'assignment_id': assignment_id,
        'assignment_name': assignment.name,
        'class_id': assignment.class_id,
        'class_name': assignment.class_.name if assignment.class_ else 'Unknown',
        'total_violations': len(violations),
        'violations_by_type': violation_types,
        'violations_by_severity': severity_counts,
        'students_with_violations': len(student_ids_with_violations),
        'total_students': len(submissions),
        'average_time_away_seconds': round(avg_time_away, 2),
        'student_details': students_with_violations,
        'violations': violations
    }


def update_violation(db: Session, violation_id: int, violation_in: ViolationCreate) -> Optional[Violation]:
    """
    Update an existing violation.
    
    Args:
        db: Database session
        violation_id: ID of the violation to update
        violation_in: Updated violation data
        
    Returns:
        Optional[Violation]: Updated violation object if found, None otherwise
    """
    violation = db.query(Violation).filter(Violation.id == violation_id).first()
    if not violation:
        return None
    
    # Update fields
    for key, value in violation_in.dict().items():
        setattr(violation, key, value)
    
    db.commit()
    db.refresh(violation)
    return violation


def delete_violation(db: Session, violation_id: int) -> bool:
    """
    Delete a violation.
    
    Args:
        db: Database session
        violation_id: ID of the violation to delete
        
    Returns:
        bool: True if deleted, False if not found
    """
    violation = db.query(Violation).filter(Violation.id == violation_id).first()
    if not violation:
        return False
    
    db.delete(violation)
    db.commit()
    return True


def get_violations_with_student_info(db: Session, skip: int = 0, limit: int = 100) -> List[dict]:
    """
    Get violations with student information.
    
    Args:
        db: Database session
        skip: Number of violations to skip (for pagination)
        limit: Maximum number of violations to return
        
    Returns:
        List[dict]: List of violation objects with enriched student information
    """
    from sqlalchemy.orm import joinedload
    
    violations = db.query(Violation).options(
        joinedload(Violation.student)
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()
    
    enriched_violations = []
    for violation in violations:
        student = violation.student
        student_name = student.username
        if student.first_name and student.last_name:
            student_name = f"{student.first_name} {student.last_name}"
        elif student.first_name:
            student_name = student.first_name
        elif student.last_name:
            student_name = student.last_name
        
        enriched_violations.append({
            'id': violation.id,
            'student_id': violation.student_id,
            'student_name': student_name,
            'assignment_id': violation.assignment_id,
            'violation_type': violation.violation_type,
            'description': violation.description,
            'detected_at': violation.detected_at,
            'time_away_seconds': violation.time_away_seconds,
            'severity': violation.severity,
            'content_added_during_absence': violation.content_added_during_absence,
            'ai_similarity_score': violation.ai_similarity_score,
            'paste_content_length': violation.paste_content_length
        })
    
    return enriched_violations


def get_assignment_violations_with_student_info(db: Session, assignment_id: int) -> List[dict]:
    """
    Get violations for an assignment with student information.
    
    Args:
        db: Database session
        assignment_id: ID of the assignment
        
    Returns:
        List[dict]: List of violation objects with enriched student information
    """
    from sqlalchemy.orm import joinedload
    
    violations = db.query(Violation).options(
        joinedload(Violation.student)
    ).filter(
        Violation.assignment_id == assignment_id
    ).order_by(Violation.detected_at.desc()).all()
    
    # Get assignment info
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    assignment_name = assignment.name if assignment else f"Assignment {assignment_id}"
    
    # Get class info
    class_name = "Unknown Class"
    if assignment and assignment.class_:
        class_name = assignment.class_.name
    
    enriched_violations = []
    for violation in violations:
        student = violation.student
        student_name = student.username
        if student.first_name and student.last_name:
            student_name = f"{student.first_name} {student.last_name}"
        elif student.first_name:
            student_name = student.first_name
        elif student.last_name:
            student_name = student.last_name
        
        enriched_violations.append({
            'id': violation.id,
            'student_id': violation.student_id,
            'student_name': student_name,
            'assignment_id': violation.assignment_id,
            'assignment_name': assignment_name,
            'class_name': class_name,
            'violation_type': violation.violation_type,
            'description': violation.description,
            'detected_at': violation.detected_at,
            'time_away_seconds': violation.time_away_seconds,
            'severity': violation.severity,
            'content_added_during_absence': violation.content_added_during_absence,
            'ai_similarity_score': violation.ai_similarity_score,
            'paste_content_length': violation.paste_content_length
        })
    
    return enriched_violations


# Password change CRUD operations
def change_user_password(db: Session, user_id: int, current_password: str, new_password: str) -> bool:
    """
    Change a user's password with secure verification.
    
    Args:
        db: Database session
        user_id: ID of the user changing password
        current_password: Current password to verify
        new_password: New password to set
        
    Returns:
        bool: True if password changed successfully, False otherwise
        
    Raises:
        ValueError: If current password is incorrect or user not found
    """
    from security import verify_password, get_password_hash
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    # Verify the current password
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    
    # Hash the new password
    new_hashed_password = get_password_hash(new_password)
    
    # Update the user's password
    user.hashed_password = new_hashed_password
    
    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update password: {str(e)}")


# User profile CRUD operations
def update_user_profile(db: Session, user_id: int, update_data: dict) -> User:
    """
    Update user profile information.
    
    Args:
        db: Database session
        user_id: ID of the user to update
        update_data: Dictionary containing fields to update
        
    Returns:
        User: The updated user object
        
    Raises:
        ValueError: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    # Update only provided fields
    for field, value in update_data.items():
        if hasattr(user, field) and value is not None:
            setattr(user, field, value)
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update user profile: {str(e)}")


def update_user_profile_picture(db: Session, user_id: int, profile_picture_url: str) -> User:
    """
    Update user's profile picture URL.
    
    Args:
        db: Database session
        user_id: ID of the user to update
        profile_picture_url: URL of the profile picture
        
    Returns:
        User: The updated user object
        
    Raises:
        ValueError: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    user.profile_picture_url = profile_picture_url
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update profile picture: {str(e)}")