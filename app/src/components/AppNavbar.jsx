import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth.js';

function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    logout();
    window.location.replace('/');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/events?search=${encodeURIComponent(query)}` : '/events');
  };

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <NavLink className="brand" to="/" end aria-label="Tickety home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Tickety</span>
        </NavLink>

        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/events">Explore</NavLink>
          {user?.role === 'customer' && (
            <>
              <NavLink to="/my-bookings">My Bookings</NavLink>
              <NavLink to="/interests">My Interests</NavLink>
            </>
          )}
          {user?.role === 'organizer' && (
            <>
              <NavLink to="/organizer">Dashboard</NavLink>
              <NavLink to="/ticket-types">Ticket Types</NavLink>
              <NavLink to="/organizer/bookings">Bookings</NavLink>
            </>
          )}
          {user?.role === 'owner' && (
            <>
              <NavLink to="/owner/approvals">Approvals</NavLink>
              <NavLink to="/owner/organizers">Organizers</NavLink>
            </>
          )}
        </div>

        <form className="nav-search" onSubmit={handleSearch} role="search">
          <label className="sr-only" htmlFor="nav-event-search">Search Events</label>
          <input
            id="nav-event-search"
            type="search"
            placeholder="Search Events"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" aria-label="Submit Event search">Search</button>
        </form>

        <div className="nav-account">
          {user ? (
            <>
              <span className="nav-user">{user.firstName}</span>
              <button
                className="button button-nav button-primary"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink className="nav-login" to="/login">Login</NavLink>
              <NavLink className="button button-nav button-primary" to="/register">
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default AppNavbar;
