
import React, { useEffect, useState } from "react";
import Admin from "./Admin";
import Login from "./Login";
import Register from "./Register";
import "./style.css";

const API = "http://localhost:5000/api";
const TIMES = ["10:00 AM", "1:30 PM", "5:00 PM", "8:30 PM"];
const SEATS = Array.from({ length: 40 }, (_, i) => {
  const row = String.fromCharCode(65 + Math.floor(i / 8));
  return `${row}${(i % 8) + 1}`;
});

function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("imoviesUser") || "null");
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(readSavedUser);
  const [authMode, setAuthMode] = useState("login");
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showDate, setShowDate] = useState("");
  const [showTime, setShowTime] = useState(TIMES[0]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const token = localStorage.getItem("imoviesToken");
  const today = new Date().toLocaleDateString("en-CA");

  const selectedMovie = movies.find(
    movie => movie.title === selected
  );

  const ticketCount = selectedSeats.length;
  const price = Math.max(0, Number(selectedMovie?.price) || 0);
  const totalAmount = price * ticketCount;

  const filteredMovies = movies.filter(movie => {
    const text = `${movie.title} ${movie.genre || ""} ${
      movie.description || ""
    }`.toLowerCase();
    return text.includes(search.toLowerCase().trim());
  });

  useEffect(() => {
    if (window.location.pathname === "/admin") return;

    async function loadMovies() {
      try {
        setLoadingMovies(true);
        const response = await fetch(`${API}/movies`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Could not load movies.");
        setMovies(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Could not connect to the server.");
      } finally {
        setLoadingMovies(false);
      }
    }

    loadMovies();
  }, []);

  useEffect(() => {
    if (!user || !token || window.location.pathname === "/admin") return;

    async function loadBookings() {
      try {
        setLoadingBookings(true);
        const response = await fetch(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setBookings(Array.isArray(data) ? data : []);
        } else {
          setError(data.message || "Could not load bookings.");
        }
      } catch {
        setError("Could not load your bookings. Check the backend.");
      } finally {
        setLoadingBookings(false);
      }
    }

    loadBookings();
  }, [user, token]);

  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  function handleLogin(data) {
    const savedToken = data?.token;
    const savedUser = data?.user;

    if (savedToken) {
      localStorage.setItem("imoviesToken", savedToken);
    }
    if (savedUser) {
      localStorage.setItem("imoviesUser", JSON.stringify(savedUser));
      setUser(savedUser);
      setCustomerName(savedUser.name || "");
    }
    setError("");
    setMessage("Welcome back!");
  }

  function logout() {
    localStorage.removeItem("imoviesToken");
    localStorage.removeItem("imoviesUser");
    setUser(null);
    setBookings([]);
    setSelected(null);
    setSelectedSeats([]);
    setPendingBooking(null);
    setConfirmation(null);
    setMessage("You have been logged out.");
    setError("");
    setAuthMode("login");
  }

  function chooseMovie(movie) {
    setSelected(movie.title);
    setSelectedSeats([]);
    setPendingBooking(null);
    setConfirmation(null);
    setMessage("");
    setError("");

    document.getElementById("booking")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function toggleSeat(seat) {
    setError("");
    setMessage("");
    setSelectedSeats(current => {
      if (current.includes(seat)) {
        return current.filter(item => item !== seat);
      }
      if (current.length >= 10) {
        setError("You can select up to 10 seats per booking.");
        return current;
      }
      return [...current, seat];
    });
  }

  async function createBooking(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user || !token) {
      setError("Please log in before booking.");
      return;
    }
    if (!selectedMovie) {
      setError("Please select a movie first.");
      return;
    }
    if (!customerName.trim() || !showDate || !showTime) {
      setError("Please complete all booking details.");
      return;
    }
    if (showDate < today) {
      setError("Please select today or a future date.");
      return;
    }
    if (selectedSeats.length < 1) {
      setError("Please select at least one seat.");
      return;
    }

    try {
      setBusy(true);
      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          movieTitle: selectedMovie.title,
          showDate,
          showTime,
          tickets: selectedSeats.length,
          seats: selectedSeats
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Booking could not be created.");
      }

      setPendingBooking(data.booking);
      setMessage("Seats selected! Review the amount and complete demo payment.");
    } catch (err) {
      setError(err.message || "Could not create booking.");
    } finally {
      setBusy(false);
    }
  }

  async function payDemo() {
    if (!pendingBooking?._id) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/bookings/${pendingBooking._id}/demo-payment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Demo payment failed.");
      }

      setConfirmation(data.booking);
      setPendingBooking(null);
      setBookings(current => [
        data.booking,
        ...current.filter(item => item._id !== data.booking._id)
      ]);
      setSelectedSeats([]);
      setMessage("Payment successful! Your booking is confirmed.");
    } catch (err) {
      setError(err.message || "Demo payment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not cancel booking.");
      }

      setBookings(current => current.filter(item => item._id !== id));
      if (confirmation?._id === id) setConfirmation(null);
      setMessage("Booking cancelled successfully. Your seats have been released.");
    } catch (err) {
      setError(err.message || "Could not cancel booking.");
    }
  }

  function startNewBooking() {
    setConfirmation(null);
    setPendingBooking(null);
    setSelected(null);
    setSelectedSeats([]);
    setMessage("");
    setError("");
    document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" });
  }

  if (!user) {
    return (
      <main className="auth-section">
        <div className="auth-decoration">
          <div className="auth-logo">iMovies<span>.</span></div>
          <p className="auth-eyebrow">YOUR CINEMA EXPERIENCE</p>
          <h1>Every story deserves the big screen.</h1>
          <p>Discover movies, choose your seats and plan your next movie experience.</p>
        </div>

        <div className="auth-form">
          {authMode === "login" ? (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setAuthMode("register")}
              onRegister={() => setAuthMode("register")}
            />
          ) : (
            <Register
              onRegister={() => {
                setAuthMode("login");
                setMessage("Registration complete. Please log in.");
              }}
              onSwitchToLogin={() => setAuthMode("login")}
              onLogin={() => setAuthMode("login")}
            />
          )}

          {message && <p role="status" className="success-message">{message}</p>}
          {error && <p role="alert" className="error-message">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="logo" href="#home">iMovies<span>.</span></a>

        <nav className="nav-links">
          <a href="#movies">Movies</a>
          <a href="#my-bookings">My Bookings</a>
          <a href="#booking">Book Tickets</a>
        </nav>

        <div className="header-user">
          <span>Hi, {user.name || "Movie Lover"}</span>
          <button className="nav-button" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main id="home">
        <section className="hero-section">
          <div>
            <p className="auth-eyebrow">WELCOME TO IMOVIES</p>
            <h1>Your next movie night starts here.</h1>
            <p>Find a movie, pick your seats and enjoy the show.</p>
            <a className="primary-button" href="#movies">Explore Movies</a>
          </div>
          <div className="hero-art" aria-hidden="true">🎬</div>
        </section>

        {message && <div className="success-message" role="status">{message}</div>}
        {error && <div className="error-message" role="alert">{error}</div>}

        <section id="movies" className="section">
          <div className="section-heading">
            <div>
              <p className="auth-eyebrow">NOW SHOWING</p>
              <h2>Explore Movies</h2>
            </div>

            <input
              className="movie-search"
              type="search"
              placeholder="Search movies or genres..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              aria-label="Search movies"
            />
          </div>

          {loadingMovies ? (
            <p>Loading movies...</p>
          ) : filteredMovies.length === 0 ? (
            <p>{search ? "No movies match your search." : "No movies have been added yet."}</p>
          ) : (
            <div className="movie-grid">
              {filteredMovies.map(movie => (
                <article className="movie-card" key={movie._id}>
                  <div
                    className={`movie-poster ${movie.color || ""}`}
                    style={movie.poster ? {
                      backgroundImage: `linear-gradient(to top, rgba(0,0,0,.85), transparent), url("${movie.poster}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    } : undefined}
                  >
                    {!movie.poster && <span>{movie.icon || "🎬"}</span>}
                    <span className="movie-rating">{movie.rating || "U/A"}</span>
                  </div>

                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p>{movie.genre || "Movie"} {movie.duration ? `• ${movie.duration}` : ""}</p>
                    {movie.releaseYear > 0 && <p>{movie.releaseYear}</p>}
                    {movie.description && <p>{movie.description}</p>}
                    <p className="movie-price">
                      {Number(movie.price) > 0
                        ? `₹${Number(movie.price)} per seat`
                        : "Price not set"}
                    </p>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => chooseMovie(movie)}
                    >
                      Select Movie
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="booking" className="section booking-section">
          <p className="auth-eyebrow">RESERVE YOUR SEATS</p>
          <h2>Book Your Tickets</h2>

          <form className="booking-form" onSubmit={createBooking}>
            <label>
              Selected movie
              <select
                value={selected || ""}
                onChange={event => {
                  setSelected(event.target.value);
                  setSelectedSeats([]);
                  setPendingBooking(null);
                  setConfirmation(null);
                }}
                required
              >
                <option value="">Choose a movie</option>
                {movies.map(movie => (
                  <option key={movie._id} value={movie.title}>{movie.title}</option>
                ))}
              </select>
            </label>

            <label>
              Your name
              <input
                value={customerName}
                onChange={event => setCustomerName(event.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>

            <label>
              Show date
              <input
                type="date"
                min={today}
                value={showDate}
                onChange={event => {
                  setShowDate(event.target.value);
                  setSelectedSeats([]);
                  setPendingBooking(null);
                }}
                required
              />
            </label>

            <label>
              Show time
              <select
                value={showTime}
                onChange={event => {
                  setShowTime(event.target.value);
                  setSelectedSeats([]);
                  setPendingBooking(null);
                }}
              >
                {TIMES.map(time => <option key={time}>{time}</option>)}
              </select>
            </label>

            {selectedMovie && (
              <div className="seat-selection">
                <h3>Select your seats</h3>
                <p>Screen this way ↑</p>
                <div className="screen-line">SCREEN</div>

                <div className="seat-grid">
                  {SEATS.map(seat => {
                    const chosen = selectedSeats.includes(seat);
                    return (
                      <button
                        key={seat}
                        type="button"
                        className={`seat ${chosen ? "selected" : ""}`}
                        aria-pressed={chosen}
                        onClick={() => toggleSeat(seat)}
                        disabled={Boolean(pendingBooking)}
                      >
                        {seat}
                      </button>
                    );
                  })}
                </div>

                <div className="seat-legend">
                  <span><i className="seat-example" /> Available</span>
                  <span><i className="seat-example selected-example" /> Selected</span>
                </div>

                <p>Selected seats: {selectedSeats.join(", ") || "None"}</p>
                <p>Tickets: {ticketCount}</p>
                <h3>Total: ₹{totalAmount}</h3>
                <p className="small-note">
                  Seat availability is checked by the server when you submit your booking.
                </p>
              </div>
            )}

            {!pendingBooking && (
              <button
                className="primary-button"
                type="submit"
                disabled={busy || !selectedMovie || selectedSeats.length === 0}
              >
                {busy ? "Please wait..." : "Continue to Demo Payment"}
              </button>
            )}
          </form>

          {pendingBooking && (
            <div className="confirmation-card">
              <h3>Review Your Booking</h3>
              <p>Movie: {pendingBooking.movieTitle}</p>
              <p>Date: {pendingBooking.showDate}</p>
              <p>Show: {pendingBooking.showTime}</p>
              <p>Seats: {pendingBooking.seats?.join(", ") || "Not specified"}</p>
              <p>Total: ₹{pendingBooking.totalAmount}</p>
              <p className="small-note">
                This is a demo payment only. No real money will be charged.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={payDemo}
                disabled={busy}
              >
                {busy ? "Processing..." : "Pay ₹" + pendingBooking.totalAmount + " (Demo)"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => cancelBooking(pendingBooking._id)}
              >
                Cancel Booking
              </button>
            </div>
          )}

          {confirmation && (
            <div className="confirmation-card confirmed">
              <h3>🎉 Booking Confirmed!</h3>
              <p>Movie: {confirmation.movieTitle}</p>
              <p>Booking ID: {confirmation._id}</p>
              <p>Show: {confirmation.showDate} • {confirmation.showTime}</p>
              <p>Seats: {confirmation.seats?.join(", ") || "N/A"}</p>
              <p>Total paid (demo): ₹{confirmation.totalAmount}</p>
              <p>Status: {confirmation.paymentStatus}</p>
              <button className="primary-button" onClick={startNewBooking} type="button">
                Book Another Movie
              </button>
            </div>
          )}
        </section>

        <section id="my-bookings" className="section">
          <p className="auth-eyebrow">YOUR TICKETS</p>
          <h2>My Bookings</h2>

          {loadingBookings ? (
            <p>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p>You have no bookings yet.</p>
          ) : (
            <div className="booking-list">
              {bookings.map(booking => (
                <article className="booking-card" key={booking._id}>
                  <h3>{booking.movieTitle}</h3>
                  <p>Name: {booking.customerName}</p>
                  <p>Show: {booking.showDate} • {booking.showTime}</p>
                  <p>Tickets: {booking.tickets}</p>
                  <p>Seats: {booking.seats?.join(", ") || "Not specified"}</p>
                  <p>Total: ₹{booking.totalAmount}</p>
                  <p>Status: {booking.paymentStatus || "pending"}</p>
                  <p className="small-note">Booking ID: {booking._id}</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => cancelBooking(booking._id)}
                  >
                    Cancel Booking
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} iMovies. Enjoy your show.</p>
        <p>Demo payment only — no real payment processing.</p>
      </footer>
    </div>
  );
}
