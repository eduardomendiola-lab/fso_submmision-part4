const dummy = () => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + blog.likes, 0)
  }

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) return null

  const favorite = blogs.reduce((max, blog) => {
    return blog.likes > max.likes
    ? blog
    : max
  })

  return {
    title: favorite.title,
    author: favorite.author,
    likes: favorite.likes
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return null

  // Step 1: Count blogs per author
  const authorCounts = blogs.reduce((counts, blog) => {
    counts[blog.author] = (counts[blog.author] || 0) + 1
    return counts
  }, {})

  // Step 2: Find the author with the most blogs
  const topAuthor = Object.entries(authorCounts).reduce((max, [author, count]) => {
    return count > max.count ? { author, count } : max
  }, { author: '', count: 0 })

  return {
    author: topAuthor.author,
    blogs: topAuthor.count
  }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return null

  // Step 1: Sum likes per author
  const authorLikes = blogs.reduce((likesMap, blog) => {
    likesMap[blog.author] = (likesMap[blog.author] || 0) + blog.likes
    return likesMap
  }, {})

  // Step 2: Find the author with the most likes
  return Object.entries(authorLikes).reduce((max, [author, likes]) => {
    return likes > max.likes ? { author, likes } : max
  }, { author: '', likes: 0 })
}

export default { dummy, totalLikes, favoriteBlog, mostBlogs, mostLikes }
