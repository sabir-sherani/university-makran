# Database Schema Overview

## Collections Structure

### Department
```javascript
{
  _id: ObjectId,
  name: String,           // "Department of Science"
  head: String,          // Department head name
  description: String,   // Department description
  facilities: [String],  // List of facilities
  createdAt: Date,
  updatedAt: Date
}
```

### Program
```javascript
{
  _id: ObjectId,
  category: String,        // "Arts" | "Science" | etc
  duration: String,        // "2 Years" | "4 Years"
  subjects: [String],      // ["Physics", "Chemistry", ...]
  departmentId: ObjectId,  // Reference to department
  createdAt: Date,
  updatedAt: Date
}
```

### Facility
```javascript
{
  _id: ObjectId,
  name: String,           // "Physics Laboratory"
  description: String,    // Facility description
  features: [String],     // ["Spectrometers", "Oscilloscopes", ...]
  departmentId: ObjectId, // Reference to department
  createdAt: Date,
  updatedAt: Date
}
```

### Student
```javascript
{
  _id: ObjectId,
  studentId: String,       // Unique: "2023-001"
  name: String,
  email: String,          // Unique
  phone: String,
  password: String,       // Hashed
  program: String,
  semester: Number,
  cgpa: Number,
  enrolledCourses: [String],
  status: String,         // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Employee
```javascript
{
  _id: ObjectId,
  empId: String,          // Unique: "EMP-2020-001"
  name: String,
  email: String,          // Unique
  phone: String,
  password: String,       // Hashed
  designation: String,    // "Professor" | "Lecturer" | etc
  department: String,
  courses: [String],
  status: String,         // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Admission
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  phone: String,
  program: String,        // "Arts" | "Science"
  qualifications: String,
  status: String,         // "pending" | "approved" | "rejected"
  createdAt: Date,
  updatedAt: Date
}
```

### Feedback
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  category: String,       // "academic" | "facilities" | "services" | etc
  feedback: String,
  rating: Number,         // 1-10
  status: String,         // "received" | "reviewed"
  createdAt: Date,
  updatedAt: Date
```

### Degree
```javascript
{
  _id: ObjectId,
  degreeId: String,       // Unique: "UMP-2024-001"
  studentName: String,
  program: String,
  degree: String,         // "Bachelor of Science"
  graduationDate: Date,
  verified: Boolean,
  institution: String,    // "University of Makran, Panjgur"
  createdAt: Date,
  updatedAt: Date
}
```

### Contact
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  status: String,         // "new" | "read" | "replied"
  createdAt: Date,
  updatedAt: Date
}
```

## Database Setup

### Using MongoDB Locally
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Create database: `university_makran`

### Using MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update MONGO_URI in backend/.env

### Seeding Initial Data
Use admin dashboard or direct MongoDB operations to add:
- 4 Departments
- 6 Programs
- 6 Facilities

## Indexes (Recommended)

For production, create these indexes for better performance:

```javascript
// Student indexes
db.students.createIndex({ studentId: 1 }, { unique: true })
db.students.createIndex({ email: 1 }, { unique: true })

// Employee indexes
db.employees.createIndex({ empId: 1 }, { unique: true })
db.employees.createIndex({ email: 1 }, { unique: true })

// Degree indexes
db.degrees.createIndex({ degreeId: 1 }, { unique: true })

// Admission indexes
db.admissions.createIndex({ email: 1 })
db.admissions.createIndex({ status: 1 })

// Feedback indexes
db.feedbacks.createIndex({ email: 1 })
db.feedbacks.createIndex({ category: 1 })
```

## Backup & Recovery

### Backup MongoDB
```bash
mongodump --db university_makran --out ./backups
```

### Restore MongoDB
```bash
mongorestore ./backups
```
