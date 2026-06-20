export interface Animal {
  id: string
  name: string
  species: string
  breed: string
  age: number
  description: string
  imageUrl: string
  status: 'available' | 'adopted' | 'pending'
  personality: string[]
  story: string
  health: string
}

export interface AdoptionApplication {
  id: string
  applicantName: string
  phone: string
  address: string
  reason: string
  animalId: string
  animalName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
}

export interface Announcement {
  id: string
  content: string
  createdAt: string
}
