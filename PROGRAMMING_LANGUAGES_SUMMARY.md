# Programming Languages & Technologies Used in ClassTrack

## 📊 Overview

ClassTrack uses a **multi-language, full-stack architecture** combining server-side Python, client-side TypeScript/JavaScript, database SQL, and styling with CSS/Tailwind.

---

## 🔧 Backend Languages

### 1. **Python 3.x**
**Role**: Primary backend programming language

**Summary**:
Python serves as the core backend language, powering the FastAPI web framework and all server-side business logic.

**Key Features Used**:
- ✅ **Object-Oriented Programming**: Classes for models, schemas, and business logic
- ✅ **Type Hints**: Type annotations for better code quality (`def get_user(id: int) -> User:`)
- ✅ **Async/Await**: Asynchronous operations for file uploads (`async def upload_profile_photo()`)
- ✅ **Context Managers**: Resource management (`@asynccontextmanager`, `with` statements)
- ✅ **Enums**: Type-safe constants (`UserRole.ADMIN`, `UserRole.TEACHER`, `UserRole.STUDENT`)
- ✅ **Decorators**: FastAPI route decorators (`@app.get()`, `@app.post()`)
- ✅ **List Comprehensions**: Data transformation
- ✅ **Dictionary Operations**: Data manipulation and JSON handling
- ✅ **Exception Handling**: Try-except blocks for error management
- ✅ **Module System**: Import/export for code organization

**Usage in System**:
- FastAPI application (`main.py`)
- Database models (`models.py`)
- Business logic (`crud.py`)
- Security functions (`security.py`)
- Database configuration (`database.py`)
- Data validation schemas (`schemas.py`)

**Libraries & Frameworks**:
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (validation)
- PyJWT (JWT tokens)
- python-dotenv (environment variables)
- aiofiles (async file operations)
- Alembic (database migrations)

---

### 2. **SQL (PostgreSQL)**
**Role**: Database query language and schema definition

**Summary**:
PostgreSQL SQL is used for all database operations, schema definitions, and data queries through SQLAlchemy ORM.

**Key Features Used**:
- ✅ **DDL (Data Definition Language)**: Table creation, constraints, indexes
- ✅ **DML (Data Manipulation Language)**: INSERT, UPDATE, DELETE, SELECT
- ✅ **Foreign Key Constraints**: Referential integrity
- ✅ **Unique Constraints**: Data uniqueness enforcement
- ✅ **Indexes**: Performance optimization
- ✅ **Transactions**: ACID compliance
- ✅ **Data Types**: INTEGER, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, ENUM
- ✅ **Joins**: INNER JOIN, LEFT JOIN for relationship queries
- ✅ **Aggregations**: COUNT, SUM, AVG for analytics
- ✅ **Subqueries**: Complex data retrieval

**Usage in System**:
- Table definitions (via SQLAlchemy)
- Relationship definitions (foreign keys)
- Query operations (via ORM)
- Database migrations (via Alembic)
- Data integrity constraints

**Database Objects**:
- 8 tables (users, classes, enrollments, assignments, submissions, schedules, announcements, classroom_reports)
- Multiple foreign key relationships
- Unique constraints on usernames, class codes
- Indexes on frequently queried fields

---

## 🎨 Frontend Languages

### 3. **TypeScript**
**Role**: Type-safe JavaScript for frontend development

**Summary**:
TypeScript provides static typing for JavaScript, enabling better code quality, IDE support, and catching errors at compile-time.

**Key Features Used**:
- ✅ **Type Annotations**: Explicit types (`const user: User = {...}`)
- ✅ **Interfaces**: Data structure definitions (`interface Assignment { id: number; ... }`)
- ✅ **Type Inference**: Automatic type detection
- ✅ **Generic Types**: Reusable type definitions (`Array<User>`)
- ✅ **Union Types**: Multiple possible types (`string | number`)
- ✅ **Optional Properties**: Nullable fields (`description?: string`)
- ✅ **Type Guards**: Runtime type checking
- ✅ **Enums**: Type-safe constants
- ✅ **Type Assertions**: Explicit type casting
- ✅ **Module System**: ES6 imports/exports with types

**Usage in System**:
- All React components (`.tsx` files)
- API service definitions (`authService.ts`)
- Context providers (`UserContext.tsx`, `SystemStatusContext.tsx`)
- Type definitions for API responses
- Props and state type definitions

**Benefits**:
- Compile-time error detection
- Better IDE autocomplete
- Improved code maintainability
- Self-documenting code
- Refactoring safety

---

### 4. **JavaScript (ES6+)**
**Role**: Runtime language for React and browser execution

**Summary**:
Modern JavaScript (ES6+) powers the React frontend, providing the runtime environment and language features.

