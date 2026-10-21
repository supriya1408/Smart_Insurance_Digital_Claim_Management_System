# Smart Insurance Claim Management System (SICMS)

Full-stack web application: **Spring Boot 3 REST API** + **plain HTML / CSS / JavaScript frontend**.

>  "The frontend is static files that Spring Boot serves directly"
> so the whole application runs from one command on **http://localhost:8080**.

---

## 1. Prerequisites
| Tool | Version | Notes |
|---|---|---|
| JDK | 17 or newer | IntelliJ's bundled JDK 17+ is fine |
| Maven | 3.8+ | IntelliJ's bundled Maven is fine |
| Browser | Edge / Chrome / Firefox | |

## 2. Run it

### Option A – IntelliJ IDEA (recommended)
1. **File → Open** → select the `backend` folder (the one with `pom.xml`) → *Open as Project*.
2. Wait for Maven to download dependencies (bottom-right progress bar).
3. Open `src/main/java/com/sicms/SicmsApplication.java` → click the green ▶ **Run**.
4. Open **http://localhost:8080** in your browser.

### Option B – Command line
```bat
cd backend
mvn spring-boot:run
```
or double-click **`run.bat`** (Windows) / run `./run.sh` (macOS / Linux) from the project root.

### Option C – Build a single runnable JAR
```bat
cd backend
mvn clean package -DskipTests
java -jar target\smart-insurance-claim-management-system-1.0.0.jar
```

## 3. Demo accounts (password for all: `Password@123`)
| Role | Email |
|---|---|
| Customer | customer@sicms.com (also customer2@sicms.com) |
| Agent | agent@sicms.com |
| Claims Officer | officer@sicms.com (also officer2@sicms.com) |
| Admin | admin@sicms.com |

The login page has one-click buttons for each demo account.

## 4. Useful URLs
| What | URL |
|---|---|
| Application | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| H2 console | http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:sicms`, user `sa`, blank password) |

## 5. Features by role
| Role | Screens |
|---|---|
| **Customer** | Register, dashboard, file claim (with documents), edit draft, track claim with status stepper & history, respond to "info requested", my policies, products |
| **Agent** | File claims on behalf of customers, claims filed list, issue policies |
| **Claims Officer** | Work queue with search / status / "assigned to me" filters, start review, approve (with amount), reject (with reason), request info, settle, close, reports + CSV export |
| **Admin** | Everything above + users & roles, products, cancel policies, assign officers, reports, audit log |

### Claim lifecycle
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SETTLED → CLOSED
                         │  ↑            
                         │  └── INFO_REQUESTED (customer updates & resubmits)
                         └────→ REJECTED → CLOSED
```
Business rules enforced by the API: policy must be ACTIVE, incident date inside the policy period and not in
the future, claimed amount ≤ sum insured, approved amount ≤ claimed amount, rejection / info-request need a
comment, only the assigned officer (or admin) can decide, allowed file types PDF/JPG/PNG/DOC(X)/XLS(X)/TXT ≤ 10 MB.

## 6. Project structure
```
Smart_Insurance_Claim_Management_System/
├── run.bat / run.sh                 one-click start
├── frontend/                        plain HTML/CSS/JS (served as static content)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js                API base URL
│       ├── api.js                   fetch wrapper + JWT handling
│       ├── ui.js                    formatting, toasts, modals, CSS/SVG charts
│       ├── router.js                hash router (#/claims/12)
│       ├── app.js                   layout + role-based menu + routes
│       └── pages/                   auth, dashboard, claims, claimForm, claimDetail,
│                                    policies, products, users, reports, audit
└── backend/                         Spring Boot 3 / Java 17
    ├── pom.xml                      copies ../frontend into the app as /static
    └── src/main/java/com/sicms/
        ├── config/                  SecurityConfig, OpenApiConfig, DataSeeder
        ├── security/                JwtService (JDK-only HS256), JwtAuthFilter, CurrentUser
        ├── model/                   User, Product, Policy, Claim, ClaimDocument, ClaimHistory, AuditLog
        ├── repository/              Spring Data JPA repositories
        ├── dto/                     request / response records
        ├── service/                 Auth, User, Product, Policy, Claim, Report, Audit, FileStorage
        ├── controller/              REST controllers
        └── exception/               ApiException + GlobalExceptionHandler
```

## 7. REST API summary
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/register` | public |
| GET | `/api/auth/me` | any |
| GET | `/api/claims?status=&q=&mine=` | any (scoped by role) |
| GET | `/api/claims/{id}` | owner / officer / admin |
| POST / PUT | `/api/claims`, `/api/claims/{id}` | customer, agent |
| POST | `/api/claims/{id}/submit` | customer, agent |
| POST | `/api/claims/{id}/actions` `{action: START_REVIEW, APPROVE, REJECT, REQUEST_INFO, SETTLE, CLOSE}` | officer, admin |
| POST | `/api/claims/{id}/assign` | admin |
| POST | `/api/claims/{id}/documents` (multipart) | anyone who can view the claim |
| GET | `/api/documents/{id}/download` | anyone who can view the claim |
| GET / POST | `/api/policies`, POST `/api/policies/{id}/cancel` | customer (own) / agent, admin |
| GET / POST / PUT | `/api/products` | any / admin |
| GET / POST / PATCH | `/api/users`, `/api/users/customers`, `/api/users/officers` | admin (agents/officers read lists) |
| GET | `/api/reports/summary`, `/api/reports/claims.csv`, `/api/audit` | role-scoped / officer, admin / admin |

## 8. Optional: run the frontend separately
Not needed, but if you want to edit HTML/JS without restarting Spring Boot, serve the `frontend` folder with any
static server (for example `python -m http.server 5500` inside `frontend`) and open http://localhost:5500.
It automatically calls the backend on http://localhost:8080 (change `BACKEND_URL` in `js/config.js` if needed).
When running through Spring Boot, a browser refresh picks up changes after **Build → Rebuild** in IntelliJ.

## 9. PostgreSQL (production profile)
```bat
set DB_HOST=localhost& set DB_NAME=sicms& set DB_USER=postgres& set DB_PASSWORD=secret
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```
Change `app.jwt.secret` in `application.properties` for any shared environment.

## 10. Troubleshooting
| Problem | Fix |
|---|---|
| Maven: `PKIX path building failed` / certificate errors (corporate proxy) | Same root cause as the npm `SELF_SIGNED_CERT_IN_CHAIN` error. Ask IT for the corporate root certificate and import it into the JDK used by Maven: `keytool -importcert -alias corp-root -file corp-root.cer -cacerts -storepass changeit`, or point Maven at your company's internal Nexus/Artifactory mirror in `%USERPROFILE%\.m2\settings.xml`. |
| Port 8080 already in use | Change `server.port` in `application.properties` (and `BACKEND_URL` in `frontend/js/config.js` only if you serve the frontend separately). |
| Page shows old JS after editing | Rebuild in IntelliJ (or restart), then press Ctrl+F5 in the browser. |
| Data disappears after restart | Expected with in-memory H2; use the `postgres` profile, or change the H2 URL to `jdbc:h2:file:./data/sicms`. |
