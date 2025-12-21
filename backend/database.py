import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file
load_dotenv()

# Get database URL from environment variable (with default fallback)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:allen14@localhost/classtrack_db"
)

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for declarative models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Migration function to add missing columns
def run_migrations():
    """
    Run database migrations to add missing columns to existing tables.
    This is safe to run multiple times as it uses IF NOT EXISTS.
    """
    migration_sql = [
        # Add missing columns to submissions table
        """
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS content TEXT,
        ADD COLUMN IF NOT EXISTS file_path VARCHAR(255),
        ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS link_url VARCHAR(255),
        ADD COLUMN IF NOT EXISTS feedback TEXT;
        """,
        
        # Change time_spent_minutes to FLOAT if needed
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'submissions' 
                AND column_name = 'time_spent_minutes'
                AND data_type = 'integer'
            ) THEN
                ALTER TABLE submissions 
                ALTER COLUMN time_spent_minutes TYPE FLOAT;
            END IF;
        END $$;
        """,
        
        # Create violations table if not exists
        """
        CREATE TABLE IF NOT EXISTS violations (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES users(id),
            assignment_id INTEGER NOT NULL REFERENCES assignments(id),
            violation_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            time_away_seconds INTEGER NOT NULL,
            severity VARCHAR(20) NOT NULL,
            content_added_during_absence INTEGER,
            ai_similarity_score FLOAT,
            paste_content_length INTEGER
        );
        """,
        
        # Add created_at to classes if not exists
        """
        ALTER TABLE classes 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        """,
        
        # Add description to classes if not exists
        """
        ALTER TABLE classes 
        ADD COLUMN IF NOT EXISTS description TEXT;
        """,
        
        # Add due_date to assignments if not exists
        """
        ALTER TABLE assignments 
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
        """,
        
        # Add enrolled_at to enrollments if not exists
        """
        ALTER TABLE enrollments 
        ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        """,
        
        # Add author_id to announcements if not exists
        """
        ALTER TABLE announcements 
        ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id);
        """
    ]
    
    try:
        with engine.connect() as conn:
            for sql in migration_sql:
                conn.execute(text(sql))
                conn.commit()
            print("✅ Database migrations completed successfully!")
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        raise

# Check if we need to run migrations
def check_and_run_migrations():
    """
    Check if the submissions table has the new columns, if not run migrations.
    """
    try:
        with engine.connect() as conn:
            # Check if content column exists in submissions
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'submissions' 
                AND column_name = 'content'
            """))
            
            if not result.fetchone():
                print("⚠️  Database schema outdated, running migrations...")
                run_migrations()
            else:
                print("✅ Database schema is up to date")
    except Exception as e:
        print(f"❌ Error checking database schema: {e}")
        # Table might not exist yet, which is OK
        pass

# Function to recreate all tables (WARNING: Drops all data!)
def recreate_tables():
    """
    Drops and recreates all tables. Use with caution!
    """
    print("⚠️  WARNING: This will DROP ALL TABLES and recreate them!")
    confirmation = input("Type 'YES' to continue: ")
    
    if confirmation == 'YES':
        try:
            Base.metadata.drop_all(bind=engine)
            print("✅ Dropped all tables")
            
            Base.metadata.create_all(bind=engine)
            print("✅ Created all tables with new schema")
        except Exception as e:
            print(f"❌ Error recreating tables: {e}")
    else:
        print("❌ Cancelled")