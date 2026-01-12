from sqlalchemy.orm import Session
from models import Class, ClassCreate, User, Assignment, AssignmentCreate, Submission, Enrollment, Schedule, ScheduleCreate, Announcement, AnnouncementCreate, ClassroomReport, ClassroomReportCreate, Violation, ViolationCreate
from schemas import SubmissionCreate
from typing import Optional, List
from datetime import datetime


def create_class(db: Session, class_in: ClassCreate) -> Class:
    # Check if class name or code already exists
    existing_class_by_name = db.query(Class).filter(Class.name == class_in.name).first()
    if existing_class_by_name:
        raise ValueError(f"Class with name '{class_in.name}' already exists")
    
    existing_class_by_code = db.query(Class).filter(Class.code == class_in.code).first()
    if existing_class_by_code:
        raise ValueError(f"Class with code '{class_in.code}' already exists")
    
    # Verify teacher exists and is a teacher
    if class_in.teacher_id is not None:
        teacher = db.query(User).filter(User.id == class_in.teacher_id).first()
        if not teacher:
            raise ValueError(f"Teacher with ID {class_in.teacher_id} not found")
        if teacher.role.value != "teacher":
            raise ValueError(f"User with ID {class_in.teacher_id} is not a teacher")
    
    # Create new class
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
    return db.query(Class).filter(Class.id == class_id).first()


def get_classes(db: Session, skip: int = 0, limit: int = 100) -> List[Class]:
    return db.query(Class).offset(skip).limit(limit).all()


def update_class(db: Session, class_id: int, class_in: ClassCreate) -> Optional[Class]:
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return None
    
    # Check for duplicate name (excluding current class)
    existing_class_by_name = db.query(Class).filter(
        Class.name == class_in.name,
        Class.id != class_id
    ).first()
    if existing_class_by_name:
        raise ValueError(f"Class with name '{class_in.name}' already exists")
    
    # Check for duplicate code (excluding current class)
    existing_class_by_code = db.query(Class).filter(
        Class.code == class_in.code,
        Class.id != class_id
    ).first()
    if existing_class_by_code:
        raise ValueError(f"Class with code '{class_in.code}' already exists")
    
    # Verify teacher if provided
    if class_in.teacher_id is not None:
        teacher = db.query(User).filter(User.id == class_in.teacher_id).first()
        if not teacher:
            raise ValueError(f"Teacher with ID {class_in.teacher_id} not found")
        if teacher.role.value != "teacher":
            raise ValueError(f"User with ID {class_in.teacher_id} is not a teacher")
    
    # Update class fields
    db_class.name = class_in.name
    db_class.code = class_in.code
    db_class.teacher_id = class_in.teacher_id
    
    db.commit()
    db.refresh(db_class)
    return db_class


def delete_class(db: Session, class_id: int) -> bool:
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return False
    
    try:
        # Cascade deletion will handle related records
        db.delete(db_class)
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        # Foreign key constraint error
        if "foreign key constraint" in str(e).lower():
            raise ValueError(f"Cannot delete class because it has related data that cannot be removed. Please ensure all related records are properly configured for cascade deletion. Error: {str(e)}")
        else:
            raise ValueError(f"Database error while deleting class: {str(e)}")


def delete_user(db: Session, user_id: int) -> bool:
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return False
    
    try:
        # Cascade deletion will handle related records
        db.delete(db_user)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise ValueError(f"Cannot delete user: {str(e)}")


def get_classes_by_teacher(db: Session, teacher_id: int, skip: int = 0, limit: int = 100) -> List[Class]:
    return db.query(Class).filter(Class.teacher_id == teacher_id).offset(skip).limit(limit).all()


def get_unassigned_classes(db: Session, skip: int = 0, limit: int = 100) -> List[Class]:
    return db.query(Class).filter(Class.teacher_id.is_(None)).offset(skip).limit(limit).all()


def search_classes(db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Class]:
    return db.query(Class).filter(
        (Class.name.ilike(f"%{search_term}%")) | 
        (Class.code.ilike(f"%{search_term}%"))
    ).offset(skip).limit(limit).all()


def count_total_users(db: Session) -> int:
    return db.query(User).count()


def count_total_classes(db: Session) -> int:
    return db.query(Class).count()


def get_all_users(db: Session) -> List[User]:
    return db.query(User).all()


