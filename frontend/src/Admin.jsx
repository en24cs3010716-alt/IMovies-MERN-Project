import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

export default function Admin() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("imovies_admin_token") || ""
  );

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [movieForm, setMovieForm] = useState({
    title: "",
    genre: "",
    duration: "",
    rating: "U/A",
    icon: "🎬",
    color: "space",
    description: "",
    poster: ""
  });

  function logout() {
    sessionStorage.removeItem("imovies_admin_token");
    setToken("");
    setPassword("");
    setBookings([]);
    setError("");
    setNotice("");
  }

  async function adminRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
  }

  async function login(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Admin login failed.");
      }

      if (!data.token) {
        throw new Error("Admin token was not received.");
      }

      sessionStorage.setItem("imovies_admin_token", data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setError(err.message || "Could not connect to backend.");
    }
  }

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const data = await adminRequest("/admin/bookings");
      setBookings(Array.isArray(data) ? data : data.bookings || []);
    } catch (err) {
      setError(err.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMovies() {
    setLoadingMovies(true);
    setError("");

    try {
      const data = await adminRequest("/movies");
      setMovies(Array.isArray(data) ? data : data.movies || []);
    } catch (err) {
      setError(err.message || "Could not load movies.");
    } finally {
      setLoadingMovies(false);
    }
  }

  async function addMovie(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    try {
      const data = await adminRequest("/admin/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movieForm)
      });

      if (data.movie) {
        setMovies(previous => [data.movie, ...previous]);
      } else {
        await loadMovies();
      }

      setMovieForm({
        title: "",
        genre: "",
        duration: "",
        rating: "U/A",
        icon: "🎬",
        color: "space",
        description: "",
        poster: ""
      });

      setNotice(data.message || "Movie added successfully!");
    } catch (err) {
      setError(err.message || "Could not add movie.");
    }
  }

  async function deleteMovie(id) {
    if (!window.confirm("Are you sure you want to delete this movie?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const data = await adminRequest(`/admin/movies/${id}`, {
        method: "DELETE"
      });

      setMovies(previous => previous.filter(movie => movie._id !== id));
      setNotice(data.message || "Movie deleted successfully!");
    } catch (err) {
      setError(err.message || "Could not delete movie.");
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const data = await adminRequest(`/admin/bookings/${id}`, {
        method: "DELETE"
      });

      setBookings(previous =>
        previous.filter(booking => booking._id !== id)
      );

      setNotice(data.message || "Booking cancelled successfully.");
    } catch (err) {
      setError(err.message || "Could not cancel booking.");
    }
  }

  useEffect(() => {
    if (token) {
      loadBookings();
      loadMovies();
    }
  }, [token]);

  const totalTickets = bookings.reduce(
    (total, booking) => total + Number(booking.tickets || 0),
    0
  );

  if (!token) {
    return (
      <main style={styles.page}>
        <form onSubmit={login} style={styles.form}>
          <h1>🎬 iMovies Admin</h1>
          <p>Log in to manage movie bookings.</p>

          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button style={styles.button} type="submit">
            Log In
          </button>

          {error && <p style={styles.error}>{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1>iMovies Admin Dashboard</h1>
          <p>Manage movies and customer bookings.</p>
        </div>

        <button style={styles.button} onClick={logout}>
          Logout
        </button>
      </header>

      {error && <p style={styles.error}>{error}</p>}
      {notice && <p style={styles.success}>{notice}</p>}

      <section style={styles.stats}>
        <article style={styles.statCard}>
          <h3>Total Bookings</h3>
          <strong>{bookings.length}</strong>
        </article>

        <article style={styles.statCard}>
          <h3>Total Tickets</h3>
          <strong>{totalTickets}</strong>
        </article>

        <article style={styles.statCard}>
          <h3>Total Movies</h3>
          <strong>{movies.length}</strong>
        </article>
      </section>

      <section style={styles.card}>
        <h2>Manage Bookings</h2>

        <button
          style={styles.button}
          onClick={loadBookings}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Bookings"}
        </button>

        {loading && <p>Loading bookings...</p>}

        {!loading && !error && bookings.length === 0 && (
          <p>No bookings found.</p>
        )}

        <div style={styles.list}>
          {bookings.map(booking => (
            <article key={booking._id} style={styles.card}>
              <h3>{booking.movieTitle}</h3>
              <p>Customer: {booking.customerName}</p>
              <p>Date: {booking.showDate}</p>
              <p>Time: {booking.showTime}</p>
              <p>Tickets: {booking.tickets}</p>
              <p>Booking ID: {booking._id}</p>

              <button
                style={styles.cancelButton}
                onClick={() => cancelBooking(booking._id)}
              >
                Cancel Booking
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2>Add New Movie</h2>

        <form onSubmit={addMovie}>
          <label style={styles.label}>
            Movie Title
            <input
              style={styles.input}
              value={movieForm.title}
              onChange={e =>
                setMovieForm({ ...movieForm, title: e.target.value })
              }
              placeholder="Enter movie title"
              required
            />
          </label>

          <label style={styles.label}>
            Genre
            <input
              style={styles.input}
              value={movieForm.genre}
              onChange={e =>
                setMovieForm({ ...movieForm, genre: e.target.value })
              }
              placeholder="Adventure, Comedy..."
              required
            />
          </label>

          <label style={styles.label}>
            Duration
            <input
              style={styles.input}
              value={movieForm.duration}
              onChange={e =>
                setMovieForm({ ...movieForm, duration: e.target.value })
              }
              placeholder="2h 10m"
              required
            />
          </label>

          <label style={styles.label}>
            Rating
            <select
              style={styles.input}
              value={movieForm.rating}
              onChange={e =>
                setMovieForm({ ...movieForm, rating: e.target.value })
              }
            >
              <option value="U">U</option>
              <option value="U/A">U/A</option>
              <option value="A">A</option>
            </select>
          </label>

          <label style={styles.label}>
            Poster Icon (emoji)
            <input
              style={styles.input}
              value={movieForm.icon}
              onChange={e =>
                setMovieForm({ ...movieForm, icon: e.target.value })
              }
            />
          </label>

          <label style={styles.label}>
            Description
            <textarea
              style={styles.input}
              value={movieForm.description}
              onChange={e =>
                setMovieForm({ ...movieForm, description: e.target.value })
              }
            />
          </label>

          <label style={styles.label}>
            Poster Image URL (optional)
            <input
              style={styles.input}
              type="url"
              value={movieForm.poster}
              onChange={e =>
                setMovieForm({ ...movieForm, poster: e.target.value })
              }
              placeholder="https://..."
            />
          </label>

          <button style={styles.button} type="submit">
            Add Movie
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Manage Movies</h2>

        <button
          style={styles.button}
          onClick={loadMovies}
          disabled={loadingMovies}
        >
          {loadingMovies ? "Loading..." : "Refresh Movies"}
        </button>

        {movies.length === 0 && !loadingMovies && (
          <p>No movies added yet.</p>
        )}

        <div style={styles.list}>
          {movies.map(movie => (
            <article key={movie._id} style={styles.card}>
              <h3>{movie.icon} {movie.title}</h3>
              <p>{movie.genre}</p>
              <p>{movie.duration}</p>

              <button
                style={styles.cancelButton}
                onClick={() => deleteMovie(movie._id)}
              >
                Delete Movie
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
    background: "#09090b",
    color: "#f5f5f5",
    boxSizing: "border-box"
  },
  form: {
    maxWidth: "420px",
    margin: "60px auto",
    padding: "32px",
    background: "#18181b",
    border: "1px solid #303036",
    borderRadius: "18px",
    boxShadow: "0 15px 50px #0008"
  },
  label: {
    display: "block",
    margin: "18px 0",
    fontWeight: "600",
    color: "#e4e4e7"
  },
  input: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    padding: "13px",
    marginTop: "9px",
    border: "1px solid #3f3f46",
    borderRadius: "9px",
    background: "#09090b",
    color: "#ffffff",
    outlineColor: "#ff3038"
  },
  button: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "9px",
    background: "#ff3038",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "30px",
    paddingBottom: "22px",
    borderBottom: "1px solid #303036"
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
    marginBottom: "28px"
  },
  statCard: {
    minWidth: "0",
    padding: "24px",
    background: "linear-gradient(145deg, #202024, #141416)",
    border: "1px solid #333338",
    borderRadius: "15px",
    borderTop: "3px solid #ff3038"
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
    marginTop: "22px"
  },
  card: {
    padding: "24px",
    marginBottom: "24px",
    background: "#18181b",
    border: "1px solid #303036",
    borderRadius: "15px",
    overflowWrap: "anywhere",
    boxSizing: "border-box"
  },
  cancelButton: {
    padding: "10px 14px",
    border: "1px solid #ff3038",
    borderRadius: "8px",
    background: "#321417",
    color: "#ff858a",
    cursor: "pointer",
    fontWeight: "600"
  },
  error: {
    color: "#ff858a",
    background: "#321417",
    padding: "12px",
    borderRadius: "8px"
  },
  success: {
    color: "#86efac",
    background: "#102719",
    padding: "12px",
    borderRadius: "8px"
  }
};
