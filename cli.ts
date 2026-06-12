import { parseArgs } from 'util'

export function getCliOptions() {
  return parseArgs({
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
      video: {
        type: 'string',
        short: 'v',
      },
      feed: {
        type: 'string',
        short: 'f',
      },
      folder: {
        type: 'string',
      },
    },
    strict: true,
    allowPositionals: true,
  }).values
}
