import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock3, Sparkles, UserRound } from 'lucide-react';
import { Alert, Badge, Button, Form, Offcanvas } from 'react-bootstrap';
import { useCalendar } from '../../context/CalendarContext';

export function BookingPanel({ bookingId, onClose, onEdit }) {
  const {
    bookings,
    therapists,
    bookingDetails,
    fetchBookingDetails,
    saveBooking,
    cancelBooking,
    deleteBooking,
    saving,
    currentDate,
  } = useCalendar();
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState('Confirmed');

  const booking = bookings.find((item) => item.id === bookingId);
  const detailedBooking = bookingDetails[bookingId] || booking;
  const serviceItem = detailedBooking?.items?.[0] || booking?.items?.[0];
  const therapistName =
    therapists.find(
      (therapist) => therapist.id === (serviceItem?.therapist?.id || serviceItem?.therapist)
    )?.name || 'Unassigned';

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    }
  }, [bookingId, fetchBookingDetails]);

  useEffect(() => {
    if (booking?.status) {
      setDraftStatus(booking.status);
    }
    setEditing(false);
  }, [bookingId, booking?.status]);

  if (!booking) return null;

  const statusVariant =
    booking.status === 'Confirmed'
      ? 'success'
      : booking.status?.includes('Check-in')
        ? 'warning'
        : booking.status === 'Cancelled'
          ? 'danger'
          : 'secondary';

  const handleSave = async () => {
    await saveBooking(booking.id, {
      date: currentDate || format(new Date(), 'dd-MM-yyyy'),
      customerId: booking.customer?.id || booking.customer_id || '',
      customerName: booking.customer?.name || '',
      serviceName: serviceItem?.service?.name || '',
      serviceId: serviceItem?.service?.id || '',
      therapist: String(serviceItem?.therapist?.id || serviceItem?.therapist || ''),
      room: booking.room_label || serviceItem?.room_segments?.[0]?.item_type || '',
      roomId: booking.room_id || serviceItem?.room_segments?.[0]?.room_id || '',
      requestType: booking.request_type || '',
      source: booking.source || booking.request_type || '',
      duration: String(serviceItem?.duration || 60),
      startTime: serviceItem?.start_time || '09:00',
      endTime: serviceItem?.end_time || serviceItem?.start_time || '09:00',
      status: draftStatus,
      notes: booking.notes || '',
      price: serviceItem?.price || '0.00',
      serviceRequest: serviceItem?.service_request || '',
    });
    setEditing(false);
  };

  return (
    <Offcanvas
      show={Boolean(bookingId)}
      onHide={onClose}
      placement="end"
      className="booking-drawer"
    >
      <Offcanvas.Header closeButton className="border-0 pb-0">
        <Offcanvas.Title>Booking #{booking.id}</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="drawer-body">
        <section className="drawer-hero">
          <div>
            <p>Client</p>
            <h4>{booking.customer?.name || 'Guest booking'}</h4>
          </div>
          <Badge bg={statusVariant}>{booking.status || 'Pending'}</Badge>
        </section>

        <section className="drawer-info-grid">
          <article>
            <span>
              <Sparkles size={15} />
              Service
            </span>
            <strong>{serviceItem?.service?.name || 'Spa treatment'}</strong>
          </article>
          <article>
            <span>
              <Clock3 size={15} />
              Duration
            </span>
            <strong>{serviceItem?.duration || 60} mins</strong>
          </article>
          <article>
            <span>
              <UserRound size={15} />
              Therapist
            </span>
            <strong>{therapistName}</strong>
          </article>
          <article>
            <span>Room</span>
            <strong>{detailedBooking?.room_label || serviceItem?.room_segments?.[0]?.item_type || 'Not assigned'}</strong>
          </article>
        </section>

        {detailedBooking?.notes || detailedBooking?.note ? (
          <Alert variant="light">{detailedBooking?.notes || detailedBooking?.note}</Alert>
        ) : null}

        {!editing ? (
          <div className="drawer-actions">
            <Button variant="dark" onClick={() => onEdit?.(booking)}>
              Edit booking
            </Button>
            <Button
              variant="outline-danger"
              onClick={async () => {
                await cancelBooking(booking.id);
                onClose();
              }}
              disabled={saving}
            >
              Cancel booking
            </Button>
          </div>
        ) : (
          <div className="drawer-form">
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value)}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Check-in (In Progress)">Check-in (In Progress)</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>

            <div className="drawer-actions">
              <Button variant="dark" onClick={handleSave}>
                Save status
              </Button>
              <Button variant="outline-secondary" onClick={() => setEditing(false)}>
                Close editor
              </Button>
            </div>
          </div>
        )}

        <div className="drawer-actions">
          {!editing ? null : null}
          <Button
            variant="outline-secondary"
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? 'Hide quick status' : 'Quick status'}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        <div className="drawer-actions">
          <Button
            variant="outline-danger"
            onClick={async () => {
              await deleteBooking(booking.id);
              onClose();
            }}
            disabled={saving}
          >
            Delete booking
          </Button>
          <Button variant="outline-secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
