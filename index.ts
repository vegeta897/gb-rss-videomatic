import Parser from 'rss-parser'
import { parseArgs } from 'util'
import { refreshEmbyLibrary } from './emby'
import config from './config.json'
import {
  getNewestItemDate,
  initDb,
  itemAlreadyDownloaded,
  updateNewestItemDate,
  writeDb,
} from './db'
import { downloadItem } from './download'
import { TZDate } from '@date-fns/tz'

const {
  values: { show, cutoff },
} = parseArgs({
  args: Bun.argv,
  options: {
    show: {
      type: 'string',
      short: 's',
    },
    cutoff: {
      type: 'string',
      short: 'c',
    },
  },
  strict: true,
  allowPositionals: true,
})

export type FeedItem = {
  creator: string
  title: string
  isoDate: string
  enclosure: {
    url: string
    length: string
  }
  guid: string
}

async function processFeeds(show?: string, cutoff?: string) {
  let needRefresh = false
  let totalDownloads = 0
  let totalFailed = 0
  for (const feedUrl of config.feedUrls) {
    console.log(
      `Checking feed ${config.feedUrls.indexOf(feedUrl) + 1}/${config.feedUrls.length}`
    )
    const { name, items } = await getFeedData(feedUrl)
    console.log(`Processing feed "${name}"`)
    if (items.length === 0) {
      console.log(`Feed "${name}" returned empty, skipping`)
      continue
    }
    const options: ProcessFeedOptions = {}
    if (show) {
      options.show = show
    } else {
      if (cutoff) {
        const parts = cutoff.split('-').map((part) => +part)
        options.cutoffDate = new TZDate(
          parts[0]!,
          parts[1]! - 1,
          parts[2]!,
          'America/Los_Angeles'
        )
      } else {
        options.cutoffDate = getNewestItemDate(name)
      }
    }
    const { itemsDownloaded, failedDownloads, newestItemDate } =
      await processFeedItems(items, options)
    if (show && itemsDownloaded + failedDownloads === 0) {
      console.log(`Show "${show}" not found in feed "${name}"`)
    }
    if (itemsDownloaded > 0) {
      needRefresh = true
      totalDownloads += itemsDownloaded
    }
    totalFailed += failedDownloads
    if (!show && newestItemDate) updateNewestItemDate(name, newestItemDate)
  }
  console.log(
    `Finished downloading ${totalDownloads}/${totalDownloads + totalFailed} video(s)`
  )
  if (needRefresh && config.embyLibraryName) refreshEmbyLibrary()
  await writeDb()
}

async function getFeedData(url: string) {
  const parser = new Parser()
  const feed = await parser.parseURL(url)
  if (!feed.title) throw `Feed missing title! (${url})`
  return { name: feed.title, items: feed.items as unknown as FeedItem[] }
}

interface ProcessFeedOptions {
  show?: string
  cutoffDate?: Date | false
}
async function processFeedItems(
  items: FeedItem[],
  options: ProcessFeedOptions
) {
  let itemsDownloaded = 0
  let failedDownloads = 0
  let newestItemDate: Date | undefined = undefined
  for (const item of items) {
    const itemDate = new Date(item.isoDate)
    if (options.cutoffDate && itemDate <= options.cutoffDate) break
    if (!newestItemDate) newestItemDate = itemDate
    if (show && item.creator !== show) continue
    if (!show && !config.shows.includes(item.creator)) continue
    if (itemAlreadyDownloaded(item.guid)) continue
    const success = await downloadItem(item)
    if (success) itemsDownloaded++
    else failedDownloads++
    if (!options.show && !options.cutoffDate) break
  }
  return { itemsDownloaded, failedDownloads, newestItemDate }
}

await initDb()
await processFeeds(show, cutoff)
