import express from 'express'
import {
  getPlants,
  addPlant,
  getPlantById,
  waterPlant,
  fertilizePlant,
  repotPlant,
  getPosts,
  addPost,
  addComment,
  likePost,
  savePost,
  getProfile,
  getSavedPosts
} from './routes'

const app = express()
const PORT = 3001

app.use(express.json())

app.get('/api/plants', getPlants)
app.post('/api/plants', addPlant)
app.get('/api/plants/:id', getPlantById)
app.post('/api/plants/:id/water', waterPlant)
app.post('/api/plants/:id/fertilize', fertilizePlant)
app.post('/api/plants/:id/repot', repotPlant)

app.get('/api/posts', getPosts)
app.post('/api/posts', addPost)
app.post('/api/posts/:id/comments', addComment)
app.post('/api/posts/:id/like', likePost)
app.post('/api/posts/:id/save', savePost)

app.get('/api/profile', getProfile)
app.get('/api/saved-posts', getSavedPosts)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
