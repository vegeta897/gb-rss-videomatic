import Parser from 'rss-parser'
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
import { getCliOptions } from './cli'

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

async function processFeeds(options: {
  show?: string
  cutoff?: string
  video?: string
  feed?: string
  folder?: string
}) {
  let needRefresh = false
  let totalDownloads = 0
  let totalFailed = 0
  const feedUrls = options.feed ? [options.feed] : config.feedUrls
  for (const feedUrl of feedUrls) {
    console.log(
      `Checking feed ${feedUrls.indexOf(feedUrl) + 1}/${feedUrls.length}`
    )
    const { name, items } = await getFeedData(feedUrl)
    console.log(`Processing feed "${name}"`)
    if (items.length === 0) {
      console.log(`Feed "${name}" returned empty, skipping`)
      continue
    }
    const feedItemsOptions: ProcessFeedItemsOptions = {}
    if (options.folder) feedItemsOptions.folder = options.folder
    if (options.video) {
      feedItemsOptions.video = options.video
    } else if (options.show) {
      feedItemsOptions.show = options.show
    } else {
      if (options.cutoff) {
        const parts = options.cutoff.split('-').map((part) => +part)
        feedItemsOptions.cutoffDate = new TZDate(
          parts[0]!,
          parts[1]! - 1,
          parts[2]!,
          'America/Los_Angeles'
        )
      } else {
        feedItemsOptions.cutoffDate = getNewestItemDate(name)
      }
    }
    const { itemsDownloaded, failedDownloads, newestItemDate } =
      await processFeedItems(items, feedItemsOptions)
    if (options.show && itemsDownloaded + failedDownloads === 0) {
      console.log(`Show "${options.show}" not found in feed "${name}"`)
    }
    if (itemsDownloaded > 0) {
      needRefresh = true
      totalDownloads += itemsDownloaded
    }
    totalFailed += failedDownloads
    if (!options.show && !options.video && newestItemDate) {
      updateNewestItemDate(name, newestItemDate)
    }
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

interface ProcessFeedItemsOptions {
  show?: string
  cutoffDate?: Date | false
  video?: string
  folder?: string
}
async function processFeedItems(
  items: FeedItem[],
  options: ProcessFeedItemsOptions
) {
  let itemsDownloaded = 0
  let failedDownloads = 0
  let newestItemDate: Date | undefined = undefined
  for (const item of items) {
    if (options.video && item.title !== options.video) continue
    const itemDate = new Date(item.isoDate)
    if (options.cutoffDate && itemDate <= options.cutoffDate) break
    if (!newestItemDate && !options.video) newestItemDate = itemDate
    if (options.show && item.creator !== options.show) continue
    if (!options.show && !options.video && !config.shows.includes(item.creator))
      continue
    if (itemAlreadyDownloaded(item.guid)) continue
    if (options.folder) item.creator = options.folder
    const success = await downloadItem(item)
    if (success) itemsDownloaded++
    else failedDownloads++
    if (!options.show && !options.cutoffDate && !options.video) break
  }
  return { itemsDownloaded, failedDownloads, newestItemDate }
}

await initDb()
await processFeeds(getCliOptions())