**Key Features Used**:
- ✅ **Arrow Functions**: Concise function syntax (`() => {}`)
- ✅ **Destructuring**: Object/array unpacking (`const { id, name } = user`)
- ✅ **Template Literals**: String interpolation (`` `${name}` ``)
- ✅ **Promises**: Asynchronous operations
- ✅ **Async/Await**: Modern async syntax
- ✅ **Modules**: ES6 import/export
- ✅ **Spread Operator**: Array/object expansion (`[...items]`)
- ✅ **Optional Chaining**: Safe property access (`user?.name`)
- ✅ **Nullish Coalescing**: Default values (`name ?? 'Unknown'`)
- ✅ **Array Methods**: map, filter, reduce, forEach
- ✅ **Object Methods**: Object.keys(), Object.values()
- ✅ **Classes**: ES6 class syntax (though React prefers functions)

**Usage in System**:
- React component logic
- Event handlers
- API calls (Axios)
- State management
- Utility functions
- Browser API interactions

**Modern Features**:
- ES2020+ syntax
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Dynamic imports
- Top-level await (in modules)

---

### 5. **JSX/TSX**
**Role**: React component syntax extension

**Summary**:
JSX (JavaScript XML) and TSX (TypeScript XML) allow writing HTML-like syntax in JavaScript/TypeScript for React components.

**Key Features Used**:
- ✅ **Component Syntax**: HTML-like tags (`<Button>Click</Button>`)
- ✅ **Props Passing**: Component attributes (`<UserCard name="John" />`)
- ✅ **Event Handling**: Inline handlers (`onClick={() => handleClick()}`)
- ✅ **Conditional Rendering**: Ternary operators (`{isLoggedIn ? <Dashboard /> : <Login />}`)
- ✅ **List Rendering**: Map over arrays (`{items.map(item => <Item key={item.id} />)}`)
- ✅ **Fragment Syntax**: Grouping (`<>...</>` or `<React.Fragment>`)
- ✅ **JSX Expressions**: Embedding JavaScript (`{user.name}`)
- ✅ **Component Composition**: Nesting components
- ✅ **Self-Closing Tags**: `<img />`, `<input />`
- ✅ **Dynamic Attributes**: Spread props (`<Component {...props} />`)

**Usage in System**:
- All React components
- Page components
- UI components
- Form components
- Layout components

**Example**:
```tsx
const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="card">
      <h2>{user.name}</h2>
      {user.role === 'admin' && <AdminBadge />}
    </div>
  );
};
```

---

## 🎨 Styling Languages

### 6. **CSS3**
**Role**: Cascading Style Sheets for visual styling

**Summary**:
CSS3 provides the foundation for styling, with Tailwind CSS providing utility classes built on top of it.

**Key Features Used**:
- ✅ **Selectors**: Class, ID, element selectors
- ✅ **Flexbox**: Layout system (`display: flex`)
- ✅ **Grid**: Advanced layouts (`display: grid`)
- ✅ **Media Queries**: Responsive design (`@media (max-width: 768px)`)
- ✅ **Custom Properties**: CSS variables (`--primary-color: #10B981`)
- ✅ **Animations**: Transitions and keyframes
- ✅ **Pseudo-classes**: `:hover`, `:focus`, `:active`
- ✅ **Box Model**: Margin, padding, border
- ✅ **Positioning**: Relative, absolute, fixed
- ✅ **Typography**: Font families, sizes, weights

**Usage in System**:
- Global styles (`index.css`)
- Component-specific styles
- Custom CSS for complex layouts
- Animation definitions
- Responsive breakpoints

---

### 7. **Tailwind CSS 4.x**
**Role**: Utility-first CSS framework

**Summary**:
Tailwind CSS provides utility classes for rapid UI development, eliminating the need for custom CSS in most cases.

**Key Features Used**:
- ✅ **Utility Classes**: Pre-built styles (`bg-blue-500`, `text-center`)
- ✅ **Responsive Prefixes**: Breakpoint modifiers (`md:text-lg`, `lg:flex`)
- ✅ **State Variants**: Hover, focus, active (`hover:bg-blue-600`)
- ✅ **Custom Colors**: Theme customization
- ✅ **Spacing System**: Consistent spacing (`p-4`, `m-2`, `gap-6`)
- ✅ **Typography**: Text utilities (`text-xl`, `font-bold`)
- ✅ **Layout Utilities**: Flexbox, Grid (`flex`, `grid`, `items-center`)
- ✅ **Component Classes**: Reusable component styles
- ✅ **Dark Mode**: Dark mode support (if configured)
- ✅ **JIT Mode**: Just-in-time compilation

**Usage in System**:
- All component styling
- Layout definitions
- Responsive design
- Color schemes
- Spacing and sizing
- Typography

