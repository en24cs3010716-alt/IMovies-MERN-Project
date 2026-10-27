# IMovies – Movie Ticket Booking (Beginner MERN Project)

A small college capstone starter project using MongoDB, Express, React and Node.js.

## Features
- View a list of sample movies
- Select a movie and enter name, show date, show time and ticket count
- Save bookings through the Express API to MongoDB
- Clear booking confirmation

## Requirements
- Node.js (LTS)
- MongoDB Community Server running locally OR a MongoDB Atlas connection string

## Run the backend
1. Open a terminal in `backend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGO_URI`.
4. Run `npm run dev`.

Backend runs at http://localhost:5000.

## Run the frontend
1. Open a second terminal in `frontend`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the URL printed by Vite (usually http://localhost:5173).

## Important
This is a learning/demo project. It does not process payments, verify real cinema schedules, or reserve actual seats. Movie data is sample data. Do not put real personal information into a public demo.

## Short project explanation
IMovies is a movie ticket booking website. Users choose a movie, enter booking details and submit the form. React displays the website, Express/Node handles API requests, and MongoDB stores bookings.
