import Blog from '../models/blog.js'
import User from '../models/user.js'

const initialBlogs = [
  {
    title: 'React patterns',
    author: 'Michael Chan',
    url: 'https://reactpatterns.com/',
    likes: 7
  },
  {
    title: 'Go To Statement Considered Harmful',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmfull.html',
    likes: 5
  }
]

// Helper to get an ID that does not exist in the database
const nonExistingId = async () => {
  const blog = new Blog({
    title: 'willremovethissoon',
    author: 'test',
    url: 'http://test.con',
    likes: 0
  })
  await blog.save()
  await blog.deleteOne()

  return blog._id.toString()
}

// Helper to fetch blogs and format them as plain JSON objects
const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

// Helper to fetch all users and format them as plain JSON objects
const usersInDb = async () => {
  const users = await User.find({})
  return users.map(user => user.toJSON())
}

export default { initialBlogs, blogsInDb, nonExistingId, usersInDb }
