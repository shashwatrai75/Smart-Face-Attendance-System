# Data model and ERD (Smart Face Attendance)

This document is the source of truth for MongoDB collections, relationships, and how class attendance differs from department (employee) flows.

## Actor types

| Actor | Storage | Notes |
|--------|---------|--------|
| **superadmin**, **admin**, **member**, **hr** | `User.role` | Only `User` documents authenticate via `/api/auth`. |
| **Student** | `Student` collection | Class roster; face images for recognition. Not a login unless a `User` is linked. |
| **Optional link** | `User.linkedStudentId` → `Student` | Optional (e.g. guardian/student portal). Most students have **no** `User`. |

## Two domain flows (do not merge mentally)

1. **Class / academic attendance** — sections with `sectionType: 'class'`: `Student`, `ClassSession`, `Attendance`, `AttendanceSession`.
2. **Department / employee** — sections with `sectionType: 'department'`: `User`, `CheckInRecord`, `DepartmentFaceEnrollment` (embedding-based recognition for staff in that department).

---

## Entity relationship diagram

```mermaid
erDiagram
  User {
    ObjectId _id PK
    string role "superadmin | admin | member | hr"
    string status "active | disabled"
    ObjectId linkedStudentId FK "optional"
    ObjectId sectionId FK "optional default section"
  }

  Student {
    ObjectId _id PK
    ObjectId sectionId FK
    string rollNo
  }

  Section {
    ObjectId _id PK
    string sectionType "class | department"
    ObjectId parentSectionId FK "optional"
    boolean hasSubclasses
  }

  SectionMember {
    ObjectId _id PK
    ObjectId sectionId FK
    ObjectId userId FK
  }

  ClassSession {
    ObjectId _id PK
    ObjectId sectionId FK
    ObjectId teacherId FK
  }

  AttendanceSession {
    ObjectId _id PK
    string sessionId UK "business session id not Mongo _id"
    ObjectId sectionId FK
    ObjectId classSessionId FK "optional"
    ObjectId lecturerId FK
    string date "YYYY-MM-DD"
  }

  Attendance {
    ObjectId _id PK
    ObjectId studentId FK
    ObjectId sectionId FK
    ObjectId lecturerId FK
    ObjectId classSessionId FK "optional"
    string date
  }

  CheckInRecord {
    ObjectId _id PK
    ObjectId userId FK
    ObjectId sectionId FK
    string date
  }

  DepartmentFaceEnrollment {
    ObjectId _id PK
    ObjectId userId FK
    ObjectId sectionId FK
    buffer faceEmbeddingEnc
  }

  AuditLog {
    ObjectId _id PK
    ObjectId actorUserId FK
    string action
    mixed metadata
  }

  SystemSettings {
    ObjectId _id PK
    string key UK
    mixed value
  }

  User ||--o| Student : "linkedStudentId optional"
  User }o--o| Section : "sectionId optional"
  Student }|--|| Section : "sectionId"
  Section }o--o| Section : "parentSectionId"
  SectionMember }|--|| Section : "sectionId"
  SectionMember }|--|| User : "userId"
  ClassSession }|--|| Section : "sectionId"
  ClassSession }|--|| User : "teacherId"
  AttendanceSession }|--|| Section : "sectionId"
  AttendanceSession }o--o| ClassSession : "classSessionId"
  AttendanceSession }|--|| User : "lecturerId"
  Attendance }|--|| Student : "studentId"
  Attendance }|--|| Section : "sectionId"
  Attendance }|--|| User : "lecturerId"
  Attendance }o--o| ClassSession : "classSessionId"
  CheckInRecord }|--|| User : "userId"
  CheckInRecord }|--|| Section : "sectionId"
  DepartmentFaceEnrollment }|--|| User : "userId"
  DepartmentFaceEnrollment }|--|| Section : "sectionId"
  AuditLog }|--|| User : "actorUserId"
```

### `AttendanceSession` fields (common diagram mistake)

- **`_id`**: MongoDB primary key.
- **`sessionId`**: separate **string**, unique business identifier for the roll-call session (not a duplicate of `sectionId`).
- **`sectionId`**: single reference to `Section` (ObjectId).

---

## Collection ↔ file map

| Collection | Model file |
|------------|------------|
| `users` | `backend/models/User.js` |
| `students` | `backend/models/Student.js` |
| `sections` | `backend/models/Section.js` |
| `sectionmembers` | `backend/models/SectionMember.js` |
| `classsessions` | `backend/models/ClassSession.js` |
| `attendances` | `backend/models/Attendance.js` |
| `attendancesessions` | `backend/models/AttendanceSession.js` |
| `checkinrecords` | `backend/models/CheckInRecord.js` |
| `departmentfaceenrollments` | `backend/models/DepartmentFaceEnrollment.js` |
| `auditlogs` | `backend/models/AuditLog.js` |
| `systemsettings` | `backend/models/SystemSettings.js` |

---

## Indexes worth knowing

- `Student`: unique `(rollNo, sectionId)`.
- `SectionMember`: unique `(sectionId, userId)`.
- `Attendance`: uniqueness rules on `(studentId, classSessionId, date)` and legacy `(studentId, sectionId, date, sessionId)` (sparse).
- `CheckInRecord`: unique `(userId, sectionId, date)`.
- `DepartmentFaceEnrollment`: unique `(userId, sectionId)`.

---

## API access by role (summary)

See route files under `backend/routes/` for exact paths. In short:

- **superadmin**: `/api/superadmin/*`, plus broad access elsewhere where authorized.
- **admin** + **superadmin**: most user/section/student admin APIs.
- **member**: class sessions, attendance, students (enroll/list), reports.
- **hr**: employee enroll, section members, check-in, reports; not attendance session routes as currently restricted.

Face HTTP APIs: `/api/face/enroll`, `/api/face/verify` (authenticated; see `face.routes.js`).
