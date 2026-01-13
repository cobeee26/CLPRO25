import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:Jacob26@localhost/postgres"
)

# Create SQLAlchemy engine with connection pooling and error handling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=300,    # Recycle connections after 5 minutes
    echo=False            # Set to True for SQL query logging
)

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
    # Migration SQL commands
    migration_sql = [
        # Add missing columns to submissions table
        # FIXED: PostgreSQL requires separate ALTER TABLE statements for each column
        """
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS content TEXT;
        """,
        """
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
        """,
        """
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
        """,
        """
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS link_url VARCHAR(255);
        """,
        """
        ALTER TABLE submissions 
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
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
            violation_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            time_away_seconds INTEGER NOT NULL,
            severity VARCHAR(20) NOT NULL,
            content_added_during_absence INTEGER,
            ai_similarity_score FLOAT,
            paste_content_length INTEGER,
            CONSTRAINT fk_violation_student FOREIGN KEY (student_id) REFERENCES users(id),
            CONSTRAINT fk_violation_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id)
        );
        """,
        
        # Create indexes for faster queries
        """
        CREATE INDEX IF NOT EXISTS idx_violations_student_id ON violations(student_id);
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_violations_assignment_id ON violations(assignment_id);
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_violations_detected_at ON violations(detected_at);
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
        """,
        
        # Add email to users table if not exists
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        """,
        
        # Add unique constraint to violations (optional)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints 
                WHERE table_name = 'violations' 
                AND constraint_name = 'unique_violation_per_student_assignment'
            ) THEN
                ALTER TABLE violations 
                ADD CONSTRAINT unique_violation_per_student_assignment 
                UNIQUE (student_id, assignment_id, violation_type, detected_at);
            END IF;
        END $$;
        """
    ]
    
    try:
        with engine.connect() as conn:
            print("🔄 Running database migrations...")
            for i, sql in enumerate(migration_sql, 1):
                print(f"  [{i}/{len(migration_sql)}] Executing migration...")
                conn.execute(text(sql))
                conn.commit()
            print("✅ Database migrations completed successfully!")
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        raise

# Check if we need to run migrations - FIXED TO CHECK VIOLATIONS TABLE
def check_and_run_migrations():
    """
    Check if the violations table exists, if not run migrations.
    """
    try:
        with engine.connect() as conn:
            needs_migration = False
            
            # Check if violations table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'violations'
                );
            """))
            
            table_exists = result.scalar()
            
            if not table_exists:
                print("⚠️  Violations table not found, running migrations...")
                run_migrations()
                return
            
            # Also check if violations table has required columns
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'violations' 
                AND column_name IN ('student_id', 'assignment_id', 'violation_type')
            """))
            
            columns = result.fetchall()
            
            if len(columns) < 3:
                print("⚠️  Violations table missing required columns, running migrations...")
                run_migrations()
            else:
                print("✅ Database schema is up to date")
                
    except Exception as e:
        print(f"❌ Error checking database schema: {e}")
        print("⚠️  Running migrations due to error...")
        run_migrations()

# Function to recreate all tables (WARNING: Drops all data!)
def recreate_tables():
    print("⚠️  WARNING: This will DROP ALL TABLES and recreate them!")
    print("⚠️  ALL DATA WILL BE LOST!")
    confirmation = input("Type 'YES-DROP-ALL' to continue: ")
    
    if confirmation == 'YES-DROP-ALL':
        try:
            print("🔄 Dropping all tables...")
            Base.metadata.drop_all(bind=engine)
            print("✅ Dropped all tables")
            
            print("🔄 Creating all tables with new schema...")
            Base.metadata.create_all(bind=engine)
            print("✅ Created all tables with new schema")
            
            print("🔄 Running migrations for additional columns...")
            run_migrations()
            print("✅ Database setup complete!")
        except Exception as e:
            print(f"❌ Error recreating tables: {e}")
    else:
        print("❌ Operation cancelled")

# Function to reset violations table only (safer)
def reset_violations_table():
    print("⚠️  WARNING: This will reset the violations table!")
    confirmation = input("Type 'RESET-VIOLATIONS' to continue: ")
    
    if confirmation == 'RESET-VIOLATIONS':
        try:
            with engine.connect() as conn:
                print("🔄 Dropping violations table...")
                conn.execute(text("DROP TABLE IF EXISTS violations CASCADE;"))
                conn.commit()
                print("✅ Dropped violations table")
                
                print("🔄 Recreating violations table...")
                conn.execute(text("""
                    CREATE TABLE violations (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
                        violation_type VARCHAR(50) NOT NULL,
                        description TEXT NOT NULL,
                        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        time_away_seconds INTEGER NOT NULL,
                        severity VARCHAR(20) NOT NULL,
                        content_added_during_absence INTEGER,
                        ai_similarity_score FLOAT,
                        paste_content_length INTEGER,
                        CONSTRAINT fk_violation_student FOREIGN KEY (student_id) REFERENCES users(id),
                        CONSTRAINT fk_violation_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id)
                    );
                """))
                
                # Create indexes
                conn.execute(text("CREATE INDEX idx_violations_student_id ON violations(student_id);"))
                conn.execute(text("CREATE INDEX idx_violations_assignment_id ON violations(assignment_id);"))
                conn.execute(text("CREATE INDEX idx_violations_detected_at ON violations(detected_at);"))
                
                conn.commit()
                print("✅ Violations table recreated successfully")
                
        except Exception as e:
            print(f"❌ Error resetting violations table: {e}")
    else:
        print("❌ Operation cancelled")

