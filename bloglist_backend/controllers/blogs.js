import express from 'express'
import jwt from 'jsonwebtoken'
import Blog from '../models/blog.js'
import User from '../models/user.js'

const blogsRouter = express.Router()

// GET all blogs, populating the 'user' field with only username and name
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({})
    .populate('user', {
      username: 1,
      name: 1
  })
  response.json(blogs)
})

// POST a new blog (Protected by token)
blogsRouter.post('/', async (request, response) => {
  const body = request.body

  // Validate that title and url are present
  if (!body.title || !body.url) {
    return response.status(400).json({
      error: 'title and url are required'
    })
  }

  // 1. Verify the token that was extracted by the middleware
  const decodedToken = jwt.verify(request.token, process.env.SECRET)

  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }

  // 2. Find the user identified by the token
  const user = await User.findById(decodedToken.id)

  // 3. Create the blog and link it to the authenticated user
  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes || 0, // default to 0 if likes is not provided
    user: user._id // Link the blog to the user's ID
  })

  const savedBlog = await blog.save()

  // 4. Update the user's blogs array with the new blog's ID
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)
})

// DELETE a blog (Only the creator can delete)
blogsRouter.delete('/:id', async (request, response) => {
  // 1. Verify the token
  const decodedToken = jwt.verify(request.token, process.env.SECRET)

  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }

  // 2. Find the blog
  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    return response.status(404).end()
  }

  // 3. Check if the authenticated user is the creator
  // blog.user could be an ObjectId or a populate object, so we convert both to strings
  if (blog.user.toString() !== decodedToken.id.toString()) {
    return response.status(401).json({
      error: 'only the creator can delete this blog'
    })
  }

  // 4. Delete the blog
  await Blog.findByIdAndDelete(request.params.id)

  // 5. Remove the blog ID from the user's blogs array
  const user = await User.findById(decodedToken.id)
  user.blogs = user.blogs.filter(b => b.toString() !== blog.id.toString())
  await user.save()

  response.status(204).end()
})

// PUT (update) a blog
blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    blog,
    { new: true, runValidators: true }
  )

  response.json(updatedBlog)
})

export default blogsRouter
