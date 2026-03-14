import React, { useMemo } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { useApp } from '../context/AppContext';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

const chartPalette = ['#0f766e', '#2563eb', '#f59e0b', '#ef4444', '#0ea5e9', '#14b8a6'];

const HomePage = () => {
  const { bills, billTypes, partners, billEntries } = useApp();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalBills = bills.length;
    const totalPartners = partners.length;
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const pendingBills = bills.filter(b => b.status === 'pending').length;

    return {
      totalBills,
      totalPartners,
      totalAmount,
      pendingBills
    };
  }, [bills, partners]);

  // Prepare chart data for usage trends
  const chartData = useMemo(() => {
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    const labels = last6Months.map(date => format(date, 'MMM yyyy'));

    // Group bills by type and month
    const billsByType = {};
    billTypes.forEach((type, index) => {
      billsByType[type.id] = {
        label: type.name,
        data: new Array(6).fill(0),
        borderColor: chartPalette[index % chartPalette.length],
        backgroundColor: 'transparent',
        tension: 0.4
      };
    });

    bills.forEach(bill => {
      const billDate = new Date(bill.billDate);
      const monthIndex = last6Months.findIndex(month => 
        billDate >= startOfMonth(month) && billDate <= endOfMonth(month)
      );
      
      if (monthIndex !== -1 && billsByType[bill.billTypeId]) {
        billsByType[bill.billTypeId].data[monthIndex] += bill.totalAmount || 0;
      }
    });

    return {
      labels,
      datasets: Object.values(billsByType).filter(ds => ds.data.some(d => d > 0))
    };
  }, [bills, billTypes]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value;
          }
        }
      }
    }
  };

  // Prepare partner split trend data (each partner's monthly total split amount)
  const partnerChartData = useMemo(() => {
    if (partners.length === 0 || billEntries.length === 0) return { labels: [], datasets: [] };

    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });
    const labels = last6Months.map(date => format(date, 'MMM yyyy'));

    const datasets = partners.map((partner, idx) => ({
      label: partner.name,
      data: last6Months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthBills = bills.filter(bill => {
          const d = new Date(bill.billDate);
          return d >= monthStart && d <= monthEnd;
        });
        return monthBills.reduce((sum, bill) => {
          const entry = billEntries.find(e => e.billId === bill.id && e.partnerId === partner.id);
          return sum + (entry?.splitAmount || 0);
        }, 0);
      }),
      borderColor: chartPalette[idx % chartPalette.length],
      backgroundColor: chartPalette[idx % chartPalette.length] + '22',
      fill: false,
      tension: 0.4
    }));

    return {
      labels,
      datasets: datasets.filter(ds => ds.data.some(d => d > 0))
    };
  }, [bills, partners, billEntries]);

  // Get recent bills
  const recentBills = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [bills]);

  // Get bill type name
  const getBillTypeName = (billTypeId) => {
    const type = billTypes.find(t => t.id === billTypeId);
    return type ? type.name : 'Unknown';
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'overdue':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  return (
    <div className="page-shell fade-in">
      <section className="page-hero">
        <div>
          <span className="page-hero__eyebrow">Overview</span>
          <h2 className="page-hero__title">Dashboard</h2>
          <p className="page-hero__description">
            Keep bills, partners, and split health visible at a glance with a cleaner, mobile-friendly overview.
          </p>
        </div>
        <div className="page-hero__aside">
          <div className="hero-note">
            <span className="hero-note__label">This month</span>
            <strong>{recentBills.length} recent bills</strong>
            <span>Updated from your latest records and payment statuses.</span>
          </div>
        </div>
      </section>

      <div className="grid mb-4">
        <div className="col-12 md:col-6 lg:col-3">
          <div className="stats-card stats-card--ocean">
            <div className="stats-card-value">{stats.totalBills}</div>
            <div className="stats-card-label">Total Bills</div>
          </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <div className="stats-card stats-card--mint">
            <div className="stats-card-value">{stats.totalPartners}</div>
            <div className="stats-card-label">Partners</div>
          </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <div className="stats-card stats-card--amber">
            <div className="stats-card-value">₹{stats.totalAmount.toFixed(2)}</div>
            <div className="stats-card-label">Total Amount</div>
          </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <div className="stats-card stats-card--coral">
            <div className="stats-card-value">{stats.pendingBills}</div>
            <div className="stats-card-label">Pending Bills</div>
          </div>
        </div>
      </div>

      <div className="grid mb-4">
        <div className="col-12 lg:col-8">
          <Card className="panel-card h-full">
            <div className="card-header">
              <h3 className="card-title">Usage Trends (Last 6 Months)</h3>
            </div>
            <div className="chart-container">
              {chartData.datasets.length > 0 ? (
                <Chart type="line" data={chartData} options={chartOptions} />
              ) : (
                <div className="empty-state">
                  <i className="pi pi-chart-line empty-state-icon"></i>
                  <h4 className="empty-state-title">No Data Available</h4>
                  <p className="empty-state-description">Create some bills to see usage trends</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="col-12 lg:col-4">
          <Card className="panel-card h-full">
            <div className="card-header">
              <h3 className="card-title">Bill Types Distribution</h3>
            </div>
            <div className="chart-container">
              <Chart 
                type="doughnut" 
                data={{
                  labels: billTypes.map(t => t.name),
                  datasets: [{
                    data: billTypes.map(type => 
                      bills.filter(b => b.billTypeId === type.id).length
                    ),
                    backgroundColor: billTypes.map((_, index) => chartPalette[index % chartPalette.length])
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Partner Split Trends */}
      <div className="grid mb-4">
        <div className="col-12">
          <Card className="panel-card">
            <div className="card-header">
              <h3 className="card-title">Partner Split Trends (Last 6 Months)</h3>
            </div>
            <div className="chart-container">
              {partnerChartData.datasets.length > 0 ? (
                <Chart type="line" data={partnerChartData} options={chartOptions} />
              ) : (
                <div className="empty-state">
                  <i className="pi pi-users empty-state-icon"></i>
                  <h4 className="empty-state-title">No Partner Data</h4>
                  <p className="empty-state-description">
                    Add partners and create bills to see each partner's share trend over time
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="panel-card">
        <div className="card-header">
          <h3 className="card-title">Recent Bills</h3>
        </div>
        {recentBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map(bill => (
                  <tr key={bill.id}>
                    <td className="font-medium">{bill.title}</td>
                    <td>{getBillTypeName(bill.billTypeId)}</td>
                    <td>₹{bill.totalAmount?.toFixed(2)}</td>
                    <td>{format(new Date(bill.billDate), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(bill.status)}`}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="pi pi-file empty-state-icon"></i>
            <h4 className="empty-state-title">No Bills Yet</h4>
            <p className="empty-state-description">Create your first bill to get started</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HomePage;