def get_all_classes(db: Session) -> List[dict]:
    # Convert to dictionaries to bypass ORM serialization issues
    classes = db.query(Class).all()
    
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
    try:
        # Enhanced data validation
        if not assignment_in.name or not assignment_in.name.strip():
            raise ValueError("Assignment name cannot be empty")
        
        if not isinstance(assignment_in.class_id, int) or assignment_in.class_id <= 0:
            raise ValueError("Class ID must be a positive integer")
        
        if not isinstance(creator_id, int) or creator_id <= 0:
            raise ValueError("Creator ID must be a positive integer")
        
        # Verify class exists
        class_obj = db.query(Class).filter(Class.id == assignment_in.class_id).first()
        if not class_obj:
            total_classes = db.query(Class).count()
            if total_classes == 0:
                raise ValueError("No classes exist in the system. Please create a class first.")
            else:
                raise ValueError(f"Class with ID {assignment_in.class_id} not found. Please verify the class ID is correct.")
        
        # Verify creator exists and is authorized
        creator = db.query(User).filter(User.id == creator_id).first()
        if not creator:
            raise ValueError(f"User with ID {creator_id} not found")
        
        if creator.role.value not in ["teacher", "admin"]:
            raise ValueError(f"User with ID {creator_id} is not authorized to create assignments. Only teachers and admins can create assignments.")
        
        # Create assignment
        db_assignment = Assignment(
            name=assignment_in.name.strip(),
            description=assignment_in.description.strip() if assignment_in.description else None,
            class_id=assignment_in.class_id,
            creator_id=creator_id
        )
        
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        return db_assignment
        
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create assignment: {str(e)}")


def create_submission(db: Session, submission_in: SubmissionCreate, student_id: int = None) -> Submission:
    try:
        # Use explicit student_id if provided
        actual_student_id = student_id if student_id is not None else submission_in.student_id
        
        # Enhanced data validation
        if not isinstance(submission_in.assignment_id, int) or submission_in.assignment_id <= 0:
            raise ValueError("Assignment ID must be a positive integer")
        
        if not isinstance(actual_student_id, int) or actual_student_id <= 0:
            raise ValueError("Student ID must be a positive integer")
        
        if not isinstance(submission_in.time_spent_minutes, int) or submission_in.time_spent_minutes < 0:
            raise ValueError("Time spent must be a non-negative integer")
        
        # Verify assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == submission_in.assignment_id).first()
        if not assignment:
            total_assignments = db.query(Assignment).count()
            if total_assignments == 0:
                raise ValueError("No assignments exist in the system. Please create an assignment first.")
            else:
                raise ValueError(f"Assignment with ID {submission_in.assignment_id} not found. Please verify the assignment ID is correct.")
        
        # Verify student exists and is a student
        student = db.query(User).filter(User.id == actual_student_id).first()
        if not student:
            raise ValueError(f"User with ID {actual_student_id} not found")
        
        if student.role.value != "student":
            raise ValueError(f"User with ID {actual_student_id} is not a student")
        
        # Verify student is enrolled in the class
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == actual_student_id,
            Enrollment.class_id == assignment.class_id
        ).first()
        
        if not enrollment:
            raise ValueError(f"Student with ID {actual_student_id} is not enrolled in the class for assignment {submission_in.assignment_id}")
        
        # Check for duplicate submission
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
        
        # Create submission
        db_submission = Submission(
            assignment_id=submission_in.assignment_id,
            student_id=actual_student_id,
            time_spent_minutes=submission_in.time_spent_minutes
        )
        
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        return db_submission
        
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create submission: {str(e)}")


def get_student_classes_ids(db: Session, user_id: int) -> List[int]:
    # Verify user exists and is a student
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with ID {user_id} not found")
    
    if user.role.value != "student":
        raise ValueError(f"User with ID {user_id} is not a student")
    
    # Get all enrollments for this student
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == user_id).all()
    
    # Extract class IDs
    class_ids = [enrollment.class_id for enrollment in enrollments]
    
    return class_ids


def get_assignments_for_student(db: Session, user_id: int) -> List[Assignment]:
    # Get student's class IDs
    class_ids = get_student_classes_ids(db, user_id)
    
    # Return empty list if not enrolled in any classes
    if not class_ids:
        return []
    
    # Get assignments for student's classes
    assignments = db.query(Assignment).filter(Assignment.class_id.in_(class_ids)).all()
    
    return assignments


def get_assignments(db: Session, skip: int = 0, limit: int = 100) -> List[Assignment]:
    return db.query(Assignment).offset(skip).limit(limit).all()


def get_assignments_by_teacher(db: Session, teacher_id: int, skip: int = 0, limit: int = 100) -> List[Assignment]:
    return db.query(Assignment).filter(Assignment.creator_id == teacher_id).offset(skip).limit(limit).all()


# Schedule CRUD operations
def create_schedule(db: Session, schedule_in: ScheduleCreate) -> Schedule:
    # Validate class exists
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
    return db.query(Schedule).offset(skip).limit(limit).all()


def get_schedules_live(db: Session) -> List[Schedule]:
    from sqlalchemy.orm import joinedload
    
    return db.query(Schedule).options(
        joinedload(Schedule.class_).joinedload(Class.teacher)
    ).all()


def get_schedules_live_enriched(db: Session) -> List[dict]:
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
    return db.query(Schedule).filter(Schedule.id == schedule_id).first()


