
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Movie from "./models/Movie.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

const bookingSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  movieTitle: { type: String, required: true },
  showDate: { type: String, required: true },
  showTime: { type: String, required: true },
  tickets: { type: Number, required: true, min: 1, max: 10 },
  seats: { type: [String], default: [] },
  totalAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "demo-paid"],
    default: "pending"
  }
}, { timestamps: true });

const Booking = mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

const seatReservationSchema = new mongoose.Schema({
  movieTitle: { type: String, required: true },
  showDate: { type: String, required: true },
  showTime: { type: String, required: true },
  seat: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

seatReservationSchema.index(
  { movieTitle: 1, showDate: 1, showTime: 1, seat: 1 },
  { unique: true }
);

const SeatReservation = mongoose.models.SeatReservation ||
  mongoose.model("SeatReservation", seatReservationSchema);

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in first." });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin login required." });
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Admin session expired. Please log in again." });
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ message: "IMovies API is running" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Please fill in all fields." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Registration successful. Please log in.",
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Could not register user." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() });

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Could not log in." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!JWT_SECRET || !adminUsername || !adminPassword) {
      return res.status(500).json({
        message: "Set JWT_SECRET, ADMIN_USERNAME and ADMIN_PASSWORD in backend .env."
      });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "Admin login successful.", token });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    res.status(500).json({ message: "Could not log in as admin." });
  }
});

app.get("/api/movies", async (_req, res) => {
  try {
    res.json(await Movie.find().sort({ createdAt: -1 }));
  } catch (error) {
    console.error("MOVIES ERROR:", error);
    res.status(500).json({ message: "Could not load movies." });
  }
});

app.post("/api/admin/movies", requireAdmin, async (req, res) => {
  try {
    const {
      title, description, poster, genre, duration,
      rating, icon, color, releaseYear, price
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Movie title is required." });
    }

    const movie = await Movie.create({
      title: title.trim(),
      description, poster, genre, duration, rating, icon, color,
      releaseYear: Number(releaseYear) || 0,
      price: Math.max(0, Number(price) || 0)
    });

    res.status(201).json({ message: "Movie added successfully.", movie });
  } catch (error) {
    console.error("ADD MOVIE ERROR:", error);
    res.status(500).json({ message: "Could not add movie." });
  }
});

app.delete("/api/admin/movies/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid movie ID." });
    }

    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found." });

    res.json({ message: "Movie deleted successfully." });
  } catch (error) {
    console.error("DELETE MOVIE ERROR:", error);
    res.status(500).json({ message: "Could not delete movie." });
  }
});

app.post("/api/bookings", authMiddleware, async (req, res) => {
  let booking = null;

  try {
    const { customerName, movieTitle, showDate, showTime, tickets, seats } = req.body;
    const count = Number(tickets);
    const chosenSeats = Array.isArray(seats) ? seats : [];

    if (!customerName?.trim() || !movieTitle || !showDate || !showTime) {
      return res.status(400).json({ message: "Please fill in all booking fields." });
    }

    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return res.status(400).json({ message: "Choose between 1 and 10 tickets." });
    }

    if (chosenSeats.length && (
      chosenSeats.length !== count ||
      new Set(chosenSeats).size !== chosenSeats.length
    )) {
      return res.status(400).json({ message: "Select a different seat for each ticket." });
    }

    const movie = await Movie.findOne({ title: movieTitle });
    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    const price = Math.max(0, Number(movie.price) || 0);
    const totalAmount = price * count;

    booking = await Booking.create({
      userId: req.user.id,
      customerName: customerName.trim(),
      movieTitle,
      showDate,
      showTime,
      tickets: count,
      seats: chosenSeats,
      totalAmount,
      paymentStatus: "pending"
    });

    if (chosenSeats.length) {
      try {
        await SeatReservation.insertMany(chosenSeats.map(seat => ({
          movieTitle,
          showDate,
          showTime,
          seat,
          bookingId: booking._id
        })), { ordered: true });
      } catch (error) {
        await SeatReservation.deleteMany({ bookingId: booking._id });
        await Booking.findByIdAndDelete(booking._id);

        if (error.code === 11000) {
          return res.status(409).json({
            message: "One or more seats are already booked. Please choose other seats."
          });
        }
        throw error;
      }
    }

    res.status(201).json({
      message: "Booking created. Complete demo payment to confirm.",
      booking
    });
  } catch (error) {
    console.error("CREATE BOOKING ERROR:", error);
    res.status(500).json({ message: "Could not create booking." });
  }
});

app.post("/api/bookings/:id/demo-payment", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID." });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    booking.paymentStatus = "demo-paid";
    await booking.save();

    res.json({
      message: "Demo payment successful! Your booking is confirmed.",
      booking
    });
  } catch (error) {
    console.error("DEMO PAYMENT ERROR:", error);
    res.status(500).json({ message: "Demo payment could not be completed." });
  }
});

app.get("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(bookings);
  } catch (error) {
    console.error("MY BOOKINGS ERROR:", error);
    res.status(500).json({ message: "Could not load bookings." });
  }
});

app.delete("/api/bookings/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    await SeatReservation.deleteMany({ bookingId: booking._id });
    res.json({ message: "Booking cancelled successfully." });
  } catch (error) {
    console.error("CANCEL BOOKING ERROR:", error);
    res.status(500).json({ message: "Could not cancel booking." });
  }
});

app.get("/api/admin/bookings", requireAdmin, async (_req, res) => {
  try {
    res.json(await Booking.find().sort({ createdAt: -1 }).limit(100));
  } catch (error) {
    console.error("ADMIN BOOKINGS ERROR:", error);
    res.status(500).json({ message: "Could not load bookings." });
  }
});

app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    await SeatReservation.deleteMany({ bookingId: booking._id });
    res.json({ message: "Booking deleted successfully." });
  } catch (error) {
    console.error("ADMIN DELETE BOOKING ERROR:", error);
    res.status(500).json({ message: "Could not delete booking." });
  }
});

async function startServer() {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from backend .env");
    }

    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/imovies"
    );

    await SeatReservation.init();

    app.listen(PORT, () => {
      console.log("Connected to MongoDB");
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("SERVER START ERROR:", error.message);
    process.exit(1);
  }
}

startServer();
