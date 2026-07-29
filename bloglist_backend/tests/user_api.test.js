import { test, after, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import mongoose from 'mongoose'
import supertest from 'supertest'
import bcrypt from 'bcrypt'
import app from '../app.js'
import User from '../models/user.js'
import helper from './test_helper.js'

const api = supertest(app)

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })
    await user.save()
  })

  describe('viewing all users', () => {
    test('users are returned as json', async () => {
      await api
        .get('/api/users')
        .expect(200)
        .expect('Content-Type', /application\/json/)
    })

    test('all users are retuned', async () => {
      const response = await api.get('/api/users')
      assert.strictEqual(response.body.length, 1) // Only the 'root' user from beforeEach
    })
  })

  describe('creation of a new user', () => {
    test('succeeds with a fresh valid username', async () => {
      const usersAtStart = await helper.usersInDb()

      console.log('DEBUG usersAtStart:', usersAtStart)

      const newUser = {
        username: 'mluukkai',
        name: 'Matti Luukkainen',
        password: 'salainen',
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

      const usernames = usersAtEnd.map(u => u.username)
      assert(usernames.includes(newUser.username))
    })

    test('fails with proper status code and message if username is missing', async () => {
      const newUser = {
        name: 'Superuser',
        password: 'salainen'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('username must be at least 3 characters long'))
    })

    test('fails with proper status code and message if password is missing', async () => {
      const newUser = {
        username: 'validuser',
        name: 'Superuser'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('password must be at least 3 characters long'))
    })

    test('fails with proper status code and message if username is too short', async () => {
      const newUser = {
        username: 'ab',
        name: 'Superuser',
        password: 'salainen'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('username must be at least 3 characters long'))
    })

    test('fails with proper status code and message if password is too short', async () => {
      const newUser = {
        username: 'validuser',
        name: 'Superuser',
        password: 'ab'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('password must be at least 3 characters long'))
    })

    test('fails with proper status code and message if username already taken', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'root', // This username already exists from beforeEach
        name: 'Superuser',
        password: 'salainen'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('expected `username` to be unique'))

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
