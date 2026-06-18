import { Router, type Request, type Response } from 'express'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const versionsPath = path.resolve(process.cwd(), 'api/data/versions.json')
const bugsPath = path.resolve(process.cwd(), 'api/data/bugs.json')

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, versionId, bugIds, itemIds } = req.body

    const versionsData = await fs.readFile(versionsPath, 'utf-8')
    const versions = JSON.parse(versionsData)
    const version = versions.find((v: any) => v.id === versionId && v.projectId === projectId)
    if (!version) {
      res.status(404).json({ success: false, error: 'Version not found' })
      return
    }

    const bugsData = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(bugsData)

    const selectedBugs = bugs.filter(
      (b: any) => bugIds.includes(b.id) && b.projectId === projectId && b.status === 'closed',
    )

    const selectedItems = (version.items || []).filter((item: any) => itemIds.includes(item.id))

    const addedItems = selectedItems.filter((item: any) => item.category === 'added')
    const otherItems = selectedItems.filter((item: any) => item.category !== 'added')

    let markdown = `# ${version.version} 更新日志\n\n`
    markdown += `> ${version.summary}\n\n`

    if (addedItems.length > 0) {
      markdown += `## 新功能\n\n`
      for (const item of addedItems) {
        markdown += `- ${item.description}\n`
      }
      markdown += '\n'
    }

    if (otherItems.length > 0) {
      markdown += `## 性能优化与改进\n\n`
      for (const item of otherItems) {
        markdown += `- ${item.description}\n`
      }
      markdown += '\n'
    }

    if (selectedBugs.length > 0) {
      markdown += `## 问题修复\n\n`
      for (const bug of selectedBugs) {
        markdown += `- ${bug.title}: ${bug.description}\n`
      }
      markdown += '\n'
    }

    let html = `<h1>${version.version} 更新日志</h1>\n`
    html += `<p><em>${version.summary}</em></p>\n`

    if (addedItems.length > 0) {
      html += `<h2>新功能</h2>\n<ul>\n`
      for (const item of addedItems) {
        html += `<li>${item.description}</li>\n`
      }
      html += `</ul>\n`
    }

    if (otherItems.length > 0) {
      html += `<h2>性能优化与改进</h2>\n<ul>\n`
      for (const item of otherItems) {
        html += `<li>${item.description}</li>\n`
      }
      html += `</ul>\n`
    }

    if (selectedBugs.length > 0) {
      html += `<h2>问题修复</h2>\n<ul>\n`
      for (const bug of selectedBugs) {
        html += `<li><strong>${bug.title}</strong>: ${bug.description}</li>\n`
      }
      html += `</ul>\n`
    }

    res.json({ markdown, html })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate announcement' })
  }
})

export default router
