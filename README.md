# GB RSS Videomatic

A basic video download script for Giant Bomb RSS feeds.

## Purpose

For those who prefer to download videos to watch locally or add to their media server, I created this script to run whenever a new video is published. **It does not run automatically**; the intent is that you rely on your RSS reader of choice to be notified when a new video is ready to download. Automatic downloads might be something I consider later.

## Setup

Requires [Bun](https://bun.sh/)

Install dependencies:

```bash
bun install
```

Rename `config-init.json` to `config.json` and configure:

```jsonc
{
  // Videos will be downloaded here, within folders named after the shows
  "downloadRoot": "C:/Giant Bomb",

  // Put at least one feed URL here
  // I haven't tested the show-specific feeds but they should work
  // Don't put two different qualities of the same feed
  "feedUrls": [
    "https://giantbomb.com/video-xml/premium-videos?api_key=example&quality=1080p",
  ],

  // List the shows you want to include
  // Names must be exact case-sensitive matches
  "shows": ["Grubbsnax Premium", "Endurance Run", "Voicemail Dump Truck"],

  // These are optional, but if you're using Emby it will be refreshed when the script finishes
  // Leave them empty if you don't want/need this
  // See: https://dev.emby.media/doc/restapi/API-Key-Authentication.html
  "embyApiKey": "a1b2c3d4e5f6a7b8c9e0a1b2c3",
  // The name of the library in Emby that contains your GB videos
  "embyLibraryName": "Giant Bomb",
  // The hostname of your Emby server (open your dashboard to check)
  "embyHost": "localhost:8096",
}
```

After the first run, a file named `gb-rss-db.json` will be created in your `downloadRoot`. Leave this file alone, as it is used to keep track of what you've already downloaded.

## Usage

### First run

For your first run, I recommend that you pass in a "cutoff" date parameter (formatted `YYYY-MM-DD`). This will tell the script to download any videos on or after the date you specify. Then for future runs, you can use the default "catch-up" mode.

```bash
bun run index.ts --cutoff 2026-06-01
```

### Default "catch-up" mode

The default mode will download any new videos from shows in your config since your last run. If this is your first run, it will only download the latest video.

```bash
bun run index.ts
```

### Show mode

This downloads all videos of a specific show.

- It will skip videos you've already downloaded (provided you used this script)
- The show name must be an exact case-sensitive match.
- I haven't added pagination yet so if it's too old to be in the first page of the feed it won't be downloaded.

```bash
bun run index.ts --show "Grubbsnax Premium"
```

### Other options

- `--feed "<feed-url>"` Use a specific feed URL instead of the one(s) in your config file
- `--folder "<folder-name>"` Download everything to this folder instead of the show's name
