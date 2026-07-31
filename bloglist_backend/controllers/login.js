import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import express from 'express'
import User from '../models/user.js'

const loginRouter = express.Router()

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  // Find the user by username
  const user = await User.findOne({ username })

  // Check if user exists and if the password is correct
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  // Create the payload for the token
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  // Sign the token with the server's secret
  const token = jwt.sign(
    userForToken,
    process.env.SECRET,
    { expiresIn: 60 * 60 * 24 * 7 }
  )

  response.status(200).json({
    token,
    username: user.username,
    name: user.name
  })
})

export default loginRouter