def update_schedule(db: Session, schedule_id: int, schedule_in: ScheduleCreate) -> Optional[Schedule]:
    # Validate class exists
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
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule:
        db.delete(schedule)
        db.commit()
        return True
    return False


# Announcement CRUD operations
def create_announcement(db: Session, announcement_in: AnnouncementCreate) -> Announcement:
    announcement = Announcement(**announcement_in.dict())
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def get_announcements(db: Session, skip: int = 0, limit: int = 100) -> List[Announcement]:
    return db.query(Announcement).order_by(Announcement.date_posted.desc()).offset(skip).limit(limit).all()


def get_announcements_live(db: Session) -> List[Announcement]:
    return db.query(Announcement).order_by(Announcement.date_posted.desc()).all()


def get_announcement(db: Session, announcement_id: int) -> Optional[Announcement]:
    return db.query(Announcement).filter(Announcement.id == announcement_id).first()


def update_announcement(db: Session, announcement_id: int, announcement_in: AnnouncementCreate) -> Optional[Announcement]:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement:
        for key, value in announcement_in.dict().items():
            setattr(announcement, key, value)
        db.commit()
        db.refresh(announcement)
    return announcement


def delete_announcement(db: Session, announcement_id: int) -> bool:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement:
        db.delete(announcement)
        db.commit()
        return True
    return False


# Classroom Report CRUD operations
def create_classroom_report(db: Session, report_in: ClassroomReportCreate, reporter_id: int) -> ClassroomReport:
    # Verify class exists
    class_obj = db.query(Class).filter(Class.id == report_in.class_id).first()
    if not class_obj:
        raise ValueError(f"Class with ID {report_in.class_id} not found")
    
    # Verify reporter exists
    reporter = db.query(User).filter(User.id == reporter_id).first()
    if not reporter:
        raise ValueError(f"User with ID {reporter_id} not found")
    
    # Create report
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
    return db.query(ClassroomReport).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_reports_by_class(db: Session, class_id: int, skip: int = 0, limit: int = 100) -> List[ClassroomReport]:
    return db.query(ClassroomReport).filter(ClassroomReport.class_id == class_id).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_reports_by_reporter(db: Session, reporter_id: int, skip: int = 0, limit: int = 100) -> List[ClassroomReport]:
    return db.query(ClassroomReport).filter(ClassroomReport.reporter_id == reporter_id).order_by(ClassroomReport.created_at.desc()).offset(skip).limit(limit).all()


def get_classroom_report(db: Session, report_id: int) -> Optional[ClassroomReport]:
    return db.query(ClassroomReport).filter(ClassroomReport.id == report_id).first()


def delete_classroom_report(db: Session, report_id: int) -> bool:
    report = db.query(ClassroomReport).filter(ClassroomReport.id == report_id).first()
    if report:
        db.delete(report)
        db.commit()
        return True
    return False


# VIOLATION CRUD OPERATIONS
def create_violation(db: Session, violation_in: ViolationCreate) -> Violation:
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
    return db.query(Violation).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violation(db: Session, violation_id: int) -> Optional[Violation]:
    return db.query(Violation).filter(Violation.id == violation_id).first()


def get_violations_by_assignment(db: Session, assignment_id: int, skip: int = 0, limit: int = 100) -> List[Violation]:
    return db.query(Violation).filter(
        Violation.assignment_id == assignment_id
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_student(db: Session, student_id: int, skip: int = 0, limit: int = 100) -> List[Violation]:
    return db.query(Violation).filter(
        Violation.student_id == student_id
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_student_and_assignment(db: Session, student_id: int, assignment_id: int) -> List[Violation]:
    return db.query(Violation).filter(
        Violation.student_id == student_id,
        Violation.assignment_id == assignment_id
    ).order_by(Violation.detected_at.desc()).all()


def get_violations_by_type(db: Session, violation_type: str, skip: int = 0, limit: int = 100) -> List[Violation]:
    return db.query(Violation).filter(
        Violation.violation_type == violation_type
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def get_violations_by_severity(db: Session, severity: str, skip: int = 0, limit: int = 100) -> List[Violation]:
    return db.query(Violation).filter(
        Violation.severity == severity
    ).order_by(Violation.detected_at.desc()).offset(skip).limit(limit).all()


def count_violations_by_assignment(db: Session, assignment_id: int) -> dict:
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
    violation = db.query(Violation).filter(Violation.id == violation_id).first()
    if not violation:
        return False
    
    db.delete(violation)
    db.commit()
    return True


def get_violations_with_student_info(db: Session, skip: int = 0, limit: int = 100) -> List[dict]:
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
    from security import verify_password, get_password_hash
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    # Verify current password
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    
    # Hash new password
    new_hashed_password = get_password_hash(new_password)
    
    # Update password
    user.hashed_password = new_hashed_password
    
    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update password: {str(e)}")


# User profile CRUD operations
def update_user_profile(db: Session, user_id: int, update_data: dict) -> User:
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