**Example**:
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
</div>
```

---

## 🛠️ Configuration & Build Languages

### 8. **JSON**
**Role**: Configuration and data format

**Summary**:
JSON is used for configuration files, package management, and API data exchange.

**Key Features Used**:
- ✅ **Object Notation**: Key-value pairs
- ✅ **Arrays**: List structures
- ✅ **Nested Structures**: Objects within objects
- ✅ **Data Types**: Strings, numbers, booleans, null
- ✅ **No Comments**: Pure data format

**Usage in System**:
- `package.json` (Node.js dependencies)
- `tsconfig.json` (TypeScript configuration)
- `tailwind.config.ts` (Tailwind configuration - TypeScript format)
- API request/response bodies
- Environment configuration

---

### 9. **YAML/INI**
**Role**: Configuration file formats

**Summary**:
YAML and INI formats are used for various configuration files in the project.

**Key Features Used**:
- ✅ **Key-Value Pairs**: Configuration settings
- ✅ **Sections**: Grouped settings (`[alembic]`)
- ✅ **Comments**: Documentation in config files
- ✅ **Hierarchical Structure**: Nested configurations

**Usage in System**:
- `alembic.ini` (Database migration configuration)
- `.env` files (Environment variables - if used)
- Build tool configurations

---

## 📦 Markup Languages

### 10. **HTML5**
**Role**: Document structure

**Summary**:
HTML5 provides the base structure for the React application.

**Key Features Used**:
- ✅ **Semantic Elements**: `<header>`, `<main>`, `<section>`, `<article>`
- ✅ **Form Elements**: `<input>`, `<select>`, `<textarea>`, `<button>`
- ✅ **Meta Tags**: SEO and viewport configuration
- ✅ **Accessibility**: ARIA attributes
- ✅ **Script/Link Tags**: Resource loading

**Usage in System**:
- `index.html` (React app entry point)
- Rendered by React components
- Form structures
- Document metadata

---

### 11. **Markdown**
**Role**: Documentation format

**Summary**:
Markdown is used for documentation files (like this one).

**Key Features Used**:
- ✅ **Headers**: `#`, `##`, `###`
- ✅ **Lists**: Ordered and unordered
- ✅ **Code Blocks**: Syntax highlighting
- ✅ **Links**: `[text](url)`
- ✅ **Tables**: Data presentation
- ✅ **Emphasis**: Bold, italic

**Usage in System**:
- README files
- Documentation
- Code comments (in some contexts)

---

## 🔄 Template Languages

### 12. **Mako Templates** (Alembic)
**Role**: Database migration template language

**Summary**:
Mako is used by Alembic for generating database migration scripts.

**Key Features Used**:
- ✅ **Template Syntax**: `${variable}` interpolation
- ✅ **Control Flow**: Conditionals and loops
- ✅ **Python Integration**: Embedded Python code

**Usage in System**:
- Alembic migration script generation
- `script.py.mako` template file

---

## 📊 Language Usage Statistics

### By Lines of Code (Estimated)
1. **TypeScript/TSX**: ~60% (Frontend components)
2. **Python**: ~30% (Backend logic)
3. **CSS/Tailwind**: ~5% (Styling)
4. **SQL**: ~3% (Database queries via ORM)
5. **Configuration Files**: ~2% (JSON, YAML, INI)

### By Functionality
- **Backend Logic**: Python
- **Frontend Logic**: TypeScript/JavaScript
- **Styling**: Tailwind CSS + CSS3
- **Database**: SQL (via SQLAlchemy)
- **Configuration**: JSON, YAML, INI
- **Documentation**: Markdown

---

## 🎯 Language Integration Points

### Backend ↔ Frontend
- **API Communication**: JSON format
- **Authentication**: JWT tokens (Python generates, TypeScript consumes)
- **Data Validation**: Pydantic (Python) ↔ TypeScript interfaces

### Frontend ↔ Database
- **Indirect**: Through FastAPI backend
- **Data Flow**: Database → SQLAlchemy → FastAPI → JSON → TypeScript

### Build Process
- **TypeScript** → Compiled to JavaScript
- **JSX/TSX** → Transpiled to React.createElement()
- **Tailwind CSS** → Compiled to CSS
- **Python** → Interpreted at runtime

---

## 🚀 Modern Language Features Highlighted

### Python 3.x
- Type hints for better IDE support
- Async/await for non-blocking operations
- Dataclasses (via Pydantic)
- Enum classes for type safety

### TypeScript
- Strict type checking
- Interface definitions
- Generic types
- Union types for flexibility

### JavaScript ES6+
- Modern async/await syntax
- Optional chaining and nullish coalescing
- Arrow functions
- Template literals

### CSS3
- Flexbox and Grid layouts
- CSS custom properties
- Media queries for responsive design
- Modern animations

---

## 📚 Summary

**ClassTrack** uses **12+ programming languages and technologies** working together:

1. **Python** - Backend server logic
2. **SQL (PostgreSQL)** - Database operations
3. **TypeScript** - Type-safe frontend
4. **JavaScript (ES6+)** - Frontend runtime
5. **JSX/TSX** - React component syntax
6. **CSS3** - Base styling
7. **Tailwind CSS** - Utility-first styling
8. **JSON** - Configuration and data
9. **YAML/INI** - Configuration files
10. **HTML5** - Document structure
11. **Markdown** - Documentation
12. **Mako** - Migration templates

Each language serves a specific purpose in the full-stack architecture, creating a modern, type-safe, and maintainable codebase.

---

**Document Version**: 1.0  
**Last Updated**: 2024
