export type AnimalStatus = 'available' | 'adopted'

export interface Animal {
  id: string
  name: string
  species: 'dog' | 'cat' | 'rabbit' | 'other'
  breed: string
  age: number
  description: string
  imageUrl: string
  status: AnimalStatus
  tags: string[]
  story: string
  health: string
}

export type AdoptionStatus = 'pending' | 'approved' | 'rejected'

export interface AdoptionApplication {
  id: string
  animalId: string
  animalName: string
  applicantName: string
  phone: string
  address: string
  reason: string
  status: AdoptionStatus
  createdAt: string
  reviewedAt?: string
}

export interface Announcement {
  id: string
  content: string
  createdAt: string
}

export interface AdoptFormData {
  applicantName: string
  phone: string
  address: string
  reason: string
}
