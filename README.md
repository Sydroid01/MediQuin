# MediQuin - Healthcare Compliance Tracker & Equipment Maintenance System

Full-stack version of the CCSFEN1L prototype by Firewall Benders.

**React (Vite)** front end + **Node.js / Express** API + **MongoDB** database.
Everything you do (requests, approvals, unit status, **repair requests, equipment inventory**, employees, audit log) is now saved in MongoDB, so it is still there after a reload, a server restart or a computer restart. Your sign-in also survives a reload.

```
Browser (React)  --/api-->  Express server  -->  MongoDB
   port 5173 (dev)            port 4000           port 27017
```

---

## Step-by-step setup

### Step 1 - Install Node.js
1. Download the **LTS** version from https://nodejs.org and install it (accept the defaults).
2. Open a new terminal (Windows: PowerShell or Command Prompt; macOS: Terminal) and check:
   ```
   node -v
   npm -v
   ```
   `node -v` must show **v18.17 or newer** (v20 or v22 is ideal).

### Step 2 - Open the project folder
Unzip the project, then open a terminal **inside the `mediquin` folder** (the one containing `package.json`).
Windows tip: open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
VS Code: File > Open Folder, then Terminal > New Terminal.

### Step 3 - Get a MongoDB database (pick ONE option)

**Option A - MongoDB Atlas (free cloud database; nothing to install; easiest)**
1. Create a free account at https://www.mongodb.com/cloud/atlas/register.
2. Create a cluster: choose the free **M0** tier, any provider/region near you, then **Create**.
3. **Database Access** (left menu) > **Add New Database User**. Choose a username and password (letters and numbers only makes life easier). Give it "Read and write to any database". Save.
4. **Network Access** > **Add IP Address**. For local testing click **Allow access from anywhere** (0.0.0.0/0). For real use, allow only your server's IP.
5. **Database** > your cluster > **Connect** > **Drivers**. Copy the connection string. It looks like:
   `mongodb+srv://myuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
6. Replace `<password>` with your real password and add the database name `mediquin` before the `?`:
   `mongodb+srv://myuser:MyPass123@cluster0.abcde.mongodb.net/mediquin?retryWrites=true&w=majority`
   You will paste this in Step 5. (If your password contains characters like `@ : / ?` it must be URL-encoded.)

**Option B - Docker (local database in one command)**
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop and start it.
2. In the project folder run:
   ```
   docker compose up -d
   ```
   MongoDB now runs on your computer and keeps its data in a Docker volume. Nothing to change in Step 5.

**Option C - Install MongoDB directly**
- **Windows:** download *MongoDB Community Server* (MSI) from https://www.mongodb.com/try/download/community. Choose "Complete", tick **Install MongoDB as a Service**. It starts automatically.
- **macOS (Homebrew):**
  ```
  brew tap mongodb/brew
  brew install mongodb-community@7.0
  brew services start mongodb-community@7.0
  ```
- **Linux:** follow https://www.mongodb.com/docs/manual/administration/install-on-linux/ and run `sudo systemctl start mongod`.

### Step 4 - Install the project's packages
```
npm install
```
This takes a minute or two.

### Step 5 - Create your settings file
Copy the example file to `.env`:
- Windows (Command Prompt): `copy .env.example .env`
- Windows (PowerShell), macOS, Linux: `cp .env.example .env`

Open `.env` in any text editor.
- **Option A (Atlas):** replace the `MONGODB_URI=` line with your connection string from Step 3.
- **Option B or C:** leave it as is.

The dev secrets already in the file are fine for trying it out on your own computer.

### Step 6 - Start the app
```
npm run dev
```
You should see `Connected to MongoDB`, then `Seeded ... equipment units` (first run only), then `MediQuin API on http://localhost:4000`. The first run fills the database with the departments, equipment units and demo users. Later runs never overwrite your data.

### Step 7 - Open it
Go to **http://localhost:5173** and sign in:

