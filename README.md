# Spa Booking Management System - Documentation

## Architecture Overview
This application is built as a highly performant Single Page Application (SPA) using React 19.
- **Frontend Framework**: Create React App upgraded to React 19 for concurrent mode features.
- **Styling**: Tailwind CSS for atomic, lightweight style generation.
- **Routing**: `react-router-dom` to support protected routes (Login vs Dashboard).
- **Component Layout**: The app uses a modular structure with isolated components (`CalendarBoard`, `BookingPanel`, UI primitives) to ensure separation of concerns.

## State Management Strategy
The application utilizes **Zustand** for state management.
- **Why Zustand?**: It provides a localized, slice-based state model that prevents unnecessary full-app re-renders, unlike native React Context.
- **Store Structure**: 
  - `useAuthStore` manages the JWT token locally (using local storage persistence).
  - `useCalendarStore` manages the therapists, bookings, UI loading states, and search queries.

## Performance Strategy
Rendering up to 2000 bookings and 200 therapists required a strict performance architecture to avoid UI lag.
1. **Horizontal Virtualization**:
   The columns (Therapists) only render if they fall within the current horizontal scroll view (with a 2-column buffer). We calculate visible columns natively `(scrollLeft / COL_WIDTH)`.
2. **Absolute Grid Positioning**:
   Instead of mapping 9,600 empty DOM cells, the layout relies on positioned CSS blocks (`position: absolute`). This collapses the DOM depth immensely.
3. **Optimistic Updates**:
   Operations like Booking move (Drag and drop) or Status change execute instantly on the UI store (`updateBookingLocally`), dropping any perceived lag to 0ms. If the backend API fails, the state gracefully rolls back.
4. **Error Boundaries**:
   A top-level `ErrorBoundary` catches rendering catastrophes and prevents blank white screens.

## Assumptions Made
1. **API Endpoints**: The UI mocks or connects to the provided endpoints but since full data scaffolding might be absent on the test environment, I built it defensively.
2. **Drag & Drop**: Native HTML5 Drag and Drop API was used as it's the lightest approach without bringing in heavier libraries like `dnd-kit` unless nested droppable contexts were critical.
3. **Booking Details**: `booking.items[0]` logic was assumed as a simplification since most spa bookings are heavily tied to their primary service item.

## How to Run Locally
1. `cd booking-app`
2. `npm install`
3. `npm start`
4. Check `localhost:3000`.
