Here is a **Markdown documentation file** explaining how to use the GraphQL API with the provided schema. This guide covers **queries, filters, sorting, and pagination**.

---

# 📖 GraphQL API Documentation

## 📌 Introduction

This document provides details on how to **query** the `Poste` data using **GraphQL**.

- **Base API Endpoint**: `/api/graphql`
- **GraphQL Playground**: Available at [`http://localhost:3000/api/graphql`](http://localhost:3000/api/graphql)

---

## 📌 Available Queries

### 1️⃣ **Fetch All Stations (`postes`)**
Retrieve a list of weather stations with optional filters, pagination, sorting, and search.

#### 🔹 **Query**
```graphql
query GetPostes($filter: JSON, $orderBy: [OrderByInput!], $skip: Int, $take: Int) {
  postes(filter: $filter, orderBy: $orderBy, skip: $skip, take: $take) {
    numPoste
    nomUsuel
    commune
    lieuDit
    dateOuverture
    dateFermeture
    posteOuvert
    latitude
    longitude
    lambX
    lambY
    altitude
    typePoste
  }
}
```

#### 🔹 **Variables Example**
```json
{
  "filter": { "commune": "Paris", "posteOuvert": true },
  "orderBy": [{ "dateOuverture": "desc" }],
  "skip": 0,
  "take": 10
}
```

#### 🔹 **Response Example**
```json
{
  "data": {
    "postes": [
      {
        "numPoste": "12345678",
        "nomUsuel": "Paris Center",
        "commune": "Paris",
        "lieuDit": "Tour Eiffel",
        "dateOuverture": "2000-01-01T00:00:00.000Z",
        "dateFermeture": null,
        "posteOuvert": true,
        "latitude": 48.858844,
        "longitude": 2.294351,
        "lambX": 12345,
        "lambY": 67890,
        "altitude": 35,
        "typePoste": 1
      }
    ]
  }
}
```

---

### 2️⃣ **Fetch a Single Station (`poste`)**
Retrieve a **specific weather station** using its `numPoste`.

#### 🔹 **Query**
```graphql
query GetPoste($numPoste: String!) {
  poste(numPoste: $numPoste) {
    numPoste
    nomUsuel
    commune
    latitude
    longitude
  }
}
```

#### 🔹 **Variables Example**
```json
{
  "numPoste": "12345678"
}
```

#### 🔹 **Response Example**
```json
{
  "data": {
    "poste": {
      "numPoste": "12345678",
      "nomUsuel": "Paris Center",
      "commune": "Paris",
      "latitude": 48.858844,
      "longitude": 2.294351
    }
  }
}
```

---

### 3️⃣ **Get the Count of Stations (`countPostes`)**
Retrieve the **total number of weather stations** matching specific criteria.

#### 🔹 **Query**
```graphql
query CountPostes($filter: JSON) {
  countPostes(filter: $filter)
}
```

#### 🔹 **Variables Example**
```json
{
  "filter": { "posteOuvert": true }
}
```

#### 🔹 **Response Example**
```json
{
  "data": {
    "countPostes": 1023
  }
}
```

---

## 📌 Filtering & Search 🔍
You can filter the stations based on **any field** using the `filter` argument.

### ✅ Supported Filters
- **Text Fields (`contains` search, case-insensitive)**
  - `nomUsuel`
  - `commune`
  - `lieuDit`
- **Exact Match**
  - `numPoste`
  - `posteOuvert` (true/false)
  - `altitude`, `latitude`, `longitude`
- **Numeric Filters** (`gte`, `lte`, `gt`, `lt`)
  - `altitude`
  - `latitude`
  - `longitude`
  - `typePoste`

#### 🔹 **Example: Get all stations in "Lyon"**
```json
{
  "filter": { "commune": "Lyon" }
}
```

#### 🔹 **Example: Get all open stations (`posteOuvert: true`)**
```json
{
  "filter": { "posteOuvert": true }
}
```

#### 🔹 **Example: Get all stations with altitude above 500m**
```json
{
  "filter": { "altitude": { "gte": 500 } }
}
```

---

## 📌 Sorting
Sorting can be done on any field using the `orderBy` argument.

### 🔹 **Example: Sort by `dateOuverture` descending**
```json
{
  "orderBy": [{ "dateOuverture": "desc" }]
}
```

### 🔹 **Example: Sort by `commune` ascending, then `altitude` descending**
```json
{
  "orderBy": [{ "commune": "asc" }, { "altitude": "desc" }]
}
```

---

## 📌 Pagination
The API supports **pagination** via:
- `skip`: Number of records to skip (default: `0`).
- `take`: Number of records to return (default: `50`, **unlimited if `-1`**).

### 🔹 **Example: Fetch stations 51 to 100**
```json
{
  "skip": 50,
  "take": 50
}
```

---

## 📌 Errors & Troubleshooting
| Error Message | Cause | Fix |
|--------------|------|------|
| `Cannot query field "postes_aggregate"` | Invalid query name | Use `countPostes` instead. |
| `Unknown argument "where"` | Prisma requires JSON filters | Use `filter` instead of `where`. |
| `numPoste does not exist` | Missing required parameter | Ensure `numPoste` is provided. |

---

## 🚀 **Conclusion**
- Use **GraphQL Playground** (`/api/graphql`) for **live API exploration**.
- Use `filter` to **search across all fields** dynamically.
- Use `orderBy` for **sorting results**.
- Use `countPostes` to **get total records** matching criteria.
- Use `skip` & `take` for **pagination** (`-1` for no limit).


