import { useCallback, useEffect } from 'react'
import { MapContainer as LeafletMap, TileLayer, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import MarkersLayer from './MarkersLayer'
import RouteLayer from './RouteLayer'
import type { Landmark } from '../data/DataManager'

interface Props {
  landmarks: Landmark[]
  filteredIds: string[]
  onMapClick: (lat: number, lng: number) => void
  onMarkerClick: (id: string) => void
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function ZoomControl() {
  const map = useMap()
  useEffect(() => {
    const zoom = L.control.zoom({ position: 'bottomleft' })
    zoom.addTo(map)
    return () => {
      zoom.remove()
    }
  }, [map])
  return null
}

function MapContainer({ landmarks, filteredIds, onMapClick, onMarkerClick }: Props) {
  const handleMapClick = useCallback((lat: number, lng: number) => {
    onMapClick(lat, lng)
  }, [onMapClick])

  return (
    <div className="map-wrapper">
      <LeafletMap
        center={[30, 105]}
        zoom={3}
        minZoom={2}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        worldCopyJump={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RouteLayer landmarks={landmarks} filteredIds={filteredIds} />
        <MarkersLayer
          landmarks={landmarks}
          filteredIds={filteredIds}
          onMarkerClick={onMarkerClick}
        />
        <MapClickHandler onClick={handleMapClick} />
        <ZoomControl />
      </LeafletMap>
    </div>
  )
}

export default MapContainer