# Function to check database connection
def check_database_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Database connection successful")
            return True
    except Exception as e:
        error_str = str(e).lower()
        if "password authentication failed" in error_str:
            print(f"❌ Database connection failed: Password authentication failed")
            print("   Please check your PostgreSQL password in database.py or .env file")
        elif "does not exist" in error_str or "database" in error_str:
            print(f"❌ Database connection failed: Database does not exist")
            print("   Please create the database: CREATE DATABASE postgres;")
        else:
            print(f"❌ Database connection failed: {e}")
        return False

# Function to create database if it doesn't exist
def create_database_if_not_exists():
    """
    Try to create the database if it doesn't exist.
    This connects to the default 'postgres' database first.
    """
    import re
    from sqlalchemy import create_engine as create_engine_sql
    
    # Parse the DATABASE_URL to get components
    db_url = DATABASE_URL
    # Extract database name from URL
    db_match = re.search(r'/([^/?]+)(?:\?|$)', db_url)
    if not db_match:
        print("❌ Could not parse database name from DATABASE_URL")
        return False
    
    db_name = db_match.group(1)
    
    # Create connection URL to default 'postgres' database
    postgres_url = re.sub(r'/([^/?]+)(?:\?|$)', '/postgres', db_url)
    
    try:
        # Connect to default postgres database
        postgres_engine = create_engine_sql(postgres_url)
        with postgres_engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"""
                SELECT 1 FROM pg_database WHERE datname = '{db_name}'
            """))
            exists = result.first() is not None
            
            if not exists:
                # Create the database
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                conn.commit()
                print(f"✅ Created database '{db_name}'")
                return True
            else:
                print(f"✅ Database '{db_name}' already exists")
                return True
    except Exception as e:
        print(f"⚠️  Could not create database automatically: {e}")
        print(f"   Please create it manually: CREATE DATABASE {db_name};")
        return False

# Function to list all tables
def list_tables():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """))
            
            tables = result.fetchall()
            print("📋 Database Tables:")
            for table in tables:
                print(f"  - {table[0]}")
            return tables
    except Exception as e:
        print(f"❌ Error listing tables: {e}")
        return []

# Function to describe violations table
def describe_violations_table():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'violations' 
                ORDER BY ordinal_position;
            """))
            
            columns = result.fetchall()
            print("📋 Violations Table Structure:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} {'(NULL)' if col[2] == 'YES' else '(NOT NULL)'} {f'DEFAULT {col[3]}' if col[3] else ''}")
            return columns
    except Exception as e:
        print(f"❌ Error describing violations table: {e}")
        return []

# Function to check for missing foreign keys
def check_foreign_keys():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                ORDER BY tc.table_name, kcu.column_name;
            """))
            
            foreign_keys = result.fetchall()
            print("🔗 Foreign Keys:")
            for fk in foreign_keys:
                print(f"  - {fk[0]}.{fk[1]} → {fk[2]}.{fk[3]}")
            return foreign_keys
    except Exception as e:
        print(f"❌ Error checking foreign keys: {e}")
        return []

# Function to get violations count
def get_violations_count():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM violations;"))
            count = result.scalar()
            print(f"📊 Total violations in database: {count}")
            return count
    except Exception as e:
        print(f"❌ Error getting violations count: {e}")
        return 0

# Quick test function
def test_database_setup():
    print("🧪 Testing database setup...")
    
    # Test connection
    if not check_database_connection():
        return False
    
    # List tables
    tables = list_tables()
    
    # Check if violations table exists
    table_names = [table[0] for table in tables]
    if 'violations' not in table_names:
        print("❌ Violations table not found!")
        return False
    
    # Describe violations table
    describe_violations_table()
    
    # Check foreign keys
    check_foreign_keys()
    
    # Get violations count
    get_violations_count()
    
    print("✅ Database test completed successfully!")
    return True

# If this file is run directly
if __name__ == "__main__":
    print("🚀 Database Configuration Script")
    print("=" * 50)
    
    # Hide password in display
    display_url = DATABASE_URL.replace('allen14', '******')
    print(f"📊 Database URL: {display_url}")
    
    # Check connection
    check_database_connection()
    
    # List tables
    list_tables()
    
    # Check and run migrations if needed
    check_and_run_migrations()
    
    print("\n🛠️  Available commands:")
    print("  1. recreate_tables() - Drops and recreates ALL tables (DANGEROUS!)")
    print("  2. reset_violations_table() - Resets only violations table")
    print("  3. test_database_setup() - Runs complete database test")
    print("  4. check_and_run_migrations() - Check and run migrations")