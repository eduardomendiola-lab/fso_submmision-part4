import { test, after, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import mongoose from 'mongoose'
import supertest from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import app from '../app.js'
import Blog from '../models/blog.js'
import User from '../models/user.js'
import helper from './test_helper.js'

const api = supertest(app)

// Declere variable to hold the token and user ID for the tests
let token

// This runs before EVERY test, ensuring a clean database state
beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  // 1. Create a test user
  const passwordHash = await bcrypt.hash('sekret', 10)
  const user = new User({ username: 'testuser', passwordHash })
  const savedUser = await user.save()

  // 2. Generate a valid token for this user
  const userForToken = {
    username: savedUser.username,
    id: savedUser._id,
  }
  token = jwt.sign(userForToken, process.env.SECRET)

  // 3. Link initial blogs to this user so populate and ownership checks work
  const blogsWithUser = helper.initialBlogs.map(blog => ({
    ...blog,
    user: savedUser.id
  }))

  await Blog.insertMany(blogsWithUser)
})

describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('blogs have id property instead of _id', async () => {
    const response = await api.get('/api/blogs')

    // Verify that the 'id' property exists on the first blog
    assert(response.body[0].id !== undefined)

    // Verify that the '_id' property does NOT exist
    assert(response.body[0]._id === undefined)
  })
})

describe('addition of a new blog', () => {
  test('succeeds with valid data and token', async () => {
    const newBlog = {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/',
      likes: 10
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`) // Send the valid token
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()

    // Verify that the total number of blogs increased by one
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

    // Verify that the new blog is in the database
    const titles = blogsAtEnd.map(b => b.title)
    assert(titles.includes('Clean Code'))
  })

  test('fails with status code 401 if token is not provided', async () => {
    const newBlog = {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/',
      likes: 10
    }

    // Intentionally omitting the .set('Authorization', ...) header
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401) // Now it should fail with 401, not 400
  })

  test('likes default to 0 if not provided', async () => {
    const newBlog = {
      title: 'Test Blog',
      author: 'Test Author',
      url: 'http://test.com'
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`) // send token to pass auth, fail validation if needed
      .send(newBlog)
      .expect(201)

    const blogsAtEnd = await helper.blogsInDb()
    const lastBlog = blogsAtEnd[blogsAtEnd.length - 1]

    // Verify that the likes property defaults to 0
    assert.strictEqual(lastBlog.likes, 0)
  })

  test('fails with status code 400 if title is missing', async () => {
    const newBlog = {
      author: 'Test Author',
      url: 'http://test.com',
      likes: 5
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`) // Send token so it reaches validation logic
      .send(newBlog)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })

  test('fails with status code 400 if url is missing', async () => {
    const newBlog = {
      title: 'Test Blog',
      author: 'Test Author',
      likes: 5
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`) // Send token so it reaches va.idation logic
      .send(newBlog)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })
})

describe('deletion of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    // Verify that the blog was deleted
    const ids = blogsAtEnd.map(b => b.id)
    assert(!ids.includes(blogToDelete.id))

    // Verify that the total number of blogs decreased by one
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
  })
})

describe('updating a blog', () => {
  test('succeeds with status code 200 and updates likes', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]

    const updatedBlogData = {
      likes: blogToUpdate.likes + 10
    }

    const resultBlog = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updatedBlogData)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    // Verify that the likes were updated
    assert.strictEqual(resultBlog.body.likes, blogToUpdate.likes + 10)

    // Verify that the update was saved to the database
    const blogsAtEnd = await helper.blogsInDb()
    const updatedBlog = blogsAtEnd.find(b => b.id === blogToUpdate.id)
    assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 10)
  })
})

// This runs ONCE after all tests are finished
after(async () => {
  await mongoose.connection.close()
})
