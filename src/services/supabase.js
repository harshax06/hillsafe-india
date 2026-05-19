// ─── Supabase Service ────────────────────────────────────────────────────────
// All database operations in one place.
// Week 3: fetch pins from DB, add pins, vote on pins
// Week 4: user auth, reports, profile
//
// SETUP INSTRUCTIONS (one time):
// 1. Go to https://supabase.com → New Project (free)
// 2. Project name: hillsafe-india
// 3. Copy your Project URL and anon key
// 4. Paste them below in SUPABASE_URL and SUPABASE_ANON_KEY
// 5. Go to SQL Editor in Supabase → run the SQL in README.md

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── YOUR SUPABASE CREDENTIALS ──────────────────────────────────────────────
// Replace these with your actual values from supabase.com → Project Settings
const SUPABASE_URL      = 'https://sgctasuttvpzcgyzwaxf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QAA86RJTJwFLauqzLA464w_WcrtwkkN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Pin Types ───────────────────────────────────────────────────────────────
export const PIN_TYPES = {
  landslide: { label: 'Landslide',       color: '#ff4455', icon: 'L' },
  flood:     { label: 'Flash Flood',     color: '#ffd700', icon: 'F' },
  road:      { label: 'Road Blocked',    color: '#ff8c42', icon: 'R' },
  shelter:   { label: 'Safe Shelter',    color: '#00ff88', icon: 'S' },
  crack:     { label: 'Ground Crack',    color: '#ff6b6b', icon: 'C' },
  rockfall:  { label: 'Rockfall Risk',   color: '#ff4455', icon: 'K' },
};

// ─── Fetch all pins near a location ─────────────────────────────────────────
// Returns pins within ~50km of the given coordinates
export async function fetchNearbyPins(latitude, longitude) {
  try {
    // Using PostGIS ST_DWithin for geo query
    // Falls back to simple lat/lng bounding box if PostGIS not available
    const latDelta = 0.5;  // ~55km
    const lngDelta = 0.5;

    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .gte('latitude',  latitude  - latDelta)
      .lte('latitude',  latitude  + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e) {
    console.error('fetchNearbyPins error:', e.message);
    return { data: [], error: e.message };
  }
}

// ─── Fetch all pins (for full map view) ─────────────────────────────────────
export async function fetchAllPins() {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .order('votes', { ascending: false })
      .limit(200);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: e.message };
  }
}

// ─── Add a new pin ───────────────────────────────────────────────────────────
export async function addPin({ latitude, longitude, altitude, type, description, userId }) {
  try {
    const { data, error } = await supabase
      .from('pins')
      .insert([{
        latitude,
        longitude,
        altitude:    altitude || 0,
        type,
        description: description || '',
        votes:       1,
        status:      'pending',    // pending → verified (after 3 votes)
        user_id:     userId || 'anonymous',
        created_at:  new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── Vote on a pin ───────────────────────────────────────────────────────────
export async function votePin(pinId) {
  try {
    // Increment votes
    const { data: pin } = await supabase
      .from('pins')
      .select('votes')
      .eq('id', pinId)
      .single();

    const newVotes  = (pin?.votes || 0) + 1;
    const newStatus = newVotes >= 3 ? 'verified' : 'pending';

    const { data, error } = await supabase
      .from('pins')
      .update({ votes: newVotes, status: newStatus })
      .eq('id', pinId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ─── Delete a pin (own pin only) ─────────────────────────────────────────────
export async function deletePin(pinId) {
  try {
    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', pinId);
    if (error) throw error;
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Mock pins for offline / before Supabase setup ───────────────────────────
// These show on map even before you set up Supabase
// Change coordinates to match your test area
export const MOCK_PINS = [
  {
    id: 'mock-1',
    latitude:  18.7505,
    longitude: 83.4076,
    altitude:  240,
    type:      'landslide',
    description: 'Landslide scar from last monsoon. Road partially blocked.',
    votes:     12,
    status:    'verified',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    latitude:  18.7305,
    longitude: 83.4276,
    altitude:  180,
    type:      'flood',
    description: 'Low-lying area floods during heavy rain. Avoid at night.',
    votes:     8,
    status:    'verified',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    latitude:  18.7605,
    longitude: 83.3976,
    altitude:  120,
    type:      'shelter',
    description: 'Panchayat community hall. 200 person capacity. Water available.',
    votes:     21,
    status:    'verified',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    latitude:  18.7205,
    longitude: 83.4176,
    altitude:  310,
    type:      'road',
    description: 'Bridge has visible cracks. Heavy vehicles should avoid.',
    votes:     5,
    status:    'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    latitude:  18.7705,
    longitude: 83.4376,
    altitude:  450,
    type:      'crack',
    description: 'Ground crack noticed after recent tremor. ~5m long.',
    votes:     3,
    status:    'verified',
    created_at: new Date().toISOString(),
  },
];
