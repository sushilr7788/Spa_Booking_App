import React, { useEffect, useMemo, useState } from 'react';
import { addMinutes, format } from 'date-fns';
import { Alert, Button, Form, Offcanvas } from 'react-bootstrap';
import { useCalendar } from '../../context/CalendarContext';

const REQUEST_TYPE_OPTIONS = ['Walk-in', 'WhatsApp', 'By Phone', 'Online Booking'];
const STATUS_OPTIONS = ['Confirmed', 'Check-in (In Progress)', 'Cancelled'];

function buildInitialState(booking, defaultDate, defaultTherapistId) {
  const item = booking?.items?.[0];
  const startTime = item?.start_time || format(defaultDate, 'HH:mm');
  const startDateTime = new Date(defaultDate);
  const [hours = '9', minutes = '0'] = startTime.split(':');
  startDateTime.setHours(Number(hours), Number(minutes), 0, 0);
  const endTime = item?.end_time || format(addMinutes(startDateTime, Number(item?.duration || 60)), 'HH:mm');
  const roomSegment = item?.room_segments?.[0];

  return {
    date: format(defaultDate, 'dd-MM-yyyy'),
    customerId: String(booking?.customer?.id || booking?.customer_id || ''),
    customerName: booking?.customer?.name || '',
    customerEmail: booking?.customer?.email || '',
    customerPhone: booking?.customer?.contact_number || '',
    customerGender: booking?.customer?.gender || 'male',
    serviceName: item?.service?.name || '',
    serviceId: String(item?.service?.id || ''),
    therapist: String(item?.therapist?.id || item?.therapist || defaultTherapistId || ''),
    room: booking?.room_label || roomSegment?.item_type || '',
    roomId: String(booking?.room_id || roomSegment?.room_id || roomSegment?.item_id || ''),
    roomItemType: roomSegment?.item_type || roomSegment?.item_name || '',
    requestType: booking?.request_type || REQUEST_TYPE_OPTIONS[0],
    duration: String(item?.duration || 60),
    startTime,
    endTime,
    status: booking?.status || 'Confirmed',
    notes: booking?.notes || '',
    source: booking?.source || booking?.request_type || REQUEST_TYPE_OPTIONS[0],
    paymentType: booking?.payment_type || 'payatstore',
    price: item?.price || '0.00',
    serviceRequest: item?.service_request || '',
  };
}

