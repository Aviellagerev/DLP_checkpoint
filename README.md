__1) This is a simple DLP backend written for checkpoint project.__

technoligy stack is node,tyepscript,postgressql,docker,express,pg

__2) HOW TO RUN THIS TWO RUN MODES.__

Prerequisites
Short list. Docker Desktop for Mode A; 
Node 24 as well for Mode B.

__MODE 1) DOCKER:__

```
git clone <this repo>
cd DLP_checkpoint
docker compose up -d --build
```
verification to tesk 
``` 
curl http://localhost:3000/health     # {"status":"ok"}


```
(no npm install (img builds own dependencies ),  .env comes from compose file, 
no manual schema steps )
but 
docker compose down -v when db/init.sql changes

__MODE 2) LOCAL DEVELOPMENT__
for runing the app with hot reload against a containerised database:
```
npm install
cp .env.example .env
# edit .env — see below
docker compose up -d postgres
npm run dev
```
```
<user>      dlp        from POSTGRES_USER     in docker-compose.yml
<password>  dlp        from POSTGRES_PASSWORD in docker-compose.yml
<database>  dlp        from POSTGRES_DB       in docker-compose.yml
<host>      localhost  Mode B runs the app on your machine
<port>      5433       the HOST side of "5433:5432" in docker-compose.yml
```
or just this 

```
DATABASE_URL="postgresql://dlp:dlp@localhost:5433/dlp"
PORT=3000
```
bboth modes bind port 300 
__3) API REFRENCES__

```
GET  /health         200   {"status":"ok"}
```

 ```
/api/datatypes

POST   /             201  created object       400 invalid body
GET    /             200  array
GET    /:id          200  object               404 unknown id
PUT    /:id          200  updated object       400, 404
DELETE /:id          204  no body              404 unknown id
```

```
/api/datasets

POST   /             201  created object       400(invalid body or data_type_ids)
GET    /             200  array
GET    /:id          200  object               404 unknown id
PUT    /:id          200  updated object       400(invalid body or data_type_ids), 404
DELETE /:id          204  no body              404 unknown id
```

```
/api/scan
POST   /             200  match or not matched
                     400  invalid body
                     404  unknown dataSetId
```

__EXAMPLES__
```
POST /api/datatypes

//request
{ "name": "Credit Card Terms", "description": "PCI",
  "type": "keywords", "content": ["visa","cvv"], "threshold": 2 }


// responds 201
{ "id": "783f5738-...", "name": "Credit Card Terms", "description": "PCI",
  "type": "keywords", "content": ["visa","cvv"], "threshold": 2 }

```

```
POST /api/datasets
// request — the spec's data_type_ids spelling; dataTypeIds is also accepted
{ "name": "PCI Compliance",
  "data_type_ids": ["783f5738-...", "f8b35a7e-..."] }

// 201 — responses always use dataTypeIds, sorted and de-duplicated
{ "id": "c86fccf7-...", "name": "PCI Compliance",
  "dataTypeIds": ["783f5738-...", "f8b35a7e-..."] }

// 400 — when a referenced data type does not exist
{ "errors": ["unknown data type ids: fake-1, fake-2"] }
```


```
POST /api/scan
// request
{ "text": "pay with visa, cvv 123", "dataSetId": "c86fccf7-..." }

// 200 — match
{ "status": "match",
  "detected_objects": [
    { "id": "783f5738-...", "name": "Credit Card Terms", "match_count": 2 }
  ] }

// 200 — no match
{ "status": "not matched" }
```

__Field rules__
```
name          non-empty string
description   string, may be empty
type          must be "keywords"
content       non-empty array of non-empty strings
threshold     integer >= 1

name          non-empty string



data_type_ids array of ids, may be empty

text          string, may be empty
dataSetId     non-empty string
```
threshold is required to be an integer ≥ 1. The spec says NUMBER; a fractional threshold has no meaning for a count, and the integer check also rejects NaN and Infinity
__error shapes__
```
{ "errors": ["name must be a non-empty string", ...] }   validation — always an array
{ "error":  "Data set not found :<" }                  single failure — always a string
```

some choices i higghlight here
1. "not matched" is 200. The scan succeeded; it found nothing. 404 is reserved for a dataSetId that doesn't exist — meaning no scan could be run at all.

2. PUT is a full replace. The body must contain every field; there's no PATCH. A partial body gets a 400.

3. Input accepts data_type_ids or dataTypeIds; responses always use dataTypeIds.

Worth being deliberate about this one — a reviewer following the spec will POST data_type_ids and get dataTypeIds back. It round-trips fine (input accepts both), but document it or it looks like an oversight rather than a choice.

4. An empty collection is 200 [], not 404. Zero data types is a valid state of a collection that exists.



__4) FILE TREE__
```
src/
├── domain/         the vocabulary — imports nothing
├── repositories/   persistence; pg/ is the only place SQL exists
├── scan/           the matching logic, a pure function
├── validation/     request shape checks, pure
├── routes/         HTTP — the only layer that knows about req/res
├── app.ts          assembles Express
└── server.ts       binds the port
db/init.sql         schema, run automatically on first boot
scripts/            test scripts, outside src so they never ship

dependency rules:
routes/        →  validation/, scan/, repositories/, domain/
repositories/  →  domain/
scan/          →  domain/
domain/        →  nothing


Each layer may only import inward. domain/types.ts sits at the bottom and imports nothing at all.

```

__5)TESTING__
```
npm run try-count    18 checks   keyword counting     no setup
npm run try-scan     10 checks   matching logic       no setup
npm run smoke        21 checks   repositories + SQL   needs Postgres
bash scripts/api-test.sh   48    HTTP end to end      needs both

```
__Note that api-test.sh needs Git Bash on Windows, not PowerShell.__

__6)KNOWN LIMITATIONS__
1)\b is ASCII-based — Hebrew and accented text won't word-boundary correctly
2)keywords ending in punctuation (c++) can't match
3)no cap on scanned text size
4)no auth, pagination, or rate limiting
5)only type: "keywords" — the extension point for regex or dictionary rules

__7)DESIGN CHOICES__
match_count: means total keyword occurrences. The spec is ambiguous here — it shows "match_count": 3 without saying what produced the 3, and says "match if keyword count ≥ threshold" without defining "keyword count". Total occurrences was chosen because a document repeating a term carries more signal than one that mentions it once; the same number feeds both the threshold comparison and the reported count.

Update semantics: the spec says "CRUD" without specifying. Chosen: PUT with full replace; the body must contain every field. No PATCH.

Status for "not matched" — not specified. Chosen: 200. The scan succeeded and found nothing; 404 is reserved for a dataSetId that doesn't exist.

Duplicate names — not specified. Allowed; data types and data sets are identified by UUID.