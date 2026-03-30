import React, { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  format,
  getDay,
  parse,
  startOfWeek,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  AlertCircle,
  ChevronDown,
  Filter,
  Plus,
} from 'lucide-react';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { Alert, Button, Dropdown, Form, Spinner } from 'react-bootstrap';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useCalendar } from '../../context/CalendarContext';
import { BookingPanel } from './BookingPanel';
import { BookingFormModal } from './BookingFormModal';

const locales = { 'en-US': enUS };
const DnDCalendar = withDragAndDrop(Calendar);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const STATUS_LABELS = {
  all: 'All statuses',
  Confirmed: 'Confirmed',
  'Check-in (In Progress)': 'In progress',
  Cancelled: 'Cancelled',
};

function buildDateTime(baseDate, timeValue) {
  const [hours = '0', minutes = '0'] = String(timeValue || '09:00').split(':');
  const eventDate = new Date(baseDate);
  eventDate.setHours(Number(hours), Number(minutes), 0, 0);
  return eventDate;
}

function EventCard({ event }) {
  return (
    <div className={`calendar-event-card status-${event.statusKey}`}>
      <strong>{event.customerName}</strong>
      <span>{event.serviceName}</span>
      <div className="event-card-meta">
        <small>T {event.therapistName}</small>
        <small>R {event.roomLabel}</small>
      </div>
      <small>{event.timeLabel}</small>
    </div>
  );
}

function ResourceHeader({ label, resource }) {
  return (
    <div
      className={`resource-pill ${String(resource?.gender || '').toLowerCase() === 'female'
          ? 'is-female'
          : 'is-male'
        }`}
    >
      <strong>{label}</strong>
      <span>{resource?.gender || 'Therapist'}</span>
    </div>
  );
}

function CalendarToolbar({ date, onNavigate }) {
  return (
    <div className="calendar-toolbar">
      <div>
        <p className="toolbar-label">Schedule date</p>
        <h3>{format(date, 'EEEE, dd MMM yyyy')}</h3>
      </div>

      <div className="toolbar-actions">
        <button type="button" onClick={() => onNavigate('PREV')}>
          Previous
        </button>
        <button type="button" onClick={() => onNavigate('TODAY')}>
          Today
        </button>
        <button type="button" onClick={() => onNavigate('NEXT')}>
          Next
        </button>
      </div>
    </div>
  );
}