export function BookingFormModal({
  show,
  mode,
  booking,
  defaultDate,
  defaultTherapistId,
  onClose,
}) {
  const {
    therapists,
    services,
    rooms,
    customers,
    createBooking,
    saveBooking,
    createCustomer,
    fetchSupportData,
    saving,
    supportLoading,
  } = useCalendar();
  const [formState, setFormState] = useState(
    buildInitialState(booking, defaultDate, defaultTherapistId)
  );
  const [submitError, setSubmitError] = useState('');
  const [showCustomerFields, setShowCustomerFields] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFormState(buildInitialState(booking, defaultDate, defaultTherapistId));
    setSubmitError('');
    setShowCustomerFields(false);
  }, [booking, defaultDate, defaultTherapistId, show]);

  useEffect(() => {
    if (!show) return;
    fetchSupportData({
      dateStr: format(defaultDate, 'dd-MM-yyyy'),
      startTime: formState.startTime,
      duration: Number(formState.duration || 60),
    });
  }, [defaultDate, fetchSupportData, formState.duration, formState.startTime, show]);

  const customerOptions = useMemo(
    () => (Array.isArray(customers) ? customers : []).map((customer) => ({
      id: customer.id,
      name: customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim(),
      email: customer.email,
      phone: customer.contact_number,
      gender: customer.gender,
    })),
    [customers]
  );

  const serviceOptions = Array.isArray(services) ? services : [];
  const roomOptions = Array.isArray(rooms) ? rooms : [];
  const therapistOptions = Array.isArray(therapists) ? therapists : [];

  const updateField = (field, value) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'duration' || field === 'startTime') {
        const start = new Date(defaultDate);
        const [hours = '9', minutes = '0'] = (field === 'startTime' ? value : prev.startTime).split(':');
        start.setHours(Number(hours), Number(minutes), 0, 0);
        next.endTime = format(
          addMinutes(start, Number(field === 'duration' ? value : prev.duration || 60)),
          'HH:mm'
        );
      }
      return next;
    });
  };

  const validate = () => {
    if (!formState.customerId && !showCustomerFields) {
      return 'Select an existing customer or create one.';
    }
    if (showCustomerFields && !formState.customerName.trim()) {
      return 'Customer name is required.';
    }
    if (!formState.serviceId) return 'Service selection is required.';
    if (!formState.therapist) return 'Therapist selection is required.';
    if (!formState.roomId) return 'Room selection is required.';
    if (!formState.startTime) return 'Start time is required.';
    if (!Number(formState.duration)) return 'Duration must be a valid number.';
    return '';
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    try {
      let customerId = formState.customerId;
      if (!customerId) {
        const createdCustomer = await createCustomer({
          name: formState.customerName,
          lastname: '',
          email: formState.customerEmail || `guest+${Date.now()}@hipster-inc.com`,
          contact_number: formState.customerPhone || '+6500000000',
          gender: formState.customerGender || 'male',
          status: '1',
          membership: '0',
        });
        customerId = String(createdCustomer?.id || createdCustomer?.data?.id || '');
      }

      const payload = {
        ...formState,
        date: formState.date || format(defaultDate, 'dd-MM-yyyy'),
        customerId,
      };
      if (mode === 'create') {
        await createBooking(payload);
      } else if (booking?.id) {
        await saveBooking(booking.id, payload);
      }
      onClose();
    } catch (error) {
      setSubmitError(error.message || 'Unable to save booking.');
    }
  };

  return (
    <Offcanvas show={show} onHide={onClose} placement="end" className="booking-drawer">
      <Offcanvas.Header closeButton className="border-0 pb-0">
        <Offcanvas.Title>{mode === 'create' ? 'Create Booking' : 'Edit Booking'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="drawer-body">
        <Form onSubmit={handleSubmit} className="booking-form-grid booking-form-grid--drawer">
          {submitError ? <Alert variant="danger">{submitError}</Alert> : null}

          <Form.Group>
            <Form.Label>Customer</Form.Label>
            <Form.Select
              value={formState.customerId}
              onChange={(event) => {
                const selected = customerOptions.find((item) => String(item.id) === event.target.value);
                updateField('customerId', event.target.value);
                updateField('customerName', selected?.name || '');
                updateField('customerEmail', selected?.email || '');
                updateField('customerPhone', selected?.phone || '');
                updateField('customerGender', selected?.gender || 'male');
              }}
            >
              <option value="">Select customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="drawer-actions">
            <Button
              variant="outline-secondary"
              onClick={() => setShowCustomerFields((prev) => !prev)}
              type="button"
            >
              {showCustomerFields ? 'Use existing customer' : 'Create new customer'}
            </Button>
          </div>

          {showCustomerFields ? (
            <>
              <Form.Group>
                <Form.Label>Customer name</Form.Label>
                <Form.Control
                  value={formState.customerName}
                  onChange={(event) => updateField('customerName', event.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={formState.customerEmail}
                  onChange={(event) => updateField('customerEmail', event.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={formState.customerPhone}
                  onChange={(event) => updateField('customerPhone', event.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Gender</Form.Label>
                <Form.Select
                  value={formState.customerGender}
                  onChange={(event) => updateField('customerGender', event.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Form.Select>
              </Form.Group>
            </>
          ) : null}

          <Form.Group>
            <Form.Label>Service</Form.Label>
            <Form.Select
              value={formState.serviceId}
              onChange={(event) => {
                const selected = serviceOptions.find((service) => String(service.id) === event.target.value);
                updateField('serviceId', event.target.value);
                updateField('serviceName', selected?.name || selected?.title || '');
                updateField('price', selected?.price || selected?.sale_price || '0.00');
                updateField('duration', String(selected?.duration || formState.duration || 60));
              }}
            >
              <option value="">Select service</option>
              {serviceOptions.map((service) => (
                <option key={service.id} value={String(service.id)}>
                  {(service.name || service.title) && service.duration
                    ? `${service.name || service.title} - ${service.duration} mins`
                    : service.name || service.title}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Therapist</Form.Label>
            <Form.Select
              value={formState.therapist}
              onChange={(event) => updateField('therapist', event.target.value)}
            >
              <option value="">Select therapist</option>
              {therapistOptions.map((therapist) => (
                <option key={therapist.id} value={String(therapist.id)}>
                  {therapist.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Room</Form.Label>
            <Form.Select
              value={formState.roomId}
              onChange={(event) => {
                const selected = roomOptions.find((room) => String(room.items?.[0]?.item_id || room.id || room.room_id) === event.target.value);
                updateField('roomId', event.target.value);
                updateField('room', selected?.name || selected?.title || selected?.room_name || '');
                updateField('roomItemType', selected?.items?.[0]?.item || selected?.items?.[0]?.item_name || '');
              }}
            >
              <option value="">Select room</option>
              {roomOptions.map((room) => (
                <option key={room.items?.[0]?.item_id || room.id || room.room_id} value={String(room.items?.[0]?.item_id || room.id || room.room_id)}>
                  {room.name || room.title || room.room_name || `Room ${room.id || room.room_id}`}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Source</Form.Label>
            <Form.Select
              value={formState.source}
              onChange={(event) => {
                updateField('source', event.target.value);
                updateField('requestType', event.target.value);
              }}
            >
              {REQUEST_TYPE_OPTIONS.map((requestType) => (
                <option key={requestType} value={requestType}>
                  {requestType}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={formState.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Start time</Form.Label>
            <Form.Control
              type="time"
              step="900"
              value={formState.startTime}
              onChange={(event) => updateField('startTime', event.target.value)}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Duration</Form.Label>
            <Form.Select
              value={formState.duration}
              onChange={(event) => updateField('duration', event.target.value)}
            >
              {[30, 45, 60, 75, 90, 120].map((duration) => (
                <option key={duration} value={String(duration)}>
                  {duration} mins
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>End time</Form.Label>
            <Form.Control value={formState.endTime} readOnly />
          </Form.Group>

          <Form.Group>
            <Form.Label>Price</Form.Label>
            <Form.Control
              value={formState.price}
              onChange={(event) => updateField('price', event.target.value)}
            />
          </Form.Group>

          <Form.Group className="booking-form-notes">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={formState.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </Form.Group>

          <Form.Group className="booking-form-notes">
            <Form.Label>Service request</Form.Label>
            <Form.Control
              value={formState.serviceRequest}
              onChange={(event) => updateField('serviceRequest', event.target.value)}
            />
          </Form.Group>
        </Form>

        {supportLoading ? <Alert variant="light">Loading services, rooms, and customers...</Alert> : null}

        {!supportLoading && (!serviceOptions.length || !roomOptions.length || !therapistOptions.length) ? (
          <Alert variant="warning">
            Booking form is waiting for API data. Please refresh the date/time or try again after the lists load.
          </Alert>
        ) : null}

        <div className="drawer-actions">
          <Button variant="outline-secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="dark"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : supportLoading ? 'Loading data...' : mode === 'create' ? 'Create booking' : 'Save changes'}
          </Button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
