import { parseFeed } from 'feedsmith'

type NonEmptyArray<T> = [T, ...T[]]

export type FeedItem = {
  title: string
  link: string
  guid: { value: string }
  pubDate: string
  dc: {
    creator: string
  }
  media: NonEmptyArray<{
    contents: NonEmptyArray<{
      url: string
      fileSize: number
      height: number
    }>
  }>
}

export async function getFeedData(url: string) {
  const response = await fetch(url)
  const { format, feed } = parseFeed(await response.text())
  if (format !== 'rss') throw `Feed does not appear to be RSS! (${url})`
  if (!feed.title) throw `Feed missing title! (${url})`
  return { name: feed.title, items: feed.items as unknown as FeedItem[] }
}
