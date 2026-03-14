# Bill Dividing PWA App - Implementation Plan

## Project Overview
A modern React PWA application for dividing bills among partners with support for multiple bill types, split methods, usage tracking, and data export/import capabilities.

## Technology Stack
- **Frontend Framework**: React 18 with Vite
- **UI Framework**: PrimeReact + PrimeFlex + PrimeIcons
- **Database**: IndexedDB via Dexie.js
- **Charts**: Chart.js with react-chartjs-2
- **PDF Export**: jsPDF + jspdf-autotable
- **PWA**: vite-plugin-pwa
- **Routing**: React Router DOM
- **State Management**: React Context API

## Project Structure
```
billbird/
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UsageChart.jsx
│   │   │   └── StatsCard.jsx
│   │   ├── billTypes/
│   │   │   ├── BillTypeList.jsx
│   │   │   ├── BillTypeForm.jsx
│   │   │   └── BillTypeCard.jsx
│   │   ├── bills/
│   │   │   ├── BillList.jsx
│   │   │   ├── BillForm.jsx
│   │   │   ├── BillCard.jsx
│   │   │   └── BillDetails.jsx
│   │   ├── partners/
│   │   │   ├── PartnerList.jsx
│   │   │   └── PartnerForm.jsx
│   │   └── common/
│   │       ├── ConfirmDialog.jsx
│   │       ├── ExportImport.jsx
│   │       └── Loading.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── BillTypesPage.jsx
│   │   ├── BillsPage.jsx
│   │   ├── PartnersPage.jsx
│   │   └── SettingsPage.jsx
│   ├── db/
│   │   ├── database.js
│   │   └── schema.js
│   ├── services/
│   │   ├── billService.js
│   │   ├── billTypeService.js
│   │   ├── partnerService.js
│   │   ├── exportService.js
│   │   └── importService.js
│   ├── utils/
│   │   ├── calculations.js
│   │   ├── pdfGenerator.js
│   │   └── dateUtils.js
│   ├── context/
│   │   └── AppContext.jsx
│   ├── hooks/
│   │   ├── useDatabase.js
│   │   └── useExport.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Database Schema (IndexedDB via Dexie.js)

### Tables:
1. **billTypes**
   - id (auto-increment)
   - name (string) - e.g., "Water", "Electricity", "Lunch"
   - category (string) - "usage" or "fixed"
   - splitType (string) - "equal", "percentage", "usage", "ratio"
   - fields (array) - custom fields for this bill type
   - createdAt (date)
   - updatedAt (date)

2. **partners**
   - id (auto-increment)
   - name (string)
   - email (string, optional)
   - phone (string, optional)
   - createdAt (date)

3. **bills**
   - id (auto-increment)
   - billTypeId (foreign key)
   - title (string)
   - description (string)
   - totalAmount (number)
   - billDate (date)
   - dueDate (date, optional)
   - status (string) - "pending", "paid", "overdue"
   - createdAt (date)
   - updatedAt (date)

4. **billEntries**
   - id (auto-increment)
   - billId (foreign key)
   - partnerId (foreign key)
   - lastUsage (number, for usage-based bills)
   - currentUsage (number, for usage-based bills)
   - lastReadDate (date, for usage-based bills)
   - currentReadDate (date, for usage-based bills)
   - usageAmount (number, calculated)
   - splitAmount (number, calculated)
   - percentage (number, for percentage split)
   - ratio (number, for ratio split)
   - paid (boolean)
   - paidDate (date, optional)

## Features Implementation Details

### 1. Bill Types Management
- CRUD operations for bill types
- Predefined types: Water, Electricity, Lunch, Cab Fee, Travel Fee, etc.
- Custom type creation
- Split type configuration per bill type

### 2. Split Types
- **Equal Divide**: Total amount split equally among all partners
- **Percentage**: Each partner has a custom percentage
- **Usage Based**: Split based on usage difference (current - last)
- **Ratio**: Split based on custom ratios

### 3. Usage-Based Bills
- Auto-populate last usage from previous bill
- Track last read date and current read date
- Calculate usage difference
- Store historical data for trend analysis

### 4. Dashboard
- Line charts showing usage trends per bill type
- Total usage trend over time
- Individual partner usage trends
- Summary statistics cards

### 5. PDF Export
- Detailed table view with all bill information
- Partner-wise breakdown
- Usage details for usage-based bills
- Professional formatting

### 6. Google Drive Export/Import
- Export data as JSON file
- User downloads file and manually uploads to Google Drive
- Import: User selects file from device (can be from Google Drive)
- No OAuth/login required - pure file-based approach

### 7. PWA Features
- Installable on mobile devices
- Offline functionality
- App-like experience
- Custom icons and splash screen

## Implementation Steps

### Phase 1: Project Setup
1. Initialize React project with Vite
2. Install all dependencies
3. Configure PWA plugin
4. Set up project structure

### Phase 2: Database Layer
1. Set up Dexie.js database
2. Create schema and tables
3. Implement service layer for CRUD operations

### Phase 3: Core Features
1. Bill Type management
2. Partner management
3. Bill management with split calculations
4. Usage-based bill functionality

### Phase 4: UI Components
1. Layout components (Header, Sidebar)
2. Dashboard with charts
3. Bill and BillType forms
4. Responsive design implementation

### Phase 5: Advanced Features
1. PDF export functionality
2. Data export/import
3. PWA configuration
4. Testing and optimization

### Phase 6: Deployment
1. Build for production
2. Configure GitHub Pages
3. Deploy and test

## Key Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "primereact": "^10.x",
    "primeicons": "^6.x",
    "primeflex": "^3.x",
    "dexie": "^3.x",
    "dexie-react-hooks": "^1.x",
    "chart.js": "^4.x",
    "react-chartjs-2": "^5.x",
    "jspdf": "^2.x",
    "jspdf-autotable": "^3.x",
    "date-fns": "^2.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.x"
  }
}
```

## Responsive Design Strategy
- Mobile-first approach
- PrimeFlex grid system
- Breakpoints: sm (576px), md (768px), lg (992px), xl (1200px)
- Touch-friendly UI elements
- Collapsible sidebar for mobile

## GitHub Pages Deployment
- Build with base path configuration
- Use hash routing for SPA compatibility
- Configure vite.config.js for GitHub Pages
