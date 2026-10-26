import { Route, Routes } from 'react-router-dom';
import AppFooter from './components/AppFooter.jsx';
import AppNavbar from './components/AppNavbar.jsx';
import CustomerRoute from './components/CustomerRoute.jsx';
import OrganizerRoute from './components/OrganizerRoute.jsx';
import OwnerRoute from './components/OwnerRoute.jsx';
import BookingConfirmationView from './views/BookingConfirmationView.jsx';
import EventFormView from './views/EventFormView.jsx';
import EventDetailsView from './views/EventDetailsView.jsx';
import EventsView from './views/EventsView.jsx';
import HomeView from './views/HomeView.jsx';
import LoginView from './views/LoginView.jsx';
import MyBookingsView from './views/MyBookingsView.jsx';
import MyInterestsView from './views/MyInterestsView.jsx';
import NotFoundView from './views/NotFoundView.jsx';
import OrganizerBookingsView from './views/OrganizerBookingsView.jsx';
import OrganizerDashboardView from './views/OrganizerDashboardView.jsx';
import OwnerDashboardView from './views/OwnerDashboardView.jsx';
import RegisterView from './views/RegisterView.jsx';
import TicketTypeFormView from './views/TicketTypeFormView.jsx';
import TicketTypesView from './views/TicketTypesView.jsx';

function App() {
  return (
    <>
      <AppNavbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/events" element={<EventsView />} />
          <Route path="/events/:id" element={<EventDetailsView />} />
          <Route
            path="/events/new"
            element={(
              <OrganizerRoute>
                <EventFormView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/events/:id/edit"
            element={(
              <OrganizerRoute>
                <EventFormView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/ticket-types"
            element={(
              <OrganizerRoute>
                <TicketTypesView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/my-bookings"
            element={(
              <CustomerRoute>
                <MyBookingsView />
              </CustomerRoute>
            )}
          />
          <Route
            path="/interests"
            element={(
              <CustomerRoute>
                <MyInterestsView />
              </CustomerRoute>
            )}
          />
          <Route
            path="/bookings/:id/confirmation"
            element={(
              <CustomerRoute>
                <BookingConfirmationView />
              </CustomerRoute>
            )}
          />
          <Route
            path="/organizer"
            element={(
              <OrganizerRoute>
                <OrganizerDashboardView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/organizer/bookings"
            element={(
              <OrganizerRoute>
                <OrganizerBookingsView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/owner"
            element={(
              <OwnerRoute>
                <OwnerDashboardView section="approvals" />
              </OwnerRoute>
            )}
          />
          <Route
            path="/owner/approvals"
            element={(
              <OwnerRoute>
                <OwnerDashboardView section="approvals" />
              </OwnerRoute>
            )}
          />
          <Route
            path="/owner/organizers"
            element={(
              <OwnerRoute>
                <OwnerDashboardView section="organizers" />
              </OwnerRoute>
            )}
          />
          <Route
            path="/ticket-types/new"
            element={(
              <OrganizerRoute>
                <TicketTypeFormView />
              </OrganizerRoute>
            )}
          />
          <Route
            path="/ticket-types/:id/edit"
            element={(
              <OrganizerRoute>
                <TicketTypeFormView />
              </OrganizerRoute>
            )}
          />
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>
      <AppFooter />
    </>
  );
}

export default App;
