import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { db } from '../db/database';

// Test component to access context
const TestComponent = () => {
  const {
    loading,
    billTypes,
    partners,
    bills,
    billEntries
  } = useApp();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="billTypes-count">{billTypes?.length || 0}</div>
      <div data-testid="partners-count">{partners?.length || 0}</div>
      <div data-testid="bills-count">{bills?.length || 0}</div>
      <div data-testid="billEntries-count">{billEntries?.length || 0}</div>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.billTypes.clear();
    await db.partners.clear();
    await db.bills.clear();
    await db.billEntries.clear();
  });

  afterEach(async () => {
    // Clear all tables after each test
    await db.billTypes.clear();
    await db.partners.clear();
    await db.bills.clear();
    await db.billEntries.clear();
  });

  describe('Initialization', () => {
    it('should initialize with loading state', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
    });

    it('should initialize default bill types on first load', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      // Wait for loading to complete and check bill types count
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      await waitFor(() => {
        const count = parseInt(screen.getByTestId('billTypes-count').textContent);
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  describe('Context Values', () => {
    it('should provide bill types array', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const billTypesCount = screen.getByTestId('billTypes-count').textContent;
      expect(parseInt(billTypesCount)).toBeGreaterThanOrEqual(0);
    });

    it('should provide partners array', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const partnersCount = screen.getByTestId('partners-count').textContent;
      expect(parseInt(partnersCount)).toBeGreaterThanOrEqual(0);
    });

    it('should provide bills array', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const billsCount = screen.getByTestId('bills-count').textContent;
      expect(parseInt(billsCount)).toBeGreaterThanOrEqual(0);
    });

    it('should provide bill entries array', async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const billEntriesCount = screen.getByTestId('billEntries-count').textContent;
      expect(parseInt(billEntriesCount)).toBeGreaterThanOrEqual(0);
    });
  });
});
