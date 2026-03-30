import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  bookingsApi,
  roomsApi,
  servicesApi,
  therapistsApi,
  usersApi,
} from '../api/endpoints';
import { getApiErrorMessage } from '../utils/apiError';
import { logger } from '../utils/logger';

const CalendarContext = createContext();
const CACHE_STORAGE_KEY = 'calendar-cache-v1';

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || '{}');
  } catch (error) {
    logger.warn('Failed to read calendar cache', error);
    return {};
  }
}

function writeCache(nextCache) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(nextCache));
  } catch (error) {
    logger.warn('Failed to write calendar cache', error);
  }
}

function getCacheKey(dateStr, outletId) {
  return `${outletId}:${dateStr}`;
}

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth-storage') || '{}');
  } catch {
    return {};
  }
}

function getUserId() {
  const auth = getStoredAuth();
  return auth?.user?.id || auth?.state?.user?.id || '';
}

function getServiceAt(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  return `${dateStr} ${timeStr}`;
}

function getServiceAtWithSeconds(dateStr, timeStr = '09:00') {
  if (!dateStr) return '';
  const normalizedTime = String(timeStr).length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr} ${normalizedTime}`;
}

function normalizeTherapist(item) {
  if (!item) return item;
  const displayName =
    [item.name, item.lastname].filter(Boolean).join(' ').trim() ||
    item.alias ||
    item.code ||
    `Therapist ${item.id}`;

  return {
    ...item,
    id: item.id || item.therapist_id,
    therapist_id: item.therapist_id || item.id,
    name: displayName,
  };
}

function extractTherapists(response) {
  const staffs =
    response?.data?.data?.list?.staffs ||
    response?.data?.list?.staffs ||
    response?.data?.data ||
    response?.data ||
    [];

  return Array.isArray(staffs) ? staffs.map(normalizeTherapist) : [];
}

function extractBookings(response) {
  const list =
    response?.data?.data?.data ||
    response?.data?.data ||
    response?.data ||
    [];

  return Array.isArray(list) ? list : [];
}

function extractServices(response) {
  const categories =
    response?.data?.data?.list?.category ||
    response?.data?.data?.category ||
    response?.data?.data?.data ||
    response?.data?.data?.list ||
    response?.data?.data ||
    response?.data ||
    [];

  if (!Array.isArray(categories)) return [];

  return categories.flatMap((category) => {
    const services = Array.isArray(category?.services) ? category.services : [];
    return services.map((service) => ({
      ...service,
      category_id: category.id,
      category_name: category.name,
      title: service.name,
    }));
  });
}

function extractRooms(response) {
  const list =
    response?.data?.data?.list ||
    response?.data?.data?.rooms ||
    response?.data?.data ||
    response?.data?.rooms ||
    response?.data ||
    [];

  return Array.isArray(list) ? list : [];
}

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

function extractSingleCustomer(response) {
  return response?.data?.data || response?.data || response?.user || response;
}

function buildLocalBooking(bookingId, payload, therapists) {
  const therapistId = Number(payload.therapist) || Number(payload.designatedTherapist) || null;
  const therapist = therapists.find((item) => item.id === therapistId);

  return {
    id: bookingId,
    status: payload.status || 'Confirmed',
    customer: {
      id: payload.customerId || payload.customer || null,
      name: payload.customerName,
    },
    notes: payload.notes || '',
    room_label: payload.room || '',
    room_id: payload.roomId || null,
    request_type: payload.requestType || '',
    designated_therapist: therapistId,
    items: [
      {
        id: typeof bookingId === 'number' ? bookingId * 100 : `item-${bookingId}`,
        start_time: payload.startTime,
        end_time: payload.endTime,
        duration: Number(payload.duration || 60),
        therapist: therapistId,
        room_segments: payload.roomId
          ? [
              {
                room_id: Number(payload.roomId),
                start_time: payload.startTime,
                end_time: payload.endTime,
                duration: Number(payload.duration || 60),
                priority: 1,
              },
            ]
          : [],
        service: {
          id: payload.serviceId || null,
          name: payload.serviceName,
        },
      },
    ],
  };
}

export const CalendarProvider = ({ children }) => {
  const [therapists, setTherapists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uiMessage, setUiMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(null);
  const [currentOutletId, setCurrentOutletId] = useState(1);
  const [services, setServices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({});
  const [supportLoading, setSupportLoading] = useState(false);

  // Ref to always access latest bookings in callbacks without adding to dependency arrays
  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;
  const therapistsRef = useRef(therapists);
  therapistsRef.current = therapists;
  const bookingDetailsRef = useRef(bookingDetails);
  bookingDetailsRef.current = bookingDetails;

  const persistCurrentCache = useCallback((dateStr, outletId, nextTherapists, nextBookings) => {
    const cache = readCache();
    cache[getCacheKey(dateStr, outletId)] = {
      therapists: nextTherapists,
      bookings: nextBookings,
      updatedAt: new Date().toISOString(),
    };
    writeCache(cache);
  }, []);

  const fetchData = useCallback(async (dateStr, outletId = 1) => {
    setCurrentDate(dateStr);
    setCurrentOutletId(outletId);
    setLoading(true);
    setError(null);
    const cacheKey = getCacheKey(dateStr, outletId);
    const cached = readCache()[cacheKey];

    if (cached) {
      setTherapists(cached.therapists || []);
      setBookings(cached.bookings || []);
    }

    try {
      const [therapistsRes, bookingsRes] = await Promise.all([
        therapistsApi.getList({
          availability: 1,
          outlet: outletId,
          service_at: getServiceAtWithSeconds(dateStr, '09:00'),
          services: 1,
          status: 1,
          pagination: 0,
          panel: 'outlet',
          outlet_type: 2,
          leave: 0,
        }),
        bookingsApi.getList({
          pagination: 1, outlet: outletId, panel: 'outlet', view_type: 'calendar',
          daterange: `${dateStr} / ${dateStr}`
        })
      ]);

      const nextTherapists = extractTherapists(therapistsRes);
      const nextBookings = extractBookings(bookingsRes);

      setTherapists(nextTherapists);
      setBookings(nextBookings);
      persistCurrentCache(dateStr, outletId, nextTherapists, nextBookings);
      logger.info('Fetched calendar data', {
        dateStr,
        outletId,
        therapists: nextTherapists.length,
        bookings: nextBookings.length,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch calendar data'));
      logger.error('Calendar fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [persistCurrentCache]);

  const fetchSupportData = useCallback(async ({
    dateStr,
    startTime = '09:00',
    duration = 60,
    outletId = currentOutletId,
  }) => {
    setSupportLoading(true);
    try {
      const serviceAt = `${dateStr} ${startTime}`;
      const [servicesRes, roomsRes, usersRes] = await Promise.all([
        servicesApi.getList({
          outlet_type: 2,
          outlet: outletId,
          pagination: 0,
          panel: 'outlet',
          service_at: serviceAt,
        }),
        roomsApi.getList(outletId, {
          date: dateStr,
          panel: 'outlet',
          duration: Number(duration),
          service_at: serviceAt,
        }),
        usersApi.getList({
          pagination: 1,
          daterange: `${dateStr} / ${dateStr}`,
        }),
      ]);

      setServices(extractServices(servicesRes));
      setRooms(extractRooms(roomsRes));
      setCustomers(extractCustomers(usersRes));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load booking support data'));
      logger.error('Failed to load support data', err);
    } finally {
      setSupportLoading(false);
    }
  }, [currentOutletId]);

  const fetchBookingDetails = useCallback(async (bookingId) => {
    if (!bookingId) return null;
    if (bookingDetailsRef.current[bookingId]) return bookingDetailsRef.current[bookingId];

    try {
      const response = await bookingsApi.getById(bookingId);
      const details = response?.data || response;
      setBookingDetails((prev) => ({ ...prev, [bookingId]: details }));
      return details;
    } catch (err) {
      logger.error('Failed to fetch booking details', err);
      setError(getApiErrorMessage(err, 'Failed to fetch booking details'));
      return null;
    }
  }, []);

  const createCustomer = useCallback(async (payload) => {
    setSaving(true);
    try {
      const response = await usersApi.create(payload);
      const nextCustomer = extractSingleCustomer(response);
      setCustomers((prev) => [nextCustomer, ...prev]);
      setUiMessage({ type: 'success', text: 'Customer created successfully.' });
      return nextCustomer;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create customer'));
      logger.error('Failed to create customer', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateBookingLocally = useCallback((id, updates) => {
    setBookings((prev) =>
      prev.map((booking) => {
        if (booking.id !== id) return booking;

        const nextBooking = { ...booking, ...updates };
        if (updates.itemUpdates) {
          nextBooking.items = booking.items?.map((item, index) =>
            index === 0 ? { ...item, ...updates.itemUpdates } : item
          );
        }

        delete nextBooking.itemUpdates;
        return nextBooking;
      })
    );
  }, []);

  const moveBooking = useCallback(async (bookingId, newTherapistId, newStartTime) => {
    const currentBookings = bookingsRef.current;
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const original = structuredClone(booking);
    const optimisticTherapist = Number(newTherapistId);

    updateBookingLocally(bookingId, {
      designated_therapist: optimisticTherapist,
      service_time: newStartTime,
      itemUpdates: {
        therapist: optimisticTherapist,
        start_time: newStartTime,
      },
    });
    logger.action('Booking rescheduled', { bookingId, newTherapistId, newStartTime });

    try {
      await bookingsApi.update(bookingId, {
        company: 1,
        outlet: 1,
        items: JSON.stringify([{
           id: booking.items?.[0]?.id,
           start_time: newStartTime,
           therapist: newTherapistId,
        }])
      });
      setUiMessage({ type: 'success', text: 'Booking rescheduled successfully.' });
    } catch (err) {
      updateBookingLocally(bookingId, original);
      setError(getApiErrorMessage(err, 'Failed to move booking'));
      logger.error('Failed to move booking', err);
    }
  }, [updateBookingLocally]);

  const createBooking = useCallback(async (payload) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticBooking = buildLocalBooking(tempId, payload, therapistsRef.current);

    setSaving(true);
    setError(null);
    setBookings((prev) => [...prev, optimisticBooking]);
    logger.action('Booking created', payload);

    try {
      const serviceAt = getServiceAt(payload.date || currentDate, payload.startTime);
      const response = await bookingsApi.create({
        company: 1,
        outlet: currentOutletId,
        outlet_type: 2,
        booking_type: 1,
        customer: payload.customerId,
        created_by: getUserId(),
        currency: payload.currency || 'SGD',
        source: payload.source || payload.requestType || 'Walk-in',
        payment_type: payload.paymentType || 'payatstore',
        service_at: serviceAt,
        note: payload.notes,
        membership: payload.membership || 0,
        panel: 'outlet',
        type: 'manual',
        items: [
          {
            service: Number(payload.serviceId),
            start_time: payload.startTime,
            end_time: payload.endTime,
            duration: Number(payload.duration),
            therapist: Number(payload.therapist),
            requested_person: 0,
            price: payload.price || '0.00',
            quantity: '1',
            service_request: payload.serviceRequest || '',
            customer_name: payload.customerName,
            primary: 1,
            item_number: 1,
            room_segments: payload.roomId
              ? [
                  {
                    room_id: Number(payload.roomId),
                    item_type: payload.room || 'Room',
                    meta_service: null,
                    start_time: payload.startTime,
                    end_time: payload.endTime,
                    duration: Number(payload.duration),
                    priority: 1,
                  },
                ]
              : [],
          },
        ],
      });

      const createdBooking = response?.data || response?.booking || optimisticBooking;
      setBookings((prev) =>
        prev.map((booking) => (booking.id === tempId ? { ...optimisticBooking, ...createdBooking } : booking))
      );
      setUiMessage({ type: 'success', text: 'Booking created successfully.' });
    } catch (err) {
      setBookings((prev) => prev.filter((booking) => booking.id !== tempId));
      setError(getApiErrorMessage(err, 'Failed to create booking'));
      logger.error('Failed to create booking', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentOutletId]);

  const saveBooking = useCallback(async (bookingId, payload) => {
    const currentBookings = bookingsRef.current;
    const existingBooking = currentBookings.find((booking) => booking.id === bookingId);
    if (!existingBooking) return;

    const previous = structuredClone(existingBooking);
    const optimisticTherapist = Number(payload.therapist);

    setSaving(true);
    setError(null);
    updateBookingLocally(bookingId, {
      status: payload.status,
      notes: payload.notes,
      room_label: payload.room,
      request_type: payload.requestType,
      designated_therapist: optimisticTherapist,
      customer: { ...(existingBooking.customer || {}), name: payload.customerName },
      itemUpdates: {
        start_time: payload.startTime,
        duration: Number(payload.duration),
        therapist: optimisticTherapist,
        service: {
          ...(existingBooking.items?.[0]?.service || {}),
          name: payload.serviceName,
        },
      },
    });
    logger.action('Booking edited', { bookingId, payload });

    try {
      const serviceAt = getServiceAt(payload.date || currentDate, payload.startTime);
      await bookingsApi.update(bookingId, {
        company: 1,
        outlet: currentOutletId,
        currency: payload.currency || 'SGD',
        source: payload.source || payload.requestType || 'Walk-in',
        service_at: serviceAt,
        customer: payload.customerId || existingBooking.customer?.id,
        panel: 'outlet',
        updated_by: getUserId(),
        booking_type: 1,
        membership: payload.membership || 0,
        note: payload.notes,
        items: [
          {
            id: existingBooking.items?.[0]?.id,
            service: Number(payload.serviceId || existingBooking.items?.[0]?.service?.id),
            customer_name: payload.customerName,
            start_time: payload.startTime,
            end_time: payload.endTime,
            duration: Number(payload.duration),
            therapist: optimisticTherapist,
            requested_person: 0,
            requested_room: payload.roomId ? 1 : 0,
            price: payload.price || existingBooking.items?.[0]?.price || '0.00',
            quantity: '1',
            service_request: payload.serviceRequest || '',
            primary: 1,
            item_number: 1,
            room_segments: payload.roomId
              ? [
                  {
                    room_id: Number(payload.roomId),
                    item_type: payload.room || 'Room',
                    meta_service: null,
                    start_time: payload.startTime,
                    end_time: payload.endTime,
                    duration: Number(payload.duration),
                    priority: 1,
                  },
                ]
              : [],
          },
        ],
      });
      if (payload.status && payload.status !== existingBooking.status) {
        await bookingsApi.updateStatus(bookingId, payload.status);
      }
      setUiMessage({ type: 'success', text: 'Booking updated successfully.' });
    } catch (err) {
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? previous : booking)));
      setError(getApiErrorMessage(err, 'Failed to update booking'));
      logger.error('Failed to update booking', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentOutletId, updateBookingLocally]);

  const cancelBooking = useCallback(async (bookingId) => {
    const currentBookings = bookingsRef.current;
    const booking = currentBookings.find((item) => item.id === bookingId);
    if (!booking) return;

    const previous = structuredClone(booking);
    setSaving(true);
    updateBookingLocally(bookingId, { status: 'Cancelled' });
    logger.action('Booking cancelled', { bookingId });

    try {
      await bookingsApi.cancel(bookingId);
      setUiMessage({ type: 'success', text: 'Booking cancelled.' });
    } catch (err) {
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? previous : item)));
      setError(getApiErrorMessage(err, 'Failed to cancel booking'));
      logger.error('Failed to cancel booking', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [updateBookingLocally]);

  const deleteBooking = useCallback(async (bookingId) => {
    const previous = bookingsRef.current;
    setSaving(true);
    setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
    logger.action('Booking deleted', { bookingId });

    try {
      await bookingsApi.delete(bookingId);
      setUiMessage({ type: 'success', text: 'Booking deleted.' });
    } catch (err) {
      setBookings(previous);
      setError(getApiErrorMessage(err, 'Failed to delete booking'));
      logger.error('Failed to delete booking', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearUiMessage = useCallback(() => setUiMessage(null), []);

  useEffect(() => {
    if (!currentDate) return;
    persistCurrentCache(currentDate, currentOutletId, therapists, bookings);
  }, [bookings, currentDate, currentOutletId, persistCurrentCache, therapists]);

  const value = {
    therapists,
    bookings,
    services,
    rooms,
    customers,
    bookingDetails,
    loading,
    saving,
    supportLoading,
    error,
    uiMessage,
    searchQuery,
    setSearchQuery,
    fetchData,
    updateBookingLocally,
    moveBooking,
    createBooking,
    saveBooking,
    cancelBooking,
    deleteBooking,
    createCustomer,
    fetchSupportData,
    fetchBookingDetails,
    clearError,
    clearUiMessage,
    currentDate,
    currentOutletId,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