| Role      | PIN   | Person                 |
|-----------|-------|------------------------|
| Staff     | 00001 | Aron Casa              |
| Staff     | 00002 | Elizha Cruz            |
| Custodian | 20001 | Fleincy Dela Cruz      |
| Admin     | 10001 | Aaron Vince Penetrante |

### Step 8 - Confirm that saving works
1. Sign in as **Staff (00001)** > Request Equipment > pick a unit > submit.
2. Press **F5** (reload). You stay signed in and the request is still in *Requested Equipment Status*.
3. Log out, sign in as **Custodian (20001)** > Request Queue. The request is there. Approve it, then move it through the stages.
4. Stop the server (`Ctrl+C`), start it again with `npm run dev`. Everything is still there.
5. Optional: look at the raw data with **MongoDB Compass** (https://www.mongodb.com/try/download/compass). Connect with your `MONGODB_URI` and open the `mediquin` database: `requests`, `units`, `users`, `auditlogs` ...

---

## Running it "for real" (one server, production build)
```
npm run build      # builds the React app into dist/
npm start          # Express serves the API and the built site on http://localhost:4000
```
Set `NODE_ENV=production` and put **real secrets** in `.env` first (the server refuses to start with the dev ones):
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run it twice and paste the results as `JWT_SECRET` and `PIN_PEPPER`. Set `PIN_PEPPER` **before** first seeding; changing it later invalidates all stored PINs.

### Deploying online (example: Render + Atlas)
1. Push the project to GitHub (`.env` is already git-ignored).
2. Use Atlas (Option A). In Network Access allow the host's IPs (or 0.0.0.0/0).
3. On https://render.com create a **Web Service** from the repo:
   - Build command: `npm install --include=dev && npm run build`
   - Start command: `npm start`
   - Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `PIN_PEPPER`
4. Open the URL Render gives you. Railway, Fly.io and any VPS work the same way. Always serve it over HTTPS.

## Useful commands
| Command | What it does |
|---|---|
| `npm run dev` | API + React dev server with auto-reload |
| `npm run build` / `npm start` | Production build / run |
| `npm run seed` | Fills only *empty* collections with the demo data |
| `npm run seed:reset` | **Wipes the whole database** and re-creates the demo data |
| `npm run seed:inventory` | Adds *sample* serial numbers, brands, suppliers, dates and conditions to units that have none (for a database created before version 2.2) |

---

## What changed from the prototype
- The single-file screens are split into `src/pages/`, one file per page, with real URLs (React Router).
- `src/data.js` no longer holds the data. It is a cache refreshed from the server after every action and every 10 seconds (so a custodian sees new requests without reloading).
- `server/` is new: `models.js` (MongoDB collections), `routes.js` (API + rules), `auth.js`, `seed-data.js`, `index.js`.
- The rules now live on the server, not in the browser: a unit can't be approved twice, deleting a unit/equipment with an active request is blocked, PINs are unique, only Admins can manage employees/equipment/logs, only Custodians can approve.
- The audit log is written by the server using the signed-in user's identity, and the API has no way to edit or delete entries.
- Request numbers (`REQ-0001`...) come from an atomic database counter, so two people submitting at once can't get the same number.
- **PINs are stored as keyed hashes**, so the Manage Employees table no longer shows PINs. To reset someone's PIN, edit them and type a new one (blank keeps the current PIN).
- Sign-in uses a token kept in `sessionStorage`: it survives a reload and is dropped when the tab closes. Sign-in is locked for 5 minutes after 5 failed attempts from the same IP address (tracked in the `loginattempts` collection). Sign-ins and sign-outs are both written to the audit log.

Security note: a 5-digit PIN has only 100,000 possibilities. Hashing and rate limiting help, but if this holds real hospital data, plan to move to individual usernames plus strong passwords, and use HTTPS.

## Pages and URLs
Every screen has its own URL and its own file, so **reloading (F5) keeps you on the same page**, you can bookmark or share a link, and the browser's Back/Forward buttons work. If you aren't signed in, any link sends you to `/login` and brings you back to that page afterwards. If your role isn't allowed on a page you're sent to the dashboard.

| URL | Role | File |
|---|---|---|
| `/login` | anyone | `src/pages/Login.jsx` |
| `/` (dashboard) | signed in | `src/pages/Home.jsx` |
| `/staff/request` | Staff | `src/pages/staff/RequestEquipment.jsx` |
| `/staff/my-requests` | Staff | `src/pages/staff/MyRequests.jsx` |
| `/staff/equipment` | Staff | `src/pages/staff/EquipmentList.jsx` |
| `/custodian/queue` | Custodian | `src/pages/custodian/RequestQueue.jsx` |
| `/custodian/permission` (walk-in) and `/custodian/permission/REQ-0007` | Custodian | `src/pages/custodian/EquipmentPermission.jsx` |
| `/custodian/status` | Custodian | `src/pages/custodian/EquipmentStatus.jsx` |
| `/admin/employees` | Admin | `src/pages/admin/ManageEmployees.jsx` |
| `/admin/equipment` | Admin | `src/pages/admin/ManageEquipment.jsx` |
| `/admin/logs` | Admin | `src/pages/admin/AuditLogs.jsx` |
| `/report-problem` (and `?unit=ER-01-003` to pre-select a unit) | any signed-in role | `src/pages/ReportProblem.jsx` |
| `/staff/my-repairs` | Staff | `src/pages/staff/MyRepairs.jsx` |
| `/repairs` and `/repairs/REP-0003` | Custodian, Admin | `src/pages/shared/RepairRequests.jsx` |
| `/inventory` | Custodian (view), Admin (add and edit) | `src/pages/shared/EquipmentInventory.jsx` |

Where you are *inside* a page is in the URL too: the department and equipment you drilled into (`?dept=ER&item=...`) and the unit you picked on the request form (`&unit=ER-01-003`). Text you typed into a form but haven't submitted is not kept on reload.

To add a page: create a file in `src/pages/`, add its URL to `PATH` in `src/nav.js` and one line to the `PAGES` table in `src/App.jsx`.

### Project layout
```
server/                 Express API + MongoDB models, routes, seed data
src/
  main.jsx              starts React inside the router
  App.jsx               header, navigation, sign-in/session handling, route table
  nav.js                page URLs and the per-role menu
  AppContext.js         shared helpers for pages (user, go, act, toast)
  api.js  data.js       API client and the data cache filled from MongoDB
  ui.jsx                small shared pieces (badge, table, breadcrumb)
  components/           Catalog.jsx (dept > equipment > unit browser), PermissionForm.jsx
  pages/                one file per screen (see table above); pages/shared/ holds screens used by more than one role
```

## Repair requests and equipment inventory (added in 2.2)

### Repair and service requests
1. **Report a problem** (any signed-in role, *Report a Problem* in the menu): choose the equipment and the exact unit, say where it is, describe the issue and set a priority. The request gets a number such as `REP-0001`.
2. **Priority**: *Low* (minor, still usable), *Medium* (works, but not properly), *High* (affects patient care), *Critical* (unsafe or unusable). The reporter sets it first; a Custodian or Admin can change it later.
3. **Track progress**: *Reported → Under Review → In Repair → Resolved* (or *Dismissed* when no repair was needed). Staff follow their own reports under *My Repair Requests*, with the full history of every update and note. Custodians and Admins manage everything under *Repair Requests*: filter by status or priority, change status or priority, assign a technician, and add a progress note the reporter can read.
4. **The unit's status follows the repair.** Moving a request to *In Repair* marks the unit *Under Maintenance* (so it can't be requested). Moving it out of that stage puts the unit back in service (*Available*, or *In Use* if it is on loan). When you choose *Resolved* you also pick the equipment's condition after the repair.
5. A unit with an **open** repair request can't be deleted. Closed requests (Resolved or Dismissed) can't be edited; if the problem comes back, report it again.
6. Every report and update is written to the audit log.

