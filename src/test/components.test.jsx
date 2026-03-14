import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock ALL PrimeReact components BEFORE importing components that use them
vi.mock('primereact/toast', () => {
  const Toast = React.forwardRef((props, ref) => {
    return React.createElement('div', { 'data-testid': 'toast-mock' });
  });
  return { Toast };
});

vi.mock('primereact/button', () => ({
  Button: ({ icon, className, onClick, 'aria-label': ariaLabel, children, label }) => {
    return React.createElement('button', {
      type: 'button',
      className,
      'aria-label': ariaLabel,
      onClick: onClick
    },
    icon && React.createElement('i', { className: icon }),
    label || children
    );
  }
}));

vi.mock('primereact/card', () => ({
  Card: ({ title, children }) => React.createElement('div', { className: 'p-card' },
    title && React.createElement('h2', { className: 'p-card-title' }, title),
    React.createElement('div', { className: 'p-card-content' }, children)
  )
}));

vi.mock('primereact/dialog', () => ({
  Dialog: ({ visible, onHide, children }) => visible ? React.createElement('div', { className: 'p-dialog' },
    React.createElement('button', { onClick: onHide, 'aria-label': 'Close' }, '×'),
    React.createElement('div', { className: 'p-dialog-content' }, children)
  ) : null
}));

vi.mock('primereact/inputtext', () => ({
  InputText: (props) => React.createElement('input', {
    type: 'text',
    className: 'p-inputtext',
    ...props
  })
}));

vi.mock('primereact/inputnumber', () => ({
  InputNumber: (props) => React.createElement('input', {
    type: 'number',
    className: 'p-inputnumber',
    ...props
  })
}));

vi.mock('primereact/inputtextarea', () => ({
  InputTextarea: (props) => React.createElement('textarea', {
    className: 'p-inputtextarea',
    ...props
  })
}));

vi.mock('primereact/dropdown', () => ({
  Dropdown: (props) => React.createElement('select', {
    className: 'p-dropdown',
    ...props
  })
}));

vi.mock('primereact/multiselect', () => ({
  MultiSelect: (props) => React.createElement('div', { className: 'p-multiselect' },
    React.createElement('select', { multiple: true, ...props })
  )
}));

vi.mock('primereact/calendar', () => ({
  Calendar: (props) => React.createElement('input', {
    type: 'date',
    className: 'p-calendar',
    ...props
  })
}));

vi.mock('primereact/datatable', () => ({
  DataTable: ({ value, children }) => React.createElement('table', { className: 'p-datatable' },
    React.createElement('tbody', {}, children)
  )
}));

vi.mock('primereact/column', () => ({
  Column: ({ field, header, body }) => React.createElement('td', { 'data-field': field },
    header || body || field
  )
}));

vi.mock('primereact/tag', () => ({
  Tag: ({ value, severity }) => React.createElement('span', {
    className: `p-tag p-tag-${severity || 'info'}`
  }, value)
}));

vi.mock('primereact/confirmdialog', () => ({
  ConfirmDialog: () => null,
  confirmDialog: vi.fn()
}));

vi.mock('primereact/fileupload', () => ({
  FileUpload: (props) => React.createElement('input', {
    type: 'file',
    className: 'p-fileupload',
    ...props
  })
}));

vi.mock('primereact/divider', () => ({
  Divider: (props) => React.createElement('hr', { className: 'p-divider' })
}));

vi.mock('primereact/chart', () => ({
  Chart: () => React.createElement('div', { 'data-testid': 'chart-mock' })
}));

// Mock the AppContext
vi.mock('../context/AppContext', () => {
  const mockValue = {
    loading: false,
    sidebarVisible: true,
    toggleSidebar: vi.fn(),
    billTypes: [],
    partners: [],
    bills: [],
    billEntries: [],
    showToast: vi.fn(),
    clearToast: vi.fn()
  };

  const MockAppProvider = ({ children }) => {
    return React.createElement(
      React.createContext(mockValue).Provider,
      { value: mockValue },
      children
    );
  };

  return {
    __esModule: true,
    AppProvider: MockAppProvider,
    useApp: () => mockValue,
    AppContext: React.createContext(mockValue)
  };
});

