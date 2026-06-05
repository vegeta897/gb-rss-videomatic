import config from './config.json'

const dbPath = `${config.downloadRoot}/gb-rss-db.json`

interface Data {
  downloaded: string[]
  feeds: { name: string; newestItemDate: string }[]
}

let file: Bun.BunFile
let data: Data

const emptyDb = {
  downloaded: [],
  feeds: [],
}

export async function initDb() {
  file = Bun.file(dbPath, { type: 'application/json' })
  const fileExists = await file.exists()
  if (!fileExists) {
    console.log('No database found, creating gb-rss-db.json')
    await file.write(JSON.stringify(emptyDb))
    file = Bun.file(dbPath, { type: 'application/json' })
  }
  data = await file.json()
}

export function getNewestItemDate(feedName: string) {
  const feed = data.feeds.find((feed) => feed.name === feedName)
  if (!feed) return false
  return new Date(feed.newestItemDate)
}

export function updateNewestItemDate(feedName: string, date: Date) {
  const feed = data.feeds.find((feed) => feed.name === feedName)
  if (!feed) {
    data.feeds.push({ name: feedName, newestItemDate: date.toISOString() })
  } else {
    feed.newestItemDate = date.toISOString()
  }
}

export function itemAlreadyDownloaded(guid: string) {
  return data.downloaded.includes(guid)
}

export function recordItemDownloaded(guid: string) {
  if (!itemAlreadyDownloaded(guid)) data.downloaded.push(guid)
}

export async function writeDb() {
  file.write(JSON.stringify(data))
}
