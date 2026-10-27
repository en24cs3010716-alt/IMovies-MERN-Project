
import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: { type: String, default: "" },
    poster: { type: String, default: "" },
    genre: { type: String, default: "" },
    duration: { type: String, default: "" },
    rating: { type: String, default: "U/A" },
    icon: { type: String, default: "🎬" },
    color: { type: String, default: "space" },
    releaseYear: { type: Number, default: 0 },
    price: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
