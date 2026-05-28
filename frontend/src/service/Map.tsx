import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ArrowLeft, MapPin, Navigation, LocateFixed, Search } from "lucide-react";
import { Link } from "react-router";

/* ---------------- TYPES ---------------- */
interface Hospital {
  id: number | string;
  lat: number;
  lon: number;
  name: string;
  distance: number;
}

interface FlyToHospitalProps {
  hospital: Hospital | null;
}

/* ---------------- CUSTOM MARKERS ---------------- */
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const hospitalIcon = new L.DivIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-lg text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a4 4 0 0 0 0-8Z"/></svg>
         </div>`,
  className: "custom-div-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/* ---------------- HELPER FUNCTIONS ---------------- */
const getDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ---------------- SUB-COMPONENTS ---------------- */
function FlyToHospital({ hospital }: FlyToHospitalProps) {
  const map = useMap();
  useEffect(() => {
    if (hospital) map.flyTo([hospital.lat, hospital.lon], 15, { duration: 1.2 });
  }, [hospital, map]);
  return null;
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function Map() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hoveredHospital, setHoveredHospital] = useState<Hospital | null>(null);
  const [selectedRange, setSelectedRange] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const markerRefs = useRef<Record<string | number, L.Marker>>({});

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition([15.3647, 75.124]) // fallback
    );
  }, []);

  const fetchHospitals = async (): Promise<void> => {
    if (!position) return;
    setLoading(true);
    const [lat, lon] = position;
    const viewbox = `${lon - 0.15},${lat + 0.15},${lon + 0.15},${lat - 0.15}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=50&viewbox=${viewbox}&bounded=1`;

    try {
      const res = await fetch(url, { headers: { "User-Agent": "MediRaksha/1.0" } });
      const data: Array<{
        place_id: number;
        lat: string;
        lon: string;
        display_name: string;
      }> = await res.json();

      const formatted: Hospital[] = data
        .map((place, index) => ({
          id: place.place_id ?? index,
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
          name: place.display_name,
          distance: getDistanceInKm(lat, lon, parseFloat(place.lat), parseFloat(place.lon)),
        }))
        .sort((a, b) => a.distance - b.distance);

      setHospitals(formatted);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredHospitals = hospitals.filter((h) => h.distance <= selectedRange);

  const openDirections = (hospital: Hospital): void => {
    if (!position) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${position[0]},${position[1]}&destination=${hospital.lat},${hospital.lon}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* --- TOP HEADER --- */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LocateFixed className="text-indigo-600" size={24} />
            Hospital Locator
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {([2, 5, 10] as const).map((km) => (
              <button
                key={km}
                onClick={() => setSelectedRange(km)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedRange === km
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {km} KM
              </button>
            ))}
          </div>
          <button
            onClick={fetchHospitals}
            disabled={!position || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Search size={16} />
            )}
            Scan Area
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex flex-1 overflow-hidden">

        {/* --- SIDEBAR LIST --- */}
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col z-40 shadow-xl">
          <div className="p-5 border-b border-slate-50">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Results Found: {filteredHospitals.length}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredHospitals.length === 0 && !loading && (
              <div className="text-center py-10 opacity-50">
                <MapPin className="mx-auto mb-2" size={32} />
                <p className="text-sm">
                  Click "Scan Area" to find <br /> nearby medical facilities.
                </p>
              </div>
            )}

            {filteredHospitals.map((hospital) => (
              <div
                key={hospital.id}
                onMouseEnter={() => {
                  setHoveredHospital(hospital);
                  markerRefs.current[hospital.id]?.openPopup();
                }}
                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                  hoveredHospital?.id === hospital.id
                    ? "bg-indigo-50 border-indigo-200 shadow-md"
                    : "bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm"
                }`}
              >
                <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-indigo-700">
                  {hospital.name.split(",")[0]}
                </h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Navigation size={12} className="text-indigo-500" />
                    {hospital.distance.toFixed(2)} km
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDirections(hospital);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- MAP AREA --- */}
        <main className="flex-1 relative">
          {position ? (
            <MapContainer center={position} zoom={14} className="h-full w-full z-10">
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              <Marker position={position} icon={userIcon}>
                <Popup className="custom-popup">You are here</Popup>
              </Marker>

              {filteredHospitals.map((hospital) => (
                <Marker
                  key={hospital.id}
                  position={[hospital.lat, hospital.lon]}
                  icon={hospitalIcon}
                  ref={(ref) => {
                    if (ref) markerRefs.current[hospital.id] = ref;
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h4 className="font-bold text-slate-800 leading-tight">
                        {hospital.name.split(",")[0]}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {hospital.distance.toFixed(2)} km away
                      </p>
                      <button
                        onClick={() => openDirections(hospital)}
                        className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-100"
                      >
                        Open in Google Maps
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <FlyToHospital hospital={hoveredHospital} />
            </MapContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-100">
              <span className="loading loading-ring loading-lg text-indigo-600" />
            </div>
          )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
        .leaflet-bar { border: none !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important; }
        .leaflet-bar a { border-radius: 8px !important; border-bottom: none !important; margin-bottom: 2px; }
      `}</style>
    </div>
  );
}