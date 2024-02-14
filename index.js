require("dotenv").config()
const express = require("express")
const app = express()
const cors = require("cors")
const mongoose = require("mongoose")
// mongoose.set('debug', true)

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
})

const User = mongoose.model("User", userSchema)

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date
  }
})

const Exercise = mongoose.model("Exercise", exerciseSchema)

app.use(cors())
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))
app.set("view engine", "ejs")
app.set("views", __dirname + "/views")

app.get("/", async (req, res) => {
  const users = await User.find().lean()
  const exercises = await Exercise.find().lean()

  res.render("index", { users, exercises })
  // res.sendFile(__dirname + "/views/index.html")
})

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body || {}

    // create a user
    const user = await User.create({
      username
    })

    res.json({ _id: user._id, username: user.username })
  } catch (err) {
    console.log(err)
    res.status(500).send("An error occurred while creating a user.")
  }
})

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().lean()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).send("An error occurred while fetching users.")
  }
})

function formatDate(date) {
  // Append 'T00:00:00Z' to the input date string to ensure it's treated as UTC
  // const date = new Date(`${inputDateString}T00:00:00Z`);

  // Format the date using Intl.DateTimeFormat
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' };
  return new Intl.DateTimeFormat('en-US', options).format(date).replaceAll(',', '');
}

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body

  date = date ? new Date(`${date}T00:00:00Z`) : new Date()

  const { _id } = req.params

  const user = await User.findById(_id)

  const exercise = await Exercise.create({
    username: user.username,
    description,
    duration,
    date
  })

  // if no exercise, return error
  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: formatDate(exercise.date),
    _id: user._id,
  })
})

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params
  let { from, to, limit } = req.query
  const user = await User.findById(_id)

  if (!user) {
    return res.status(400).json({ error: "User not found" })
  }

  const dateOpts = {}

  if (from) {
    dateOpts["$gte"] = new Date(from)
  }

  if (to) {
    dateOpts["$lte"] = new Date(to)
  }

  const query = {
    username: user.username
  }

  if (Object.keys(dateOpts).length) {
    query.date = dateOpts
  }

  const exercises = await Exercise.find(query).limit(Number(limit)).exec()

  res.json({
    username: user.username,
    count: exercises.length,
    _id,
    log: exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: formatDate(exercise.date)
    }))
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port)
})