### Medical equipment inventory
*Equipment Inventory* (Custodian: view only, Admin: add and edit) keeps one record per physical unit:

| Field | Notes |
|---|---|
| Equipment name | The equipment type, e.g. *Defibrillator / AED*. Add new types under *Manage Equipment*. |
| Equipment ID | The unit's product code (e.g. `ER-01-003`). Created automatically when you add a unit. |
| Serial number | Optional, but must be unique if entered. |
| Brand, Model | Free text. |
| Supplier | Free text, with suggestions from suppliers you already entered (e.g. *Philippine Medical Supplies*). |
| Date purchased, Warranty expiration | The warranty can't expire before the purchase date. The list shows each unit as *Active*, *Expiring Soon* (within 90 days), or *Expired*, and you can filter on it. |
| Condition | New, Good, Fair, Poor or Defective. |
| Status | Available, In Use or Under Maintenance (the same status used everywhere else in the app). |

You can search by name, ID, serial number, brand, model or supplier, and filter by department, status, condition and warranty. Each row has a **Report** button that opens the repair form with that unit selected.

### Upgrading from version 5 (2.1)
No migration is needed and your data is kept. Existing units simply show blank inventory fields (condition defaults to *Good*) until an Admin fills them in. To fill them with **sample** data for a demo, run `npm run seed:inventory` (units that already have a serial number are never touched). A brand-new database is seeded with sample inventory details and three sample repair requests. The brands are real manufacturers, but the models, serial numbers, dates and suppliers are randomly generated, so replace them with your hospital's real records.