export function CalendarBoard() {
  const {
    therapists,
    bookings,
    loading,
    error,
    uiMessage,
    fetchData,
    searchQuery,
    moveBooking,
    saveBooking,
    clearError,
    clearUiMessage,
  } = useCalendar();
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 22));
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [formMode, setFormMode] = useState(null);
  const [draftBooking, setDraftBooking] = useState(null);
  const [draftSlot, setDraftSlot] = useState({ start: new Date(2026, 2, 22, 10, 0), resourceId: '' });

  useEffect(() => {
    fetchData(format(selectedDate, 'dd-MM-yyyy'));
  }, [fetchData, selectedDate]);

  useEffect(() => {
    if (!uiMessage) return undefined;
    const timer = window.setTimeout(() => clearUiMessage(), 3500);
    return () => window.clearTimeout(timer);
  }, [clearUiMessage, uiMessage]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const customerName = booking.customer?.name || '';
        const serviceName = booking.items?.[0]?.service?.name || '';
        const therapistId = String(
          booking.items?.[0]?.therapist?.id || booking.items?.[0]?.therapist || ''
        );

        const matchesQuery =
          !normalizedQuery ||
          customerName.toLowerCase().includes(normalizedQuery) ||
          serviceName.toLowerCase().includes(normalizedQuery);
        const matchesTherapist =
          selectedTherapist === 'all' || therapistId === selectedTherapist;
        const matchesStatus =
          selectedStatus === 'all' || booking.status === selectedStatus;

        return matchesQuery && matchesTherapist && matchesStatus;
      }),
    [bookings, normalizedQuery, selectedStatus, selectedTherapist]
  );

  const events = useMemo(
    () =>
      filteredBookings
        .map((booking) => {
          const item = booking.items?.[0];
          if (!item) return null;

          const resourceId = item.therapist?.id || item.therapist;
          const start = buildDateTime(selectedDate, item.start_time);
          const duration = Number(item.duration || 60);
          const end = new Date(start.getTime() + duration * 60 * 1000);
          const customerName = booking.customer?.name || 'Guest';
          const serviceName = item.service?.name || 'Spa service';
          const therapistName =
            therapists.find((therapist) => therapist.id === resourceId)?.name || 'Requested';
          const statusKey =
            booking.status === 'Confirmed'
              ? 'confirmed'
              : booking.status?.includes('Check-in')
                ? 'progress'
                : booking.status === 'Cancelled'
                  ? 'cancelled'
                  : 'pending';

          return {
            id: booking.id,
            title: customerName,
            start,
            end,
            resourceId,
            booking,
            customerName,
            serviceName,
            therapistName,
            roomLabel: booking.room_label || 'Requested',
            statusKey,
            timeLabel: `${format(start, 'hh:mm a')} - ${format(end, 'hh:mm a')}`,
          };
        })
        .filter(Boolean),
    [filteredBookings, selectedDate, therapists]
  );

  const resources = useMemo(
    () =>
      therapists.map((therapist) => ({
        resourceId: therapist.id,
        resourceTitle: therapist.name,
        gender: therapist.gender,
      })),
    [therapists]
  );

  const handleNavigate = (action) => {
    if (action === 'TODAY') {
      setSelectedDate(new Date());
      return;
    }

    setSelectedDate((current) => addDays(current, action === 'NEXT' ? 1 : -1));
  };

  const eventStyleGetter = (event) => ({
    className: `event-shell event-${event.statusKey}`,
  });

  const openCreateModal = (slotInfo) => {
    setDraftSlot({ start: slotInfo.start, resourceId: slotInfo.resourceId || '' });
    setDraftBooking(null);
    setFormMode('create');
  };

  const openEditModal = (booking) => {
    setDraftBooking(booking);
    setSelectedBookingId(null);
    setFormMode('edit');
  };

  const handleEventDrop = async ({ event, start, resourceId }) => {
    const therapistId = resourceId || event.resourceId;
    await moveBooking(event.id, therapistId, format(start, 'HH:mm'));
  };

  const handleEventResize = async ({ event, start, end }) => {
    await saveBooking(event.id, {
      date: format(selectedDate, 'dd-MM-yyyy'),
      customerName: event.booking.customer?.name || '',
      customerId: event.booking.customer?.id || event.booking.customer_id || '',
      serviceName: event.serviceName,
      serviceId: event.booking.items?.[0]?.service?.id || '',
      therapist: String(event.resourceId || ''),
      room: event.booking.room_label || event.booking.items?.[0]?.room_segments?.[0]?.item_type || '',
      roomId: event.booking.room_id || event.booking.items?.[0]?.room_segments?.[0]?.room_id || '',
      requestType: event.booking.request_type || '',
      source: event.booking.source || event.booking.request_type || '',
      duration: String(Math.max(15, Math.round((end - start) / (1000 * 60)))),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      status: event.booking.status || 'Confirmed',
      notes: event.booking.notes || '',
      price: event.booking.items?.[0]?.price || '0.00',
      serviceRequest: event.booking.items?.[0]?.service_request || '',
    });
  };

  if (loading && therapists.length === 0) {
    return (
      <div className="calendar-loading">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <div className="schedule-page">
        {error ? (
          <Alert variant="danger" className="calendar-alert" dismissible onClose={clearError}>
            <AlertCircle size={16} /> {error}
          </Alert>
        ) : null}

        {uiMessage ? (
          <Alert variant="success" className="calendar-alert" dismissible onClose={clearUiMessage}>
            {uiMessage.text}
          </Alert>
        ) : null}

        <section className="calendar-content-shell">
          <div className="calendar-inline-toolbar">
            <div className="calendar-inline-title">
              <p className="hero-kicker">Booking Calendar</p>
              <h3>Schedule</h3>
            </div>

            <div className="calendar-inline-actions">
              <Dropdown align="end">
                <Dropdown.Toggle className="filter-toggle" variant="light">
                  <Filter size={16} />
                  Filters
                  <ChevronDown size={14} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="filter-menu">
                  <div className="filter-menu-body">
                    <Form.Group className="mb-3">
                      <Form.Label>Therapist</Form.Label>
                      <Form.Select
                        value={selectedTherapist}
                        onChange={(event) => setSelectedTherapist(event.target.value)}
                      >
                        <option value="all">All therapists</option>
                        {therapists.map((therapist) => (
                          <option key={therapist.id} value={String(therapist.id)}>
                            {therapist.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              <Button
                variant="dark"
                className="hero-create-button"
                onClick={() =>
                  openCreateModal({
                    start: buildDateTime(selectedDate, '10:00'),
                    resourceId: therapists[0]?.id || '',
                  })
                }
              >
                <Plus size={16} />
                Add Booking
              </Button>
            </div>
          </div>

          <section className="calendar-surface calendar-surface--full">
            <DnDCalendar
              localizer={localizer}
              date={selectedDate}
              defaultView={Views.DAY}
              events={events}
              resources={resources}
              resourceIdAccessor="resourceId"
              resourceTitleAccessor="resourceTitle"
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 260px)' }}
              toolbar
              views={[Views.DAY]}
              step={15}
              timeslots={4}
              min={buildDateTime(selectedDate, '09:00')}
              max={buildDateTime(selectedDate, '21:00')}
              scrollToTime={buildDateTime(selectedDate, '09:00')}
              selectable
              resizable
              formats={{
                timeGutterFormat: 'hh:mm a',
                eventTimeRangeFormat: ({ start, end }) =>
                  `${format(start, 'hh:mm a')} - ${format(end, 'hh:mm a')}`,
              }}
              onNavigate={setSelectedDate}
              onSelectEvent={(event) => setSelectedBookingId(event.id)}
              onSelectSlot={openCreateModal}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: (props) => (
                  <CalendarToolbar {...props} onNavigate={handleNavigate} />
                ),
                event: EventCard,
                resourceHeader: ResourceHeader,
              }}
            />
          </section>
        </section>
      </div>

      <BookingPanel
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onEdit={openEditModal}
      />
      <BookingFormModal
        show={Boolean(formMode)}
        mode={formMode}
        booking={draftBooking}
        defaultDate={draftSlot.start}
        defaultTherapistId={draftSlot.resourceId}
        onClose={() => setFormMode(null)}
      />
    </>
  );
}
