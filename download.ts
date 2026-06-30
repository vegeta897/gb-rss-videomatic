import sanitize from 'sanitize-filename'
import { transpose, format } from 'date-fns'
import { tz } from '@date-fns/tz'
import { downloadRoot } from './config.json'
import type { FeedItem } from '.'
import { recordItemDownloaded } from './db'

export async function downloadItem(item: FeedItem) {
  const response = await fetch(item.enclosure.url)
  if (response.status !== 200 || !response.body) {
    console.warn(`Failed to download "${item.title}"`)
    return false
  }
  let contentLength = +(response.headers.get('Content-Length') ?? 0)
  if (contentLength === 0) contentLength = +item.enclosure.length
  const path = getFilepath(item)
  const existingFile = Bun.file(path)
  if (existingFile.size === contentLength) {
    console.log(`File with matching name and size already exists at ${path}`)
  } else {
    let receivedLength = 0
    let percent = 0
    const chunks = []
    console.log(`Downloading "${item.title}" (${item.guid})`)
    for await (const chunk of response.body) {
      chunks.push(chunk)
      receivedLength += chunk.length
      const nextPercent = Math.floor((receivedLength / contentLength) * 100)
      if (nextPercent > percent) {
        percent = nextPercent
        process.stdout.write('\r\x1b[K') // Return to beginning of line and clear to end
        process.stdout.write(`${percent}%`)
      }
    }
    process.stdout.write('\r\x1b[K')
    const blob = new Blob(chunks)
    console.log(`Saving video to ${path}`)
    await Bun.write(path, blob)
  }
  recordItemDownloaded(item.guid)
  return true
}

function getFilepath(item: FeedItem) {
  const pacificDate = transpose(
    new Date(item.isoDate),
    tz('America/Los_Angeles') // Time-zone used by GB
  )
  const dateString = format(pacificDate, 'yyyy-MM-dd')
  const sanitizedTitle = sanitize(item.title.replaceAll('|', '-'))
  return `${downloadRoot}/${item.creator}/${dateString} ${sanitizedTitle}.mp4`
}
