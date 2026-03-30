import React, { useEffect, useMemo, useState } from 'react';
import { format, subYears } from 'date-fns';
import { Alert, Badge, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Mail, Phone, Search, UserRound } from 'lucide-react';
import { usersApi } from '../api/endpoints';
import { getApiErrorMessage } from '../utils/apiError';
import { logger } from '../utils/logger';
import { useCalendar } from '../context/CalendarContext';

function extractCustomers(response) {
  const list =
    response?.data?.data?.list?.users ||
    response?.data?.data?.data ||
    response?.data?.data?.list ||
    response?.data?.data ||
    response?.data ||
    [];

  return Array.isArray(list) ? list : [];
}

export function ClientsPage() {
  const { searchQuery } = useCalendar();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      setError('');
      try {
        const from = format(subYears(new Date(), 1), 'yyyy-MM-dd');
        const to = format(new Date(), 'yyyy-MM-dd');
        const response = await usersApi.getList({
          pagination: 1,
          daterange: `${from} / ${to}`,
        });
        const nextClients = extractCustomers(response);
        setClients(nextClients);
        logger.info('Fetched clients list', { count: nextClients.length });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load clients'));
        logger.error('Failed to load clients', err);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesQuery =
          !normalizedQuery ||
          client.name?.toLowerCase().includes(normalizedQuery) ||
          client.email?.toLowerCase().includes(normalizedQuery) ||
          client.contact_number?.toLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === 'all' || String(client.status) === statusFilter;

        return matchesQuery && matchesStatus;
      }),
    [clients, normalizedQuery, statusFilter]
  );

  if (loading) {
    return (
      <div className="calendar-loading">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <section className="clients-page">
      <div className="clients-header-card">
        <div>
          <p className="hero-kicker">Client Directory</p>
          <h3>Customers</h3>
          <span>Manage your existing spa clients and membership-ready contacts.</span>
        </div>

        <div className="clients-header-actions">
          <InputGroup className="clients-inline-search">
            <InputGroup.Text>
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control value={searchQuery} readOnly placeholder="Use the top search to filter clients" />
          </InputGroup>

          <Form.Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="clients-filter-select"
          >
            <option value="all">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Form.Select>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="clients-summary-row">
        <div className="clients-summary-pill">
          <strong>{filteredClients.length}</strong>
          <span>Visible clients</span>
        </div>
        <div className="clients-summary-pill">
          <strong>{clients.filter((client) => String(client.status) === '1').length}</strong>
          <span>Active clients</span>
        </div>
      </div>

      <div className="clients-grid">
        {filteredClients.length ? (
          filteredClients.map((client) => (
            <article key={client.id} className="client-card">
              <div className="client-card-head">
                <div className="client-avatar">
                  <UserRound size={18} />
                </div>
                <div>
                  <strong>{client.name || 'Unnamed Customer'}</strong>
                  <span>#{client.id}</span>
                </div>
                <Badge bg={String(client.status) === '1' ? 'success' : 'secondary'}>
                  {String(client.status) === '1' ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="client-card-meta">
                <div>
                  <Mail size={15} />
                  <span>{client.email || 'No email'}</span>
                </div>
                <div>
                  <Phone size={15} />
                  <span>{client.contact_number || 'No phone'}</span>
                </div>
              </div>

              <div className="client-card-foot">
                <span>Role: {(client.role || []).join(', ') || 'Customer'}</span>
                <span>Created: {client.created_at || '-'}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="clients-empty-state">No clients match the current filter.</div>
        )}
      </div>
    </section>
  );
}