// Import after all mocks are set up
import { PrimeReactProvider } from 'primereact/api';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { AppProvider } from '../context/AppContext';

// Helper function to wrap components with providers
const renderWithProviders = (component) => {
  return render(
    <PrimeReactProvider>
      <AppProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AppProvider>
    </PrimeReactProvider>
  );
};

describe('Layout Components', () => {
  describe('Header', () => {
    it('should render app title', () => {
      renderWithProviders(<Header />);

      expect(screen.getByText('BillBird')).toBeInTheDocument();
    });

    it('should render menu toggle button', () => {
      renderWithProviders(<Header />);

      const menuButton = screen.getByRole('button', { name: /toggle sidebar/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('should have responsive design', () => {
      const { container } = renderWithProviders(<Header />);

      const headerElement = container.querySelector('header');
      expect(headerElement).toBeInTheDocument();
    });
  });
});

describe('Page Components', () => {
  describe('HomePage', () => {
    it('should render dashboard title', async () => {
      const HomePage = (await import('../pages/HomePage')).default;
      
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render statistics cards', async () => {
      const HomePage = (await import('../pages/HomePage')).default;
      
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Total Bills')).toBeInTheDocument();
      expect(screen.getByText('Partners')).toBeInTheDocument();
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
      expect(screen.getByText('Pending Bills')).toBeInTheDocument();
    });

    it('should render chart section', async () => {
      const HomePage = (await import('../pages/HomePage')).default;
      
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Usage Trends (Last 6 Months)')).toBeInTheDocument();
    });

    it('should render bill types distribution section', async () => {
      const HomePage = (await import('../pages/HomePage')).default;
      
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Bill Types Distribution')).toBeInTheDocument();
    });

    it('should render recent bills section', async () => {
      const HomePage = (await import('../pages/HomePage')).default;
      
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Recent Bills')).toBeInTheDocument();
    });
  });

  describe('BillTypesPage', () => {
    it('should render page title', async () => {
      const BillTypesPage = (await import('../pages/BillTypesPage')).default;
      
      renderWithProviders(<BillTypesPage />);

      expect(screen.getByText('Bill Types')).toBeInTheDocument();
    });

    it('should render add button', async () => {
      const BillTypesPage = (await import('../pages/BillTypesPage')).default;
      
      renderWithProviders(<BillTypesPage />);

      // BillTypesPage has multiple "Add Bill Type" buttons (header and empty state)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
      expect(addButtons[0]).toBeInTheDocument();
    });
  });

  describe('PartnersPage', () => {
    it('should render page title', async () => {
      const PartnersPage = (await import('../pages/PartnersPage')).default;
      
      renderWithProviders(<PartnersPage />);

      expect(screen.getByText('Partners')).toBeInTheDocument();
    });

    it('should render add button', async () => {
      const PartnersPage = (await import('../pages/PartnersPage')).default;
      
      renderWithProviders(<PartnersPage />);

      // PartnersPage has multiple "Add Partner" buttons (header and empty state)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
      expect(addButtons[0]).toBeInTheDocument();
    });
  });

  describe('BillsPage', () => {
    it('should render page title', async () => {
      const BillsPage = (await import('../pages/BillsPage')).default;
      
      renderWithProviders(<BillsPage />);

      expect(screen.getByText('Bills')).toBeInTheDocument();
    });

    it('should render add button', async () => {
      const BillsPage = (await import('../pages/BillsPage')).default;
      
      renderWithProviders(<BillsPage />);

      // BillsPage has multiple "Add Bill" buttons (header and empty state)
      const addButtons = screen.getAllByRole('button', { name: /add bill/i });
      expect(addButtons.length).toBeGreaterThan(0);
      expect(addButtons[0]).toBeInTheDocument();
    });
  });

  describe('SettingsPage', () => {
    it('should render page title', async () => {
      const SettingsPage = (await import('../pages/SettingsPage')).default;
      
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render data management section', async () => {
      const SettingsPage = (await import('../pages/SettingsPage')).default;
      
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText('Data Management')).toBeInTheDocument();
    });

    it('should render export button', async () => {
      const SettingsPage = (await import('../pages/SettingsPage')).default;
      
      renderWithProviders(<SettingsPage />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });
  });
});

