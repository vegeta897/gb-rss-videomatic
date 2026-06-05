import { embyApiKey, embyLibraryName, embyHost } from './config.json'

const HOST = `http://${embyHost}/emby/`

async function getLibraryId() {
  const libraryEndpoint = `${HOST}Library/MediaFolders?api_key=${embyApiKey}`
  const response = await fetch(libraryEndpoint)
  const libraryData: any = await response.json()
  const library = libraryData.Items.find(
    (item: any) => (item.Name = embyLibraryName)
  )
  if (!library) throw `Library "${embyLibraryName}" not found`
  return library.Id
}

export async function refreshEmbyLibrary() {
  const libraryId = await getLibraryId()
  const refreshItemEndpoint = `${HOST}Items/${libraryId}/Refresh?api_key=${embyApiKey}`
  const response = await fetch(refreshItemEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      MetadataRefreshMode: 'Default',
      ReplaceAllImages: false,
      ReplaceAllMetadata: false,
      Recursive: true,
    }),
  })
  if (response.status === 204) {
    console.log(`Emby library "${embyLibraryName}" refreshed`)
  } else {
    console.log(`Emby library failed to refresh (code ${response.status})`)
  }
}