One behavior change: when a borrowed unit is returned, it only goes back to *Available* if it is still marked *In Use*. A unit that was set to *Under Maintenance* while on loan stays that way.

## API overview
All routes are under `/api` and need `Authorization: Bearer <token>` except login.

| Route | Who |
|---|---|
| `POST /auth/login`, `GET /auth/me` | anyone / signed in |
| `GET /catalog`, `GET /requests` (Staff see only their own) | signed in |
| `POST /requests` | Staff |
| `POST /requests/walkin`, `POST /requests/:id/advance`, `POST /requests/:id/reject` | Custodian |
| `POST/PATCH/DELETE /units`, `.../departments/:code/equipment` | Admin |
| `GET /repairs` (Staff see only their own), `POST /repairs` | signed in |
| `POST /repairs/:id/update` | Custodian, Admin |
| `GET /inventory` | Admin, Custodian |
| `PATCH /inventory/:code` (and the inventory fields on `POST /units`) | Admin |
| `GET /employees` | Admin, Custodian |
| `POST/PATCH/DELETE /employees` , `GET /logs` | Admin |

## Troubleshooting
| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` | MongoDB isn't running (Docker: `docker compose up -d`; local: start the service) or `MONGODB_URI` is wrong. |
| Atlas: `bad auth` / `Authentication failed` | Wrong user/password in the URI, or the password has special characters that need URL-encoding. |
| Atlas: `Server selection timed out` | Your IP isn't allowed under Network Access. |
| `ECONNREFUSED ::1:27017` | Use `127.0.0.1` instead of `localhost` in `MONGODB_URI` (already the default). |
| `Missing JWT_SECRET or PIN_PEPPER` | You skipped Step 5. Copy `.env.example` to `.env`. |
| `EADDRINUSE` (port in use) | Something else uses port 4000. Change `PORT` in `.env` **and** the port in `vite.config.js`. |
| Page loads but sign-in says "Can't reach the server" | The API isn't running. Look at the `api` lines in the terminal for the error. |
| All PINs stopped working | `PIN_PEPPER` was changed after seeding. Restore it, or run `npm run seed:reset`. |
| PowerShell says scripts are disabled | Use Command Prompt, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
