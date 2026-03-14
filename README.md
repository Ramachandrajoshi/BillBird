# BillBird

BillBird is a Progressive Web App for splitting household and shared expenses among partners.
It supports fixed and usage-based bill types, multiple split strategies, local-first data storage,
backup/restore through JSON files, and PDF exports.

## Why BillBird

- Track many bill types such as Water, Electricity, Internet, Rent, Groceries, and custom types.
- Split each bill using Equal, Percentage, Usage, or Ratio methods.
- Auto-fill previous usage values for usage-based bills.
- Work offline with browser storage (IndexedDB via Dexie).
- Install as an app on mobile and desktop (PWA).

## Key Features

### Billing
- Full CRUD for Bill Types, Partners, and Bills.
- Dynamic form fields based on selected bill type and split type.
- Usage support with:
   - last usage
   - current usage
   - last read date
   - current read date

### Dashboard and Insights
- Overview cards for bill count, partners, totals, and pending bills.
- Line chart for bill trends by type.
- Partner split trend chart.
- Bill type distribution chart.
- Recent bills table.

### Data and Portability
- Local-first storage in IndexedDB.
- Export all data to a JSON file.
- Import data from JSON (replace existing data after confirmation).
- Backup/restore workflow compatible with Google Drive and other cloud storage by manual file upload/download.

### Documents and Reports
- Export a single bill as detailed PDF.
- Export all bills as a summary PDF report.

### PWA
- Installable on Android, iOS (Safari), Windows, and macOS.
- Offline caching via service worker.
- Responsive layout optimized for mobile and desktop.

## Tech Stack

- React 18 + Vite
- PrimeReact, PrimeFlex, PrimeIcons
- Dexie (IndexedDB)
- Chart.js + react-chartjs-2
- jsPDF + jspdf-autotable
- React Router
- date-fns
- vite-plugin-pwa

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Install and Run

```bash
git clone https://github.com/<your-username>/billbird.git
cd billbird
npm ci
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

### Test

```bash
npm run test
```

### Production Build

```bash
npm run build
npm run preview
```

## Deployment

### GitHub Pages

This repository already includes a workflow at `.github/workflows/deploy.yml`.

- Push to `main` or `master`.
- In repository settings, set Pages source to GitHub Actions.
- The workflow auto-configures base path and deploys `dist`.

No manual edit to `base` in `vite.config.js` is required.

## How to Use

### 1. Create Bill Types
Go to Bill Types and add templates such as Water or Electricity.
Select category and split type.

### 2. Add Partners
Go to Partners and create members who share bills.

### 3. Create Bills
Go to Bills and create entries from bill types.

- For usage-based bills, last usage is auto-populated from history.
- Enter current usage and read date.
- Review split amounts before saving.

### 4. Export/Import Data
Go to Settings.

- Export to JSON file for backup.
- Upload that file manually to Google Drive (or any cloud).
- Later, download and import the file to restore.

### 5. Export PDFs
From Bills:

- Export individual bill PDFs.
- Export full bills report PDF.

## Project Structure

```text
billbird/
   public/
   src/
      components/
      context/
      db/
      pages/
      test/
      utils/
   .github/workflows/deploy.yml
   package.json
   vite.config.js
```

## Browser Support

- Chrome / Edge (latest)
- Firefox (latest)
- Safari 15+
- Android Chrome and iOS Safari

## License

This project is licensed under the MIT License. See the `LICENSE` file.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Run tests and build locally.
4. Open a pull request with a clear description.
