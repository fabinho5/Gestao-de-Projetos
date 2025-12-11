# Work Plan for the Next Weeks (done on 04/12/2025)

## Week 1 – Preparation and Technical Design
**Backend**
- Define main API endpoints
- Choose base project structure and libraries
- Identify integration requirements (mobile ↔ API ↔ DB)

**Database**
- Model the database (entities, keys, relations)
- Create final ER diagram

**Frontend**
- Create wireframes/mockups
- Define navigation structure
- Identify main components

**Testing**
- Define initial test plan
- Select API testing tools

---

## Week 2 – Infrastructure and Base Modules
**Backend**
- Implement authentication (JWT) and RBAC
- Create controller + routes structure
- Setup logging system
- Connect backend to MariaDB

**Database**
- Create initial seed data
- Deploy first schema version

**Frontend**
- Implement base UI and navigation
- Build reusable components
- Connect UI to mock API

**Testing**
- Initial unit tests for authentication

---

## Week 3 – Core Features
**Backend**
- CRUD for users, categories, subcategories, pieces
- Image upload support

**Database**
- Adjust entities as needed
- Implement triggers if required

**Frontend**
- Implement screens for login, catalog, item details
- Connect to real API
- Add loaders and error handling

**Testing**
- Unit tests for CRUD endpoints
- Begin FE ↔ BE integration tests

---

## Week 4 – Stock, Movements and Reservations
**Backend**
- Implement stock management (in/out/reserve/return)
- Implement reservations module
- WhatsApp integration

**Database**
- Create movement tables
- Add indexes for performance

**Frontend**
- Implement reservation screens
- Implement stock update workflows

**Testing**
- Full integration tests
- DB consistency tests

---

## Week 5 – Reports, Search and Dashboards
**Backend**
- Advanced search + filters
- Dashboard endpoints
- Detailed logs

**Frontend**
- Integrate search + filters
- Build dashboard views
- Improve UI/UX

**Testing**
- Performance testing
- Usability testing

---

## Week 6 – Final Testing, Bug Fixing and Delivery
**Backend**
- Fix bugs
- Optimize SQL queries
- Final security review

**Frontend**
- UI fixes
- Validate main flows
- Prepare build for demo

**Testing**
- Acceptance tests with client
- Bug report creation
- Validate final build
