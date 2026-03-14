# BillBird - Bill Dividing PWA App

A modern Progressive Web App (PWA) for dividing bills among partners with support for multiple bill types, split methods, usage tracking, and data export/import capabilities.

## Features

### Core Functionality
- **Multiple Bill Types**: Create custom bill types for Water, Electricity, Gas, Internet, Lunch, Dinner, Cab Fee, Travel Fee, Rent, Groceries, and more
- **Flexible Split Methods**:
  - Equal Divide: Split bills equally among all partners
  - Percentage: Custom percentage allocation per partner
  - Usage Based: Split based on consumption difference (current - last)
  - Ratio: Custom ratio-based splitting
- **Usage-Based Bills**: Track consumption with automatic last usage population from previous bills
- **Partner Management**: Add and manage partners with contact details
- **CRUD Operations**: Full create, read, update, delete functionality for all entities

### Dashboard & Analytics
- **Interactive Dashboard**: Overview of total bills, partners, amounts, and pending bills
- **Usage Trends**: Line charts showing usage trends over the last 6 months
- **Bill Distribution**: Doughnut chart showing distribution by bill type
- **Recent Bills**: Quick view of recent bills with status

### Data Management
- **IndexedDB Storage**: All data stored locally in browser's IndexedDB
- **Export to File**: Download all data as JSON file
- **Import from File**: Restore data from previously exported backup
- **Google Drive Integration**: Manual backup/restore via file upload/download

### PDF Export
- **Detailed PDF Reports**: Generate professional PDF reports for individual bills
- **Partner-wise Breakdown**: Clear table view of each partner's share
- **Usage Details**: Include usage information for utility bills

### PWA Features
- **Installable**: Install as an app on mobile and desktop devices
- **Offline Support**: Works without internet connection
- **Responsive Design**: Optimized for mobile, tablet, and desktop screens
- **Fast Loading**: Service worker caching for instant loading

## Technology Stack

- **Frontend**: React 18 with Vite
- **UI Framework**: PrimeReact + PrimeFlex + PrimeIcons
- **Database**: IndexedDB via Dexie.js
- **Charts**: Chart.js with react-chartjs-2
- **PDF Generation**: jsPDF with jspdf-autotable
- **PWA**: vite-plugin-pwa
- **Routing**: React Router DOM
- **State Management**: React Context API
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/billbird.git
cd billbird
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deploying to GitHub Pages

1. Update `vite.config.js` with your repository name:
```javascript
base: '/your-repo-name/'
```

2. Build the project:
```bash
npm run build
```

3. Deploy the `dist` folder to GitHub Pages

## Usage Guide

### Creating Bill Types

1. Navigate to **Bill Types** from the sidebar
2. Click **Add Bill Type**
3. Enter the bill type name (e.g., "Water", "Electricity")
4. Select category:
   - **Fixed Amount**: For bills with fixed amounts (rent, internet)
   - **Usage Based**: For bills based on consumption (water, electricity)
5. Select split type:
   - **Equal Divide**: Split equally among partners
   - **Percentage**: Custom percentage per partner
   - **Usage Based**: Split by consumption difference
   - **Ratio**: Custom ratio per partner
6. For usage-based bills, select the fields to track

### Adding Partners

1. Navigate to **Partners** from the sidebar
2. Click **Add Partner**
3. Enter partner name, email (optional), and phone (optional)
4. Click **Create**

### Creating Bills

1. Navigate to **Bills** from the sidebar
2. Click **Add Bill**
3. Select the bill type
4. Enter bill title and description
5. Enter total amount
6. Select bill date and due date (optional)
7. Select partners to include in the split
8. For usage-based bills:
   - Last usage is auto-populated from previous bills
   - Enter current usage and read date
9. For percentage/ratio splits, enter the values per partner
10. Click **Create**

### Exporting Data

1. Navigate to **Settings** from the sidebar
2. Click **Export to File**
3. Save the downloaded JSON file
4. Upload to Google Drive or any cloud storage for backup

### Importing Data

1. Navigate to **Settings** from the sidebar
2. Click **Import from File**
3. Select a previously exported JSON file
4. Confirm the import (this will replace existing data)

### Exporting Bills as PDF

1. Navigate to **Bills** from the sidebar
2. Click the PDF icon on any bill row
3. A detailed PDF report will be downloaded

## Project Structure

```
billbird/
├── public/
│   ├── manifest.webmanifest
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── Header.jsx
│   │       ├── Sidebar.jsx
│   │       └── Layout.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── BillTypesPage.jsx
│   │   ├── BillsPage.jsx
│   │   ├── PartnersPage.jsx
│   │   └── SettingsPage.jsx
│   ├── db/
│   │   └── database.js
│   ├── context/
│   │   └── AppContext.jsx
│   ├── utils/
│   │   └── pdfGenerator.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome for Android)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [PrimeReact](https://primereact.org/) for the amazing UI components
- [Dexie.js](https://dexie.org/) for IndexedDB wrapper
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [Vite](https://vitejs.dev/) for fast build tooling

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
