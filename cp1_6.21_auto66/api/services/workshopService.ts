import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workshopsPath = path.resolve(__dirname, '../data/workshops.json')
const registrationsPath = path.resolve(__dirname, '../data/registrations.json')

interface MaterialKit {
  id: string
  name: string
  price: number
  stock: number
  required: boolean
}

interface Workshop {
  id: string
  name: string
  description: string
  maxParticipants: number
  currentParticipants: number
  fee: number
  datetime: string
  coverImage: string
  materialKits: MaterialKit[]
  createdAt: string
}

interface MaterialKitOrder {
  kitId: string
  quantity: number
}

interface Participant {
  name: string
  contact: string
}

interface Registration {
  id: string
  workshopId: string
  confirmationCode: string
  participantCount: number
  materialKitOrders: MaterialKitOrder[]
  participants: Participant[]
  createdAt: string
}

interface Feedback {
  id: string
  workshopId: string
  registrationId: string
  rating: number
  comment: string
  createdAt: string
}

async function readWorkshops(): Promise<Workshop[]> {
  const data = await fs.readFile(workshopsPath, 'utf-8')
  return JSON.parse(data)
}

async function writeWorkshops(workshops: Workshop[]): Promise<void> {
  await fs.writeFile(workshopsPath, JSON.stringify(workshops, null, 2), 'utf-8')
}

async function readRegistrations(): Promise<Registration[]> {
  const data = await fs.readFile(registrationsPath, 'utf-8')
  return JSON.parse(data)
}

async function writeRegistrations(registrations: Registration[]): Promise<void> {
  await fs.writeFile(registrationsPath, JSON.stringify(registrations, null, 2), 'utf-8')
}

export async function getAllWorkshops(): Promise<Workshop[]> {
  return readWorkshops()
}

export async function getWorkshopById(id: string): Promise<Workshop | undefined> {
  const workshops = await readWorkshops()
  return workshops.find((w) => w.id === id)
}

export async function createWorkshop(data: Omit<Workshop, 'id' | 'currentParticipants' | 'createdAt'>): Promise<Workshop> {
  const workshops = await readWorkshops()
  const newWorkshop: Workshop = {
    ...data,
    id: uuidv4(),
    currentParticipants: 0,
    createdAt: new Date().toISOString(),
  }
  workshops.push(newWorkshop)
  await writeWorkshops(workshops)
  return newWorkshop
}

export async function updateWorkshop(id: string, data: Partial<Workshop>): Promise<Workshop | null> {
  const workshops = await readWorkshops()
  const index = workshops.findIndex((w) => w.id === id)
  if (index === -1) return null
  workshops[index] = { ...workshops[index], ...data, id }
  await writeWorkshops(workshops)
  return workshops[index]
}

export async function registerForWorkshop(
  workshopId: string,
  participantCount: number,
  materialKitOrders: MaterialKitOrder[],
  participants: Participant[]
): Promise<{ success: boolean; confirmationCode?: string; error?: string }> {
  const workshops = await readWorkshops()
  const workshop = workshops.find((w) => w.id === workshopId)
  if (!workshop) return { success: false, error: '工坊不存在' }

  if (workshop.currentParticipants + participantCount > workshop.maxParticipants) {
    return { success: false, error: '名额不足' }
  }

  for (const order of materialKitOrders) {
    const kit = workshop.materialKits.find((k) => k.id === order.kitId)
    if (!kit) return { success: false, error: `材料包 ${order.kitId} 不存在` }
    if (kit.stock < order.quantity) {
      return { success: false, error: `材料包 ${kit.name} 库存不足` }
    }
  }

  for (const order of materialKitOrders) {
    const kit = workshop.materialKits.find((k) => k.id === order.kitId)!
    kit.stock -= order.quantity
  }

  workshop.currentParticipants += participantCount
  await writeWorkshops(workshops)

  const confirmationCode = uuidv4().slice(0, 8).toUpperCase()
  const registrations = await readRegistrations()
  const registration: Registration = {
    id: uuidv4(),
    workshopId,
    confirmationCode,
    participantCount,
    materialKitOrders,
    participants,
    createdAt: new Date().toISOString(),
  }
  registrations.push(registration)
  await writeRegistrations(registrations)

  return { success: true, confirmationCode }
}

export async function getRegistrationByCode(code: string): Promise<(Registration & { workshop: Workshop }) | null> {
  const registrations = await readRegistrations()
  const registration = registrations.find((r) => r.confirmationCode === code)
  if (!registration) return null

  const workshops = await readWorkshops()
  const workshop = workshops.find((w) => w.id === registration.workshopId)
  if (!workshop) return null

  return { ...registration, workshop }
}

export async function getHistoryByContact(contact: string): Promise<(Registration & { workshop: Workshop })[]> {
  const registrations = await readRegistrations()
  const workshops = await readWorkshops()

  const matched = registrations.filter((r) =>
    r.participants.some((p) => p.contact === contact)
  )

  return matched.map((r) => {
    const workshop = workshops.find((w) => w.id === r.workshopId)!
    return { ...r, workshop }
  })
}

export async function sendFeedback(workshopId: string): Promise<{ success: boolean; sentCount: number }> {
  const registrations = await readRegistrations()
  const workshopRegistrations = registrations.filter((r) => r.workshopId === workshopId)
  return { success: true, sentCount: workshopRegistrations.length }
}

export async function submitFeedback(data: { workshopId: string; registrationId: string; rating: number; comment: string }): Promise<Feedback> {
  const feedbackPath = path.resolve(__dirname, '../data/feedbacks.json')
  let feedbacks: Feedback[] = []
  try {
    const raw = await fs.readFile(feedbackPath, 'utf-8')
    feedbacks = JSON.parse(raw)
  } catch {
    feedbacks = []
  }

  const feedback: Feedback = {
    id: uuidv4(),
    workshopId: data.workshopId,
    registrationId: data.registrationId,
    rating: data.rating,
    comment: data.comment,
    createdAt: new Date().toISOString(),
  }

  feedbacks.push(feedback)
  await fs.writeFile(feedbackPath, JSON.stringify(feedbacks, null, 2), 'utf-8')
  return feedback
}